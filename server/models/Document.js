const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const questionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    default: ''
  },
  isAnswered: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['research_paper', 'course_project', 'review_paper', 'application_document'],
    required: true
  },
  abstract: {
    type: String,
    required: [true, 'Please provide an abstract']
  },
  keywords: {
    type: [String],
    required: [true, 'Please provide keywords']
  },
  file: {
    data: {
      type: Buffer,
      required: [true, 'Please upload a document']
    },
    contentType: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    }
  },
  course: {
    type: String,
    required: function() {
      return this.type === 'course_project';
    }
  },
  department: {
    type: String,
    required: true
  },
  institution: {
    type: String,
    required: true
  },
  documentSet: {
    name: String,
    order: Number,
    totalParts: Number
  },
  plagiarismScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  plagiarismDetails: [{
    matchedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    matchPercentage: Number,
    matchedSections: [{
      text: String,
      similarity: Number
    }]
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  comments: [commentSchema],
  questions: [questionSchema],
  ratings: [ratingSchema],
  averageRating: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Simple text search index
documentSchema.index({
  title: 'text',
  abstract: 'text',
  keywords: 'text'
});

// Calculate average rating when ratings are modified
documentSchema.pre('save', function(next) {
  if (this.ratings && this.ratings.length > 0) {
    this.averageRating = this.ratings.reduce((acc, curr) => acc + curr.score, 0) / this.ratings.length;
  }
  next();
});

// Update author's ranking when a new document is created
documentSchema.post('save', async function() {
  const User = mongoose.model('User');
  const author = await User.findById(this.author);
  if (author) {
    author.ranking.papersPublished += 1;
    await author.updateRanking();
  }
});

module.exports = mongoose.model('Document', documentSchema); 