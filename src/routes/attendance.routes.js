
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const enquiryAuth = require('../middlewares/enquiryAuth.middleware');
const attendanceController = require('../controllers/attendance.controller');

// Generate Online QR Session (Instructor)
router.post('/generate-qr', auth, attendanceController.generateQrSession);

// Generate/Set Offline QR Session (Instructor)
router.post('/generate-offline-qr', auth, attendanceController.generateOfflineQr);

// Mark Attendance (Student)
router.post('/mark', enquiryAuth, attendanceController.markAttendance);

// Get Attendance Summary (Instructor)
router.get('/summary', auth, attendanceController.getInstructorAttendanceSummary);

// Get Student Attendance (Student)
router.get('/student', enquiryAuth, attendanceController.getStudentAttendance);

module.exports = router;

