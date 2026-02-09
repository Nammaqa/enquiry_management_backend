const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const controller = require('../controllers/subject.controller');

// subjects
router.get('/', auth, controller.getAllSubjects);
router.get('/subjectby-instructor', auth, controller.getSubjectsByInstructor);
router.get('/:id', auth, controller.getSubjectById);
router.post('/', auth, controller.createSubject);
router.put('/:id', auth, controller.updateSubject);
router.delete('/:id', auth, controller.deleteSubject);

module.exports = router;
