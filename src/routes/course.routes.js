const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const controller = require('../controllers/course.controller');

/* READ — ALL LOGGED-IN USERS */
router.get('/', auth, controller.getAllCourses);
router.get('/:id', auth, controller.getCourseById);

/* WRITE — ADMIN and COUNSELLOR */
router.post('/', auth, role(['ADMIN']), controller.createCourse);
router.put('/:id', auth, role(['ADMIN']), controller.updateCourse);
router.delete('/:id', auth, role(['ADMIN']), controller.deleteCourse);

module.exports = router;
