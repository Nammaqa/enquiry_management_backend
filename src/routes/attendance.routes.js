
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const enquiryAuth = require('../middlewares/enquiryAuth.middleware');
const sharedAuth = require('../middlewares/sharedAuth.middleware');
const attendanceController = require('../controllers/attendance.controller');

// Optional auth helper to allow flexible calls from both token holders and direct LMS clients
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    return sharedAuth(req, res, next);
};

// Generate Online QR Session (Instructor)
router.post('/generate-qr', auth, attendanceController.generateQrSession);

// Generate/Set Offline QR Session (Instructor)
router.post('/generate-offline-qr', auth, attendanceController.generateOfflineQr);

// Mark Attendance (Student)
router.post('/mark', enquiryAuth, attendanceController.markAttendance);

// Presentation Attendance: Submit (Student with mandatory >=90 min check & photo evidence)
router.post('/presentation', optionalAuth, attendanceController.submitPresentationAttendance);

// Presentation Attendance: List / Query (Instructor, Admin, Student)
router.get('/presentation', optionalAuth, attendanceController.getPresentationAttendances);

// Presentation Attendance: Review (Trainer / Instructor / Admin status update)
router.put('/presentation/:id/status', optionalAuth, attendanceController.reviewPresentationAttendance);

// Get Attendance Summary (Instructor)
router.get('/summary', auth, attendanceController.getInstructorAttendanceSummary);

// Get Student Attendance (Student)
router.get('/student', enquiryAuth, attendanceController.getStudentAttendance);

module.exports = router;


