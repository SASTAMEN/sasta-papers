const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [/^[a-zA-Z0-9._-]+@([a-zA-Z0-9-]+\.(edu|ac\.[a-zA-Z]{2,})|[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,})$/, 'Please provide a valid institutional email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  fullName: {
    type: String,
    required: [true, 'Please provide your full name']
  },
  role: {
    type: String,
    enum: ['student', 'professor'],
    required: [true, 'Please specify your role']
  },
  institution: {
    type: String,
    required: [true, 'Please provide your institution']
  },
  department: {
    type: String,
    required: [true, 'Please provide your department']
  },
  rollNumber: {
    type: String,
    required: [true, 'Please provide your roll number/employee ID']
  },
  ranking: {
    score: {
      type: Number,
      default: 0
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner'
    },
    papersPublished: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's documents
userSchema.virtual('documents', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'author',
  justOne: false
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update user ranking based on papers published
userSchema.methods.updateRanking = async function() {
  const papersCount = this.ranking.papersPublished;
  
  // Update level based on papers published
  if (papersCount >= 20) {
    this.ranking.level = 'Expert';
    this.ranking.score = papersCount * 50;
  } else if (papersCount >= 10) {
    this.ranking.level = 'Advanced';
    this.ranking.score = papersCount * 40;
  } else if (papersCount >= 5) {
    this.ranking.level = 'Intermediate';
    this.ranking.score = papersCount * 30;
  } else {
    this.ranking.level = 'Beginner';
    this.ranking.score = papersCount * 20;
  }

  await this.save();
};

module.exports = mongoose.model('User', userSchema);
