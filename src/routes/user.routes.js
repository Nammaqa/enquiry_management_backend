const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const { createUser, changePassword, getUsers, deleteUser, getInstructors } = require('../controllers/user.controller');


router.get('/instructors', auth, getInstructors);


router.get('/', auth, role('ADMIN'), getUsers);


router.post('/', auth, createUser);


router.post('/change-password', auth, role('ADMIN'), changePassword);


router.delete('/:id', auth, role('ADMIN'), deleteUser);

module.exports = router;
