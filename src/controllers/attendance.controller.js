const db = require('../models');
const { Attendance, Enquiry, Subject, Batch, User, BatchStudent } = db;
const { Op } = require('sequelize');
const QRCode = require('qrcode');
const crypto = require('crypto');

const OFFLINE_ATTENDANCE_RADIUS_METERS = Number(process.env.OFFLINE_ATTENDANCE_RADIUS_METERS || 15);
const OFFLINE_ATTENDANCE_LOCATION_NAME = process.env.OFFLINE_ATTENDANCE_LOCATION_NAME ||
    '1st Floor, #940, above Skanda Interiors, near Deepa Complex, Papreddy Palya, 2nd Stage, Nagarbhavi, Bengaluru, Karnataka 560072';

// Haversine formula to calculate distance between two points in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    var R = 6371000; // Radius of the earth in m
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in m
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}


// Generate QR Code Session (Instructor)
exports.generateQrSession = async (req, res) => {
    try {
        const { batchId, subjectId } = req.body;
        const instructorId = req.user.userId; // auth middleware uses userId
        const role = req.user.role;

        if (!batchId || !subjectId) {
            return res.status(400).json({ success: false, message: 'batchId and subjectId are required' });
        }

        const batch = await Batch.findByPk(batchId);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        // Verify instructor
        if (String(batch.instructorId) !== String(instructorId) && String(batch.createdBy) !== String(instructorId) && role !== 'ADMIN' && role !== 'COUNSELLOR') {
            return res.status(403).json({ success: false, message: 'Not authorized for this batch' });
        }

        const qrSessionId = crypto.randomBytes(16).toString('hex');
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

        const qrData = {
            batchId,
            subjectId,
            instructorId,
            qrSessionId,
            expiresAt: expiresAt.toISOString(),
        };

        const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

        // Update batch with session details
        batch.sessionQr = JSON.stringify(qrData);
        batch.sessionStartDate = now;
        batch.sessionEndDate = expiresAt;
        await batch.save();

        res.status(200).json({
            success: true,
            message: 'QR session generated',
            data: {
                qrCode,
                qrSessionId,
                expiresAt
            }
        });
    } catch (error) {
        console.error('Error generating QR session:', error);
        res.status(500).json({ success: false, message: 'Failed to generate QR session', error: error.message });
    }
};

// Generate Offline QR (Instructor / Admin)
exports.generateOfflineQr = async (req, res) => {
    try {
        const { batchId, latitude, longitude } = req.body;
        const instructorId = req.user.userId;
        const role = req.user.role;

        if (!batchId || !latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'batchId, latitude, and longitude are required' });
        }

        const centerLatitude = Number(latitude);
        const centerLongitude = Number(longitude);
        if (!Number.isFinite(centerLatitude) || !Number.isFinite(centerLongitude) ||
            centerLatitude < -90 || centerLatitude > 90 || centerLongitude < -180 || centerLongitude > 180) {
            return res.status(400).json({ success: false, message: 'latitude and longitude must be valid coordinates' });
        }

        const batch = await Batch.findByPk(batchId);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        if (String(batch.instructorId) !== String(instructorId) && String(batch.createdBy) !== String(instructorId) && role !== 'ADMIN' && role !== 'COUNSELLOR') {
            return res.status(403).json({ success: false, message: 'Not authorized for this batch' });
        }

        const offlineQrId = crypto.randomBytes(16).toString('hex');
        const qrData = {
            batchId,
            offlineQrId,
            type: 'offline',
            locationName: OFFLINE_ATTENDANCE_LOCATION_NAME,
            radiusMeters: OFFLINE_ATTENDANCE_RADIUS_METERS
        };

        const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

        batch.latitude = centerLatitude;
        batch.longitude = centerLongitude;
        batch.offlineQr = JSON.stringify(qrData);
        await batch.save();

        res.status(200).json({
            success: true,
            message: 'Offline QR generated and location set',
            data: {
                qrCode,
                latitude: centerLatitude,
                longitude: centerLongitude,
                locationName: OFFLINE_ATTENDANCE_LOCATION_NAME,
                radiusMeters: OFFLINE_ATTENDANCE_RADIUS_METERS
            }
        });
    } catch (error) {
        console.error('Error generating offline QR:', error);
        res.status(500).json({ success: false, message: 'Failed to generate offline QR', error: error.message });
    }
};

// Mark Attendance (Student)
exports.markAttendance = async (req, res) => {
    try {
        const { qrSessionId, latitude, longitude } = req.body;
        const enquiryId = req.enquiry?.enquiryId;

        if (!enquiryId) {
            return res.status(401).json({ success: false, message: 'Student authentication is required' });
        }

        if (!qrSessionId) {
            return res.status(400).json({ success: false, message: 'qrSessionId is required' });
        }

        // Find batch with this sessionQr or offlineQr
        const batches = await Batch.findAll({
            where: {
                [Op.or]: [
                    { sessionQr: { [Op.like]: `%${qrSessionId}%` } },
                    { offlineQr: { [Op.like]: `%${qrSessionId}%` } }
                ]
            }
        });

        if (batches.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired QR session' });
        }

        const batch = batches[0];
        let sessionData;
        let isOfflineMode = false;
        try {
            if (batch.offlineQr && batch.offlineQr.includes(qrSessionId)) {
                sessionData = JSON.parse(batch.offlineQr);
                isOfflineMode = true;
            } else {
                sessionData = JSON.parse(batch.sessionQr);
            }
        } catch (e) {
            return res.status(500).json({ success: false, message: 'Failed to parse session data' });
        }

        if (!isOfflineMode) {
            if (sessionData.qrSessionId !== qrSessionId) {
                return res.status(400).json({ success: false, message: 'Invalid QR session data' });
            }

            // Check expiration for online
            if (new Date() > new Date(batch.sessionEndDate)) {
                return res.status(400).json({ success: false, message: 'QR session has expired' });
            }
        } else {
            if (sessionData.offlineQrId !== qrSessionId) {
                return res.status(400).json({ success: false, message: 'Invalid Offline QR session data' });
            }
        }

        // Check if student belongs to batch
        const student = await Enquiry.findByPk(enquiryId, {
            include: [
                {
                    model: Batch, as: 'batch', where: { id: batch.id }, required: false
                },
                {
                    model: Batch, as: 'enrolledBatches', where: { id: batch.id }, required: false, through: { attributes: [] }
                }
            ]
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student account not found' });
        }

        if (!['class', 'class qualified'].includes(String(student.candidateStatus || '').toLowerCase())) {
            return res.status(403).json({ success: false, message: 'Attendance is available only after classroom eligibility is approved.' });
        }

        const isEnrolled = (student.batch && String(student.batch.id) === String(batch.id)) ||
            (student.enrolledBatches && student.enrolledBatches.some(b => String(b.id) === String(batch.id)));

        if (!isEnrolled) {
            return res.status(403).json({ success: false, message: 'You are not enrolled in this batch' });
        }

        // Check mode and location
        const batchStudent = await BatchStudent.findOne({ where: { batchId: batch.id, enquiryId } });
        const studentMode = batchStudent ? batchStudent.mode : 'online';

        if (isOfflineMode) {
            // Student is scanning offline QR
            if (studentMode !== 'offline') {
                return res.status(403).json({ success: false, message: 'You are not registered for offline classes.' });
            }

            const studentLatitude = Number(latitude);
            const studentLongitude = Number(longitude);
            if (!Number.isFinite(studentLatitude) || !Number.isFinite(studentLongitude) ||
                studentLatitude < -90 || studentLatitude > 90 || studentLongitude < -180 || studentLongitude > 180) {
                return res.status(400).json({ success: false, message: 'Location (latitude, longitude) is required for offline attendance.' });
            }

            if (!Number.isFinite(Number(batch.latitude)) || !Number.isFinite(Number(batch.longitude))) {
                return res.status(409).json({ success: false, message: 'Offline attendance location has not been configured for this batch.' });
            }

            const distance = getDistanceFromLatLonInM(studentLatitude, studentLongitude, batch.latitude, batch.longitude);
            if (distance > OFFLINE_ATTENDANCE_RADIUS_METERS) {
                return res.status(403).json({
                    success: false,
                    message: `You are not within the attendance location (${Math.round(distance)} meters away; maximum allowed is ${OFFLINE_ATTENDANCE_RADIUS_METERS} meters).`,
                    data: {
                        distanceMeters: Math.round(distance),
                        radiusMeters: OFFLINE_ATTENDANCE_RADIUS_METERS,
                        locationName: sessionData.locationName || OFFLINE_ATTENDANCE_LOCATION_NAME
                    }
                });
            }
        } else {
            // Student is scanning online QR
            if (studentMode !== 'online') {
                return res.status(403).json({ success: false, message: 'You are registered for offline classes. Please scan the center QR code.' });
            }
        }

        // Check existing attendance
        let attendance = await Attendance.findOne({
            where: {
                batchId: batch.id,
                subjectId: sessionData.subjectId || batch.subjectId,
                enquiryId
            }
        });

        if (!attendance) {
            attendance = await Attendance.create({
                batchId: batch.id,
                subjectId: sessionData.subjectId || batch.subjectId,
                enquiryId,
                instructorId: sessionData.instructorId || batch.instructorId,
                attendanceCount: 0
            });
        }

        // Check for double marking today
        const nowLocal = new Date().toDateString();
        const lastUpdatedLocal = attendance.updatedAt ? new Date(attendance.updatedAt).toDateString() : null;

        if (attendance.attendanceCount > 0 && lastUpdatedLocal === nowLocal) {
            return res.status(400).json({ success: false, message: 'Attendance already marked for today' });
        }

        attendance.attendanceCount += 1;
        await attendance.save();

        res.status(200).json({
            success: true,
            message: 'Attendance marked successfully',
            data: {
                attendanceCount: attendance.attendanceCount
            }
        });

    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ success: false, message: 'Failed to mark attendance', error: error.message });
    }
};

// Get Instructor Attendance Summary
exports.getInstructorAttendanceSummary = async (req, res) => {
    try {
        const { batchId, subjectId } = req.query;

        if (!batchId) {
            return res.status(400).json({ success: false, message: 'batchId is required' });
        }

        // Get all students enrolled in this batch
        const students = await Enquiry.findAll({
            include: [
                {
                    model: Batch, as: 'enrolledBatches', where: { id: batchId }, required: false, through: { attributes: [] }
                }
            ],
            attributes: ['id', 'name', 'email', 'phone', 'batchId']
        });

        const allStudents = students.filter(s =>
            String(s.batchId) === String(batchId) ||
            (s.enrolledBatches && s.enrolledBatches.length > 0)
        );

        const whereClause = { batchId };
        if (subjectId) whereClause.subjectId = subjectId;

        const attendances = await Attendance.findAll({
            where: whereClause
        });

        const attendanceMap = {};
        attendances.forEach(a => {
            if (!attendanceMap[a.enquiryId]) attendanceMap[a.enquiryId] = 0;
            attendanceMap[a.enquiryId] += (a.attendanceCount || 0);
        });

        const summary = allStudents.map(student => ({
            enquiryId: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            attendanceCount: attendanceMap[student.id] || 0
        }));

        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance summary', error: error.message });
    }
};

// Get Student Attendance
exports.getStudentAttendance = async (req, res) => {
    try {
        const enquiryId = req.enquiry.enquiryId;
        const { batchId, subjectId } = req.query;

        let whereClause = { enquiryId };
        if (batchId) whereClause.batchId = batchId;
        if (subjectId) whereClause.subjectId = subjectId;

        const attendances = await Attendance.findAll({
            where: whereClause,
            include: [
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
                { model: Batch, as: 'batch', attributes: ['id', 'name', 'code'] }
            ]
        });

        res.status(200).json({
            success: true,
            data: attendances
        });
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch student attendance', error: error.message });
    }
};
