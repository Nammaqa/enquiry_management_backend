const express = require('express');
const router = express.Router();
const jobPostController = require('../controllers/jobPost.controller');
const auth = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const sharedAuth = require('../middlewares/sharedAuth.middleware');

// GET metadata (unique skills and highest education year)
router.get('/metadata/skills-and-years', sharedAuth, jobPostController.getMetadata);

// GET all job posts (restricted to ADMIN, COUNSELLOR, HR)
router.get('/', auth, roleMiddleware(['ADMIN', 'COUNSELLOR', 'HR']), jobPostController.getJobPosts);

// GET a single job post by ID (accessible by both system users and enquiry students)
router.get('/:id', sharedAuth, jobPostController.getJobPostById);

// POST apply for a job (restricted to enquiry students)
router.post('/:id/apply', sharedAuth, jobPostController.applyForJob);

// POST a new job post (restricted to ADMIN, COUNSELLOR, HR)
router.post('/', auth, roleMiddleware(['ADMIN', 'COUNSELLOR', 'HR']), jobPostController.createJobPost);

// PUT (update) a job post (restricted to ADMIN, COUNSELLOR, HR)
router.put('/:id', auth, roleMiddleware(['ADMIN', 'COUNSELLOR', 'HR']), jobPostController.updateJobPost);

// DELETE a job post (restricted to ADMIN, COUNSELLOR, HR)
router.delete('/:id', auth, roleMiddleware(['ADMIN', 'COUNSELLOR', 'HR']), jobPostController.deleteJobPost);

module.exports = router;
