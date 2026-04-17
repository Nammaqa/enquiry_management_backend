const router = require('express').Router();
const { signup, login, verifyOTP, sendLoginOTP, resendSignupOTP, resendLoginOTP, checkUserExists } = require('../../controllers/mobile/auth.controller');

// Public routes
router.post('/signup', signup);
router.post('/resend-signup-otp', resendSignupOTP);
router.post('/verify-otp', verifyOTP);
router.post('/send-login-otp', sendLoginOTP);
router.post('/resend-login-otp', resendLoginOTP);
router.post('/login', login);
router.post('/check-user-exists', checkUserExists);

module.exports = router;
