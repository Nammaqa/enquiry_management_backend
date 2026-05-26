const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const controller = require('../controllers/enquiry.controller');

/* READ — ALL LOGGED-IN USERS */
router.get('/', auth, controller.getAllEnquiries);
router.get('/status/fully-paid', auth, role(['ADMIN', 'ACCOUNTS']), controller.getFullyPaidEnquiries);
router.get('/:id', auth, controller.getEnquiryById);

/* WRITE — ADMIN, COUNSELLOR, and ACCOUNTS */
router.post('/', auth, role(['ADMIN', 'COUNSELLOR', ]), controller.createEnquiry);
router.put('/:id', auth, role(['ADMIN', 'COUNSELLOR', 'ACCOUNTS','student']), controller.updateEnquiry);
router.delete('/:id', auth, role(['ADMIN', 'COUNSELLOR']), controller.deleteEnquiry);


/* Change Enquiry Status */
router.post('/change-status', auth, role(['ADMIN', 'COUNSELLOR', 'HR', 'ACCOUNTS']),
    controller.changeEnquiryStatus);

module.exports = router;
