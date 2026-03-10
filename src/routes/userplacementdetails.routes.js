const express = require('express');
const router = express.Router();
const userPlacementController = require('../controllers/userplacementdetails.controller.js');
const enquiryAuth = require('../middlewares/enquiryAuth.middleware');
const auth = require('../middlewares/auth.middleware');

// GET: Fetch all placement data (Admin/Instructor view)
router.get('/all-placements', auth, userPlacementController.getAllPlacements);

// POST: Save unified placement data (all tables)
router.post('/unified', enquiryAuth, userPlacementController.saveUnifiedPlacementData);

// PUT: Update unified placement data (replaces associations)
router.put('/unified', enquiryAuth, userPlacementController.updateUnifiedPlacementData);

// GET: Fetch unified placement data for the student
router.get('/unified', enquiryAuth, userPlacementController.getUnifiedPlacementData);

// Optional: Individual routes for granular access
router.get('/work-experience', enquiryAuth, userPlacementController.getWorkExperiences);
router.get('/higher-education', enquiryAuth, userPlacementController.getHigherEducations);
router.get('/certification', enquiryAuth, userPlacementController.getCertifications);
router.get('/projects', enquiryAuth, userPlacementController.getProjects);

module.exports = router;
