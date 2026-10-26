const router = require('express').Router();
const {
  signup,
  login,
  verifyOTP,
  sendLoginOTP,
  resendSignupOTP,
  resendLoginOTP,
  checkStudentExists,
  checkUserExists,
  sendRegistrationOTP,
} = require('../../controllers/mobile/auth.controller');
const { enrollStudent } = require('../../controllers/enquiry.controller');
const sharedAuth = require('../../middlewares/sharedAuth.middleware');

// Public Pre-Registration & OTP Send Routes
router.post('/send-otp', sendRegistrationOTP);
router.post('/send-phone-otp', sendRegistrationOTP);
router.post('/send-mobile-otp', sendRegistrationOTP);
router.post('/send-sms-otp', sendRegistrationOTP);
router.post('/send-email-otp', sendRegistrationOTP);
router.post('/send-verification-otp', sendRegistrationOTP);
router.post('/request-otp', sendRegistrationOTP);
router.post('/resend-signup-otp', resendSignupOTP);

// Public OTP Verification Routes
router.post('/verify-otp', verifyOTP);
router.post('/verify-email-otp', verifyOTP);
router.post('/verify-phone-otp', verifyOTP);
router.post('/verify-mobile-otp', verifyOTP);
router.post('/verify-sms-otp', verifyOTP);
router.post('/verify-registration-otp', verifyOTP);

// Account Existence Check Routes (POST & GET)
router.post('/check-student-exists', checkStudentExists);
router.post('/check-user-exists', checkUserExists);
router.post('/check-exists', checkStudentExists);
router.get('/check-student-exists', checkStudentExists);
router.get('/check-user-exists', checkUserExists);
router.get('/check-exists', checkStudentExists);

// Signup & Login
router.post('/signup', signup);
router.post('/login', login);
router.post('/send-login-otp', sendLoginOTP);
router.post('/resend-login-otp', resendLoginOTP);

// Protected routes (require authentication)
router.post('/enroll', sharedAuth, enrollStudent);

module.exports = router;

