const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const {
  login,
  validateToken,
  sendLoginOTP,
  resendLoginOTP,
} = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/send-login-otp', sendLoginOTP);
router.post('/resend-login-otp', resendLoginOTP);
router.get('/validate-token', auth, validateToken);

module.exports = router;
