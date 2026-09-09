const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const {
  login,
  validateToken,
} = require('../controllers/auth.controller');

router.post('/login', login);
router.get('/validate-token', auth, validateToken);
const authController = require('../controllers/auth.controller');

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/send-login-otp', (req, res, next) => authController.sendLoginOTP(req, res, next));
router.post('/resend-login-otp', (req, res, next) => authController.resendLoginOTP(req, res, next));
router.get('/validate-token', auth, (req, res, next) => authController.validateToken(req, res, next));

module.exports = router;
