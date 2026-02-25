const express = require('express');
const router = express.Router();
const classFeedbackController = require('../controllers/classFeedback.controller');

/**
 * @route   POST /api/class-feedback
 * @desc    Submit class feedback (unprotected)
 * @access  Public
 */
router.post('/', classFeedbackController.submitFeedback);

/**
 * @route   GET /api/class-feedback/batch/:batchId
 * @desc    Get all feedback for a specific batch (unprotected)
 * @access  Public
 */
router.get('/batch/:batchId', classFeedbackController.getBatchFeedback);

module.exports = router;
