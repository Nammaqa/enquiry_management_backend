const express = require('express');
const router = express.Router();
const enquiryStudentController = require('../controllers/enquiryStudent.controller');
const enquiryAuth = require('../middlewares/enquiryAuth.middleware');

/**
 * PUBLIC ROUTE - Student Signup
 * POST /api/enquiry-students/signup
 */
router.post('/signup', enquiryStudentController.enquiryStudentSignup);

/**
 * PUBLIC ROUTE - Student Login
 * POST /api/enquiry-students/login
 */
router.post('/login', enquiryStudentController.enquiryStudentLogin);

/**
 * PUBLIC ROUTE - Token validation for enquiry students
 * GET /api/enquiry-students/validate-token
 */
router.get('/validate-token', enquiryAuth, enquiryStudentController.validateToken);

/**
 * PROTECTED ROUTES - Require Enquiry Student Authentication
 */
router.use(enquiryAuth);

/**
 * GET student classroom dashboard with batch, enrollment, and classmates
 * GET /api/enquiry-students/classroom
 */
router.get('/classroom', enquiryStudentController.getStudentClassroom);

/**
 * GET list of classmates (other students in same batch)
 * GET /api/enquiry-students/classmates
 */
router.get('/classmates', enquiryStudentController.getClassmates);

/**
 * GET enrollment details (package or subjects taken)
 * GET /api/enquiry-students/enrollment
 */
router.get('/enrollment', enquiryStudentController.getEnrollmentDetails);

/**
 * PUT update student profile
 * PUT /api/enquiry-students/profile
 */
router.put('/profile', enquiryStudentController.updateStudentProfile);

module.exports = router;
