const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const auth = require('../middlewares/auth.middleware');

// Create Assignment for a Batch
router.post(
  '/create',
  auth,
  assignmentController.createAssignment
);

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

// Get Batches by Instructor ID and Subject ID
router.get(
  '/batches-by-instructor-subject',
  assignmentController.getBatchesByInstructorAndSubject
);

// Get Assignments for a Batch
router.get(
  '/batch/:batchId',
  assignmentController.getAssignmentsByBatch
);

// Get Single Assignment
router.get(
  '/:assignmentId',
  assignmentController.getAssignmentById
);

// Update Assignment
router.put(
  '/:assignmentId',
  auth,
  assignmentController.updateAssignment
);

// Delete Assignment
router.delete(
  '/:assignmentId',
  auth,
  assignmentController.deleteAssignment
);

module.exports = router;
