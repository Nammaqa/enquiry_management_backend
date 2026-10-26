const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const {
  createUser,
  changePassword,
  getUsers,
  deleteUser,
  getInstructors,
  updateUser,
  getMe,
  updateMe
} = require('../controllers/user.controller');

// Current user profile endpoints (MUST be defined before /:id)
router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);
router.patch('/me', auth, updateMe);

router.get('/instructors', auth, getInstructors);

router.get('/', auth, role('ADMIN'), getUsers);

router.post('/', auth, createUser);

router.post('/change-password', auth, role('ADMIN'), changePassword);

router.delete('/:id', auth, role('ADMIN'), deleteUser);

router.put('/:id', auth, role('ADMIN'), updateUser);

module.exports = router;

