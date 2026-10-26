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

// Public verification and check aliases for mobile students
const mobileAuthController = require('../controllers/mobile/auth.controller');
router.post('/check-student-exists', mobileAuthController.checkStudentExists);
router.post('/check-user-exists', mobileAuthController.checkUserExists);
router.get('/check-student-exists', mobileAuthController.checkStudentExists);
router.get('/check-user-exists', mobileAuthController.checkUserExists);
router.post('/send-otp', mobileAuthController.sendRegistrationOTP);
router.post('/send-phone-otp', mobileAuthController.sendRegistrationOTP);
router.post('/send-mobile-otp', mobileAuthController.sendRegistrationOTP);
router.post('/send-email-otp', mobileAuthController.sendRegistrationOTP);
router.post('/resend-signup-otp', mobileAuthController.resendSignupOTP);
router.post('/verify-otp', mobileAuthController.verifyOTP);
router.post('/verify-email-otp', mobileAuthController.verifyOTP);
router.post('/verify-phone-otp', mobileAuthController.verifyOTP);
router.post('/verify-mobile-otp', mobileAuthController.verifyOTP);

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
 * GET and PUT the authenticated student's NAcademy interests
 * GET /api/enquiry-students/interests
 * PUT /api/enquiry-students/interests
 */
router.get('/interests', enquiryStudentController.getStudentInterests);
router.put('/interests', enquiryStudentController.saveStudentInterests);

/**
 * PUT update student profile
 * PUT /api/enquiry-students/profile
 */
router.put('/profile', enquiryStudentController.updateStudentProfile);

module.exports = router;
