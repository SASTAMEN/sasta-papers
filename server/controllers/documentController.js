const Document = require('../models/Document');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    const filetypes = /pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
  }
}).single('document');

// Mock plagiarism check function (replace with actual plagiarism checking service)
const checkPlagiarism = async (filePath) => {
  // Implement actual plagiarism checking logic here
  return Math.floor(Math.random() * 30); // Returns a random score between 0-30 for demo
};

exports.uploadDocument = async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a file'
        });
      }

      // Check plagiarism
      const plagiarismScore = await checkPlagiarism(req.file.path);

      const document = await Document.create({
        title: req.body.title,
        author: req.user.id,
        type: req.body.type,
        abstract: req.body.abstract,
        keywords: req.body.keywords.split(',').map(keyword => keyword.trim()),
        course: req.body.course,
        department: req.body.department,
        institution: req.body.institution,
        fileUrl: req.file.path,
        plagiarismScore
      });

      res.status(201).json({
        success: true,
        document,
        plagiarismScore
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
};

exports.getDocuments = async (req, res) => {
  try {
    const query = {};
    
    // Apply filters if provided
    if (req.query.type) query.type = req.query.type;
    if (req.query.department) query.department = req.query.department;
    if (req.query.institution) query.institution = req.query.institution;

    const documents = await Document.find(query)
      .populate('author', 'fullName email institution')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('author', 'fullName email institution')
      .populate('reviewComments.user', 'fullName email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addReviewComment = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    document.reviewComments.push({
      user: req.user.id,
      comment: req.body.comment
    });

    await document.save();

    res.status(200).json({
      success: true,
      document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}; 