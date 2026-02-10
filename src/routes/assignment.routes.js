const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const auth = require('../middlewares/auth.middleware');


// Create Assignment by Instructor for their associated batch
router.post(
  '/instructor/create',
  auth,
  assignmentController.createInstructorAssignment
);

// Get all assignments for the logged-in instructor's associated batch
router.get(
  '/instructor/assignments/:batchId',
  auth,
  assignmentController.getInstructorAssignments
);

// Update Assignment by Instructor
router.put(
  '/instructor/update/:assignmentId',
  auth,
  assignmentController.updateInstructorAssignment
);

module.exports = router;
