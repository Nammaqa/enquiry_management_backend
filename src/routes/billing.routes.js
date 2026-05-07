const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const controller = require('../controllers/billing.controller');

/* READ — ALL LOGGED-IN USERS */
router.get('/', auth, role(['ADMIN', 'ACCOUNTS', 'COUNSELLOR']), controller.getAllBillings);
router.get('/enquiry/:enquiryId', auth, role(['ADMIN', 'ACCOUNTS','COUNSELLOR']), controller.getBillingByEnquiryId);
router.get('/:id', auth, role(['ADMIN', 'ACCOUNTS', 'COUNSELLOR']), controller.getBillingById);

/* WRITE — ALL LOGGED-IN USERS (CREATE/UPDATE COMBINED) */
router.post('/', auth, role(['ADMIN', 'ACCOUNTS', 'COUNSELLOR']), controller.createOrUpdateBilling);

/* UPDATE — ADMIN and ACCOUNTS */
router.put('/:id', auth, role(['ADMIN', 'ACCOUNTS','COUNSELLOR']), controller.updateBilling);

/* DELETE — ADMIN ONLY */
router.delete('/:id', auth, role(['ADMIN']), controller.deleteBilling);

module.exports = router;
