const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const mobileAuthController = require('../controllers/mobile/auth.controller');

router.post('/login', authController.login);
router.post('/send-login-otp', authController.sendLoginOTP);
router.post('/resend-login-otp', authController.resendLoginOTP);
router.get('/validate-token', auth, authController.validateToken);

// Fallback aliases for clients calling /api/auth/* instead of /api/mobile/auth/*
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

module.exports = router;
