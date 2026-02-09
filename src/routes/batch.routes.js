const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');
const auth = require('../middlewares/auth.middleware');

// Create Batch (Instructors submit for approval, Admin/Counsellor create directly)
router.post(
  '/create',
  auth,
  batchController.createBatch
);

// Get available batches (approved batches created by admin/counsellor) - for instructors
router.get(
  '/available-batches',
  auth,
  batchController.getAvailableBatches
);

// Get all batches
router.get(
  '/',
  auth,
  batchController.getBatches
);

// Get batches by subject ID for the logged-in instructor (instructor ID from token)
router.get(
  '/subject/:subjectId',
  auth,
  batchController.getBatchesBySubject
);

// Get all subjects for the logged-in instructor
router.get(
  '/instructor/subjects',
  auth,
  batchController.getInstructorSubjects
);

// Get batch by ID
router.get(
  '/:batchId',
  auth,
  batchController.getBatchById
);

// Update batch
router.put(
  '/:batchId',
  auth,
  batchController.updateBatch
);

// Update approval status (Admin/Counsellor only)
router.patch(
  '/:batchId/approval-status',
  auth,
  batchController.updateApprovalStatus
);

// Delete batch
router.delete(
  '/:batchId',
  auth,
  batchController.deleteBatch
);

module.exports = router;
