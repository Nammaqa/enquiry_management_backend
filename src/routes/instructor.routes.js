const express = require('express');
const router = express.Router();
const instructorController = require('../controllers/instructor.controller');
const auth = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Assign subject to instructor (ADMIN and COUNSELLOR only)
router.post(
  '/assign-subject',
  auth,
  instructorController.assignSubjectToInstructor
);

// Get all instructors (ADMIN and COUNSELLOR only)
router.get(
  '/list/all',
  auth,
  instructorController.getAllInstructors
);

// Get all subjects for instructor (accessible by instructor, admin, and counsellor)
router.get(
  '/my-subjects',
  auth,
  instructorController.getMySubjects
);

// Get specific subject details (accessible by instructor, admin, and counsellor)
router.get(
  '/subject/:subjectId',
  auth,
  instructorController.getSubjectDetail
);

// Get individual instructor profile with stats and details
router.get(
  '/profile/:instructorId',
  auth,
  instructorController.getInstructorProfile
);

// Get all instructors profiles with stats
router.get(
  '/all/profiles',
  auth,
  instructorController.getAllInstructorsProfiles
);

// Update instructor profile (name, description, image)
router.put(
  '/profile/:instructorId',
  auth,
  instructorController.updateInstructorProfile
);

// Get all assignments by subject ID
router.get(
  '/assignments/subject/:subjectId',
  auth,
  instructorController.getAssignmentsBySubject
);

// Get all batches by subject ID and instructor ID
router.get(
  '/batches/:subjectId/:instructorId',
  auth,
  instructorController.getBatchesBySubjectAndInstructor
);

// Get all assignments by batch ID
router.get(
  '/assignments/batch/:batchId',
  auth,
  instructorController.getAssignmentsByBatch
);

module.exports = router;
