const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const optionalAuth = require('../middlewares/optionalAuth.middleware');
const controller = require('../controllers/package.controller');

// packages
router.get('/domains', optionalAuth, controller.getAllPackageDomains);
router.get('/domain', optionalAuth, controller.getPackagesByDomain);
router.get('/domain/:domain', optionalAuth, controller.getPackagesByDomain);
router.get('/', optionalAuth, controller.getAllPackages);
router.get('/:id/price', auth, controller.getPackagePriceByid);
router.get('/:id', optionalAuth, controller.getPackageById);
router.post('/', auth, controller.createPackage);
router.put('/:id', auth, controller.updatePackage);
router.delete('/:id', auth, controller.deletePackage);

module.exports = router;

