const express = require('express');
const router = express.Router();
const classFeedController = require('../controllers/classfeed.controller');
const enquiryAuth = require('../middlewares/enquiryAuth.middleware');

// All routes require student authentication
router.use(enquiryAuth);

/**
 * @route   GET /api/class-feed/:batchId
 * @desc    Get class feed for one specific batch the student is enrolled in.
 *          Only shows content posted by that batch's assigned instructor.
 *
 * Query params (optional):
 *   type  = assignment | material | mock_interview
 *   page  = number  (default: 1)
 *   limit = number  (default: 20, max: 100)
 *
 * @access  Private (Enquiry Student JWT)
 */
router.get('/:batchId', classFeedController.getBatchFeed);

module.exports = router;
