const express = require('express');
const router = express.Router();
const materialController = require('../controllers/material.controller');
const auth = require('../middlewares/auth.middleware');

// Create Material by Instructor for their associated batch
router.post(
  '/instructor/create',
  auth,
  materialController.createInstructorMaterial
);

// Get all materials for the logged-in instructor's associated batch
router.get(
  '/instructor/materials/:batchId',
  auth,
  materialController.getInstructorMaterials
);

// Update Material
router.put(
  '/instructor/update/:id',
  auth,
  materialController.updateInstructorMaterial
);

// Delete Material
router.delete(
  '/instructor/delete/:id',
  auth,
  materialController.deleteInstructorMaterial
);

module.exports = router;
