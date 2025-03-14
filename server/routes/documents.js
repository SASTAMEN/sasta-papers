const express = require('express');
const {
  createDocument,
  getDocuments,
  getDocument,
  addComment,
  addQuestion,
  answerQuestion,
  rateDocument,
  getUserDocuments,
  downloadDocument,
  deleteDocument,
  getDocumentStatus,
  analyzeDocument
} = require('../controllers/documents');

const router = express.Router();

const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.route('/')
  .get(getDocuments)
  .post(protect, upload.single('document'), createDocument);

router.route('/:id')
  .get(getDocument)
  .delete(protect, deleteDocument);

// Protected routes
router.route('/analyze')
  .post(protect, upload.single('document'), analyzeDocument);

router.route('/:id/status')
  .get(protect, getDocumentStatus);

router.route('/:id/comments')
  .post(protect, addComment);

router.route('/:id/questions')
  .post(protect, addQuestion);

router.route('/:id/questions/:questionId')
  .put(protect, answerQuestion);

router.route('/:id/ratings')
  .post(protect, rateDocument);

router.route('/user/:userId')
  .get(protect, getUserDocuments);

router.route('/:id/download')
  .get(protect, downloadDocument);

module.exports = router; 