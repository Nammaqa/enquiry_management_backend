const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { login, validateToken } = require('../controllers/auth.controller');


router.post('/login', login);


router.get('/validate-token', auth, validateToken);

module.exports = router;
