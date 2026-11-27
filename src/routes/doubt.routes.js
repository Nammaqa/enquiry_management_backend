const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubt.controller');
const enquiryAuth = require('../middlewares/enquiryAuth.middleware');
const sharedAuth = require('../middlewares/sharedAuth.middleware');
const auth = require('../middlewares/auth.middleware');

router.get('/batch/:batchId', sharedAuth, doubtController.getBatchDoubts);
router.post('/', enquiryAuth, doubtController.createDoubt);
router.put('/:id/answer', auth, doubtController.answerDoubt);
router.patch('/:id/resolve', sharedAuth, doubtController.resolveDoubt);

module.exports = router;
