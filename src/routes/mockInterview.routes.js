const express = require('express');
const router = express.Router();
const mockInterviewController = require('../controllers/mockInterview.controller');
const auth = require('../middlewares/auth.middleware');

// POST: Schedule a mock interview for a batch student
router.post('/schedule', auth, mockInterviewController.scheduleMockInterview);

// GET: Get all mock interviews for a specific batch
router.get('/batch/:batchId', auth, mockInterviewController.getBatchMockInterviews);

// GET: Get all students in a batch (for dropdown selection)
router.get('/batch/:batchId/students', auth, mockInterviewController.getMockInterviewStudents);

// PUT: Update interview status (attended/not-attended)
router.put('/:interviewId/status', auth, mockInterviewController.updateInterviewStatus);

// PUT: Add feedback and score to mock interview
router.put('/:interviewId/feedback', auth, mockInterviewController.addInterviewFeedback);

module.exports = router;
