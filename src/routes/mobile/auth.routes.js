const router = require('express').Router();
const { signup, login, verifyOTP, sendLoginOTP, resendSignupOTP, resendLoginOTP, checkStudentExists } = require('../../controllers/mobile/auth.controller');
const { enrollStudent } = require('../../controllers/enquiry.controller');
const sharedAuth = require('../../middlewares/sharedAuth.middleware');

// Public routes
router.post('/signup', signup);
router.post('/resend-signup-otp', resendSignupOTP);
router.post('/verify-otp', verifyOTP);
router.post('/send-login-otp', sendLoginOTP);
router.post('/resend-login-otp', resendLoginOTP);
router.post('/login', login);
router.post('/check-student-exists', checkStudentExists);

// Protected routes (require authentication)
router.post('/enroll', sharedAuth, enrollStudent);

module.exports = router;
