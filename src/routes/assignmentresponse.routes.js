const express = require('express');
const router = express.Router();
const assignmentResponseController = require('../controllers/assignmentresponse.controller');
const enquiryAuth = require('../middlewares/enquiryAuth.middleware');

/**
 * @route   POST /api/assignment-responses
 * @desc    Student submits an assignment response with multiple files.
 * @access  Private (Enquiry Student JWT)
 */
router.post(
  '/',
  enquiryAuth,
  assignmentResponseController.createAssignmentResponse
);

/**
 * @route   GET /api/assignment-responses/my-submissions
 * @desc    Student retrieves their own assignment submission history.
 * @access  Private (Enquiry Student JWT)
 */
router.get(
  '/my-submissions',
  enquiryAuth,
  assignmentResponseController.getStudentSubmissions
);

/**
 * @route   PUT /api/assignment-responses/:id
 * @desc    Student updates their assignment response (notes/files).
 * @access  Private (Enquiry Student JWT)
 */
router.put(
  '/:id',
  enquiryAuth,
  assignmentResponseController.updateStudentSubmission
);

/**
 * @route   DELETE /api/assignment-responses/:id
 * @desc    Student deletes their assignment response.
 * @access  Private (Enquiry Student JWT)
 */
router.delete(
  '/:id',
  enquiryAuth,
  assignmentResponseController.deleteStudentSubmission
);

module.exports = router;
