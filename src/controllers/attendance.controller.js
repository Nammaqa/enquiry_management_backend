const db = require('../models');
const { Attendance, Enquiry, Subject, Batch, User } = db;
const { Op } = require('sequelize');
const QRCode = require('qrcode');
const crypto = require('crypto');

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

// Mark Attendance (Student)
exports.markAttendance = async (req, res) => {
    try {
        const { qrSessionId } = req.body;
        const enquiryId = req.enquiry.enquiryId;

        if (!qrSessionId) {
            return res.status(400).json({ success: false, message: 'qrSessionId is required' });
        }

        // Find batch with this sessionQr
        const batches = await Batch.findAll({
            where: {
                sessionQr: { [Op.like]: `%${qrSessionId}%` }
            }
        });

        if (batches.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired QR session' });
        }

        const batch = batches[0];
        let sessionData;
        try {
            sessionData = JSON.parse(batch.sessionQr);
        } catch (e) {
            return res.status(500).json({ success: false, message: 'Failed to parse session data' });
        }

        if (sessionData.qrSessionId !== qrSessionId) {
            return res.status(400).json({ success: false, message: 'Invalid QR session data' });
        }

        // Check expiration
        if (new Date() > new Date(batch.sessionEndDate)) {
            return res.status(400).json({ success: false, message: 'QR session has expired' });
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

        const isEnrolled = (student.batch && String(student.batch.id) === String(batch.id)) ||
            (student.enrolledBatches && student.enrolledBatches.some(b => String(b.id) === String(batch.id)));

        if (!isEnrolled) {
            return res.status(403).json({ success: false, message: 'You are not enrolled in this batch' });
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
