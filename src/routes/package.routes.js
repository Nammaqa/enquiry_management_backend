const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const controller = require('../controllers/package.controller');

// packages
router.get('/', auth, controller.getAllPackages);
router.get('/:id/price', auth, controller.getPackagePriceByid);
router.get('/:id', auth, controller.getPackageById);
router.post('/', auth, controller.createPackage);
router.put('/:id', auth, controller.updatePackage);
router.delete('/:id', auth, controller.deletePackage);

module.exports = router;
