
const express = require('express');
const router = express.Router();
const studentBatchController = require('../controllers/studentbatch.controller');
const enquiryAuth = require('../middlewares/enquiryAuth.middleware');

// Apply enquiry authentication middleware to all routes
router.use(enquiryAuth);

/**
 * @route   GET /api/student-batches
 * @desc    Get all batches the logged-in student is part of
 * @access  Private (Enquiry Student)
 */
router.get('/', studentBatchController.getStudentBatches);

module.exports = router;
