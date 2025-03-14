const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const stringSimilarity = require('string-similarity');
const Document = require('../models/Document');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// Function to extract text from PDF
const extractTextFromPDF = async (buffer) => {
  const data = await pdf(buffer);
  return data.text;
};

// Function to extract text from DOCX
const extractTextFromDOCX = async (buffer) => {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};

// Function to check plagiarism
const checkPlagiarism = async (text, documentId) => {
  // Get all other documents
  const documents = await Document.find({ 
    _id: { $ne: documentId },
    status: 'approved'
  });

  let maxSimilarity = 0;
  let plagiarismDetails = [];

  // Compare with each document
  for (const doc of documents) {
    let comparisonText;
    try {
      if (doc.file.contentType === 'application/pdf') {
        comparisonText = await extractTextFromPDF(doc.file.data);
      } else {
        comparisonText = await extractTextFromDOCX(doc.file.data);
      }

      // Calculate similarity using string-similarity
      const similarity = stringSimilarity.compareTwoStrings(text, comparisonText);
      const similarityPercentage = similarity * 100;

      if (similarityPercentage > 10) { // Only record if similarity is above 10%
        plagiarismDetails.push({
          matchedDocument: doc._id,
          matchPercentage: similarityPercentage,
          matchedSections: [{
            text: comparisonText.substring(0, 200) + '...', // Store a preview of matched text
            similarity: similarityPercentage
          }]
        });

        if (similarityPercentage > maxSimilarity) {
          maxSimilarity = similarityPercentage;
        }
      }
    } catch (error) {
      console.error(`Error comparing with document ${doc._id}:`, error);
    }
  }

  return {
    score: maxSimilarity,
    details: plagiarismDetails
  };
};

// Function to calculate relevance score
const calculateRelevanceScore = (doc, searchTerms) => {
  if (!searchTerms) return 0;
  
  const terms = searchTerms.toLowerCase().split(' ');
  let score = 0;
  
  // Check title (weight: 10)
  terms.forEach(term => {
    if (doc.title.toLowerCase().includes(term)) score += 10;
  });
  
  // Check keywords (weight: 5)
  terms.forEach(term => {
    if (doc.keywords.some(keyword => keyword.toLowerCase().includes(term))) score += 5;
  });
  
  // Check abstract (weight: 3)
  terms.forEach(term => {
    if (doc.abstract.toLowerCase().includes(term)) score += 3;
  });
  
  return score;
};

// @desc    Create document
// @route   POST /api/v1/documents
// @access  Private
exports.createDocument = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a document', 400));
  }

  const fileData = {
    data: req.file.buffer,
    contentType: req.file.mimetype,
    originalName: req.file.originalname
  };

  const documentData = {
    ...req.body,
    author: req.user.id,
    file: fileData
  };

  // Handle document set
  if (req.body.documentSet) {
    const existingDocs = await Document.countDocuments({
      'documentSet.name': req.body.documentSet.name
    });
    documentData.documentSet = {
      name: req.body.documentSet.name,
      order: existingDocs + 1,
      totalParts: req.body.documentSet.totalParts || existingDocs + 1
    };
  }

  // Create document first
  const document = await Document.create(documentData);

  // Extract text and check plagiarism
  try {
    let text;
    if (req.file.mimetype === 'application/pdf') {
      text = await extractTextFromPDF(req.file.buffer);
    } else {
      text = await extractTextFromDOCX(req.file.buffer);
    }

    const { score, details } = await checkPlagiarism(text, document._id);
    
    // Update document with plagiarism results
    document.plagiarismScore = score;
    document.plagiarismDetails = details;
    document.status = score > 30 ? 'rejected' : 'approved';
    await document.save();

  } catch (error) {
    console.error('Plagiarism check error:', error);
    // Don't fail the upload if plagiarism check fails
    document.status = 'pending';
    await document.save();
  }

  res.status(201).json({
    success: true,
    data: document
  });
});

// @desc    Get all documents with filters
// @route   GET /api/v1/documents
// @access  Public
exports.getDocuments = asyncHandler(async (req, res, next) => {
  let query = {};
  
  // Text search with relevance scoring
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }
  
  // Filter by type
  if (req.query.type) {
    query.type = req.query.type;
  }
  
  // Filter by department
  if (req.query.department) {
    query.department = req.query.department;
  }
  
  // Filter by institution
  if (req.query.institution) {
    query.institution = req.query.institution;
  }

  // Filter by author role
  if (req.query.authorRole) {
    const authors = await User.find({ role: req.query.authorRole });
    query.author = { $in: authors.map(author => author._id) };
  }
  
  // Filter by author name
  if (req.query.author) {
    const authors = await User.find({
      fullName: { $regex: req.query.author, $options: 'i' }
    });
    query.author = { $in: authors.map(author => author._id) };
  }

  // Get documents
  let documents = await Document.find(query)
    .populate('author', 'fullName institution department role')
    .sort('-createdAt');

  // Calculate relevance scores if search query exists
  if (req.query.search) {
    documents = documents.map(doc => {
      const docObj = doc.toObject();
      docObj.relevanceScore = calculateRelevanceScore(docObj, req.query.search);
      return docObj;
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  res.status(200).json({
    success: true,
    count: documents.length,
    data: documents
  });
});

// @desc    Get single document
// @route   GET /api/v1/documents/:id
// @access  Public
exports.getDocument = asyncHandler(async (req, res, next) => {
  const document = await Document.findById(req.params.id)
    .populate('author', 'fullName institution department role')
    .populate('comments.user', 'fullName')
    .populate('questions.user', 'fullName')
    .populate('ratings.user', 'fullName');

  if (!document) {
    return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
  }

  // Increment views
  document.views += 1;
  await document.save();

  res.status(200).json({
    success: true,
    data: document
  });
});

// @desc    Add comment to document
// @route   POST /api/v1/documents/:id/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
  }

  const comment = {
    user: req.user.id,
    content: req.body.content
  };

  document.comments.push(comment);
  await document.save();

  res.status(200).json({
    success: true,
    data: document
  });
});

// @desc    Add question to document
// @route   POST /api/v1/documents/:id/questions
// @access  Private
exports.addQuestion = asyncHandler(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
  }

  const question = {
    user: req.user.id,
    question: req.body.question
  };

  document.questions.push(question);
  await document.save();

  res.status(200).json({
    success: true,
    data: document
  });
});

// @desc    Answer question
// @route   PUT /api/v1/documents/:id/questions/:questionId
// @access  Private
exports.answerQuestion = asyncHandler(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
  }

  // Check if user is the document author
  if (document.author.toString() !== req.user.id) {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to answer questions for this document`, 401));
  }

  const question = document.questions.id(req.params.questionId);
  if (!question) {
    return next(new ErrorResponse(`Question not found with id of ${req.params.questionId}`, 404));
  }

  question.answer = req.body.answer;
  question.isAnswered = true;
  await document.save();

  res.status(200).json({
    success: true,
    data: document
  });
});

// @desc    Rate document
// @route   POST /api/v1/documents/:id/ratings
// @access  Private
exports.rateDocument = asyncHandler(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
  }

  // Check if user has already rated
  const existingRating = document.ratings.find(
    rating => rating.user.toString() === req.user.id
  );

  if (existingRating) {
    return next(new ErrorResponse(`User has already rated this document`, 400));
  }

  const rating = {
    user: req.user.id,
    score: req.body.score
  };

  document.ratings.push(rating);
  await document.save();

  res.status(200).json({
    success: true,
    data: document
  });
});

// @desc    Get user's documents
// @route   GET /api/v1/documents/user/:userId
// @access  Private
exports.getUserDocuments = asyncHandler(async (req, res, next) => {
  const documents = await Document.find({ author: req.params.userId })
    .populate('author', 'fullName institution department role')
    .populate('comments.user', 'fullName')
    .populate('questions.user', 'fullName')
    .populate('ratings.user', 'fullName')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: documents.length,
    data: documents
  });
});

// @desc    Download document
// @route   GET /api/v1/documents/:id/download
// @access  Private
exports.downloadDocument = asyncHandler(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
  }

  // Increment downloads
  document.downloads += 1;
  await document.save();

  res.set({
    'Content-Type': document.file.contentType,
    'Content-Disposition': `attachment; filename="${document.file.originalName}"`
  });
  
  res.send(document.file.data);
});

// @desc    Delete document
// @route   DELETE /api/v1/documents/:id
// @access  Private
exports.deleteDocument = asyncHandler(async (req, res, next) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
  }

  // Make sure user is document owner
  if (document.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this document`, 401));
  }

  // Update author's ranking
  const author = await User.findById(document.author);
  if (author) {
    author.ranking.papersPublished = Math.max(0, author.ranking.papersPublished - 1);
    await author.updateRanking();
  }

  // Delete the document
  await document.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get document status
// @route   GET /api/v1/documents/:id/status
// @access  Private
exports.getDocumentStatus = asyncHandler(async (req, res, next) => {
  const document = await Document.findById(req.params.id)
    .select('status plagiarismScore plagiarismDetails')
    .populate('plagiarismDetails.matchedDocument', 'title author');

  if (!document) {
    return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {
      status: document.status,
      plagiarismScore: document.plagiarismScore,
      plagiarismDetails: document.plagiarismDetails
    }
  });
});

// @desc    Analyze document before upload
// @route   POST /api/documents/analyze
// @access  Private
exports.analyzeDocument = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a document', 400));
  }

  try {
    let text;
    if (req.file.mimetype === 'application/pdf') {
      text = await extractTextFromPDF(req.file.buffer);
    } else {
      text = await extractTextFromDOCX(req.file.buffer);
    }

    // Extract keywords using TF-IDF
    const keywords = await extractKeywords(text);

    // Generate abstract
    const abstract = await extractAbstract(text);

    // Generate summary
    const summary = await generateSummary(text);

    res.status(200).json({
      success: true,
      data: {
        keywords,
        abstract,
        summary
      }
    });
  } catch (error) {
    console.error('Document analysis error:', error);
    return next(new ErrorResponse('Error analyzing document', 500));
  }
});

// Helper function to extract keywords using TF-IDF
const extractKeywords = async (text) => {
  // Split text into words and remove common words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));

  // Calculate word frequencies
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Sort by frequency and return top 10 keywords
  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
};

// Helper function to extract abstract
const extractAbstract = async (text) => {
  // Split text into paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  // Look for a paragraph that might be an abstract
  const potentialAbstract = paragraphs.find(p => 
    p.toLowerCase().includes('abstract') || 
    (p.length > 100 && p.length < 2000 && !p.toLowerCase().includes('introduction'))
  );

  return potentialAbstract || paragraphs[0];
};

// Helper function to generate summary
const generateSummary = async (text) => {
  // Split text into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Score sentences based on position and keyword frequency
  const scoredSentences = sentences.map((sentence, index) => ({
    text: sentence.trim(),
    score: calculateSentenceScore(sentence, index, sentences.length)
  }));

  // Sort by score and take top sentences
  const summary = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.text)
    .join(' ');

  return summary;
};

// Helper function to calculate sentence importance score
const calculateSentenceScore = (sentence, index, totalSentences) => {
  let score = 0;
  
  // Position score - sentences at the start and end are usually more important
  if (index < totalSentences * 0.2 || index > totalSentences * 0.8) {
    score += 0.3;
  }

  // Length score - very short or very long sentences are less likely to be good summary sentences
  const wordCount = sentence.split(/\s+/).length;
  if (wordCount > 10 && wordCount < 30) {
    score += 0.3;
  }

  // Keyword score
  const keywords = ['conclusion', 'result', 'therefore', 'thus', 'show', 'demonstrate', 'find', 'observe'];
  keywords.forEach(keyword => {
    if (sentence.toLowerCase().includes(keyword)) {
      score += 0.1;
    }
  });

  return score;
};

// Common words to filter out from keywords
const commonWords = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
]; 