const express = require('express');
const router = express.Router();
const jobPostController = require('../controllers/jobPost.controller');
const auth = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// GET all job posts (restricted to ADMIN, COUNSELLOR, HR)
router.get('/', auth, roleMiddleware(['ADMIN', 'COUNSELLOR', 'HR']), jobPostController.getJobPosts);

// POST a new job post (restricted to ADMIN, COUNSELLOR, HR)
router.post('/', auth, roleMiddleware(['ADMIN', 'COUNSELLOR', 'HR']), jobPostController.createJobPost);

// PUT (update) a job post (restricted to ADMIN, COUNSELLOR, HR)
router.put('/:id', auth, roleMiddleware(['ADMIN', 'COUNSELLOR', 'HR']), jobPostController.updateJobPost);

// DELETE a job post (restricted to ADMIN, COUNSELLOR, HR)
router.delete('/:id', auth, roleMiddleware(['ADMIN', 'COUNSELLOR', 'HR']), jobPostController.deleteJobPost);

module.exports = router;
