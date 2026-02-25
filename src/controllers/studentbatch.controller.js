
const db = require('../models');
const Enquiry = db.Enquiry;
const Batch = db.Batch;
const Subject = db.Subject;
const User = db.User;

/**
 * Get all batches for the logged-in student
 * Includes the primary batch (via batchId) and any additional batches (via BatchStudent)
 */
exports.getStudentBatches = async (req, res) => {
    try {
        const enquiryId = req.enquiry.enquiryId;

        if (!enquiryId) {
            return res.status(400).json({ message: 'Student ID not found in request' });
        }

        // Fetch the student with their primary batch and enrolled batches
        const student = await Enquiry.findByPk(enquiryId, {
            include: [
                {
                    model: Batch,
                    as: 'batch', // Primary batch
                    include: [
                        {
                            model: Subject,
                            as: 'subject',
                            attributes: ['id', 'name', 'code', 'image']
                        },
                        {
                            model: User,
                            as: 'instructor',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                },
                {
                    model: Batch,
                    as: 'enrolledBatches', // Batches via many-to-many
                    include: [
                        {
                            model: Subject,
                            as: 'subject',
                            attributes: ['id', 'name', 'code', 'image']
                        },
                        {
                            model: User,
                            as: 'instructor',
                            attributes: ['id', 'name', 'email']
                        }
                    ],
                    through: {
                        attributes: [] // Don't include join table data
                    }
                }
            ]
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Combine primary batch and enrolled batches into a single list
        // Use a Map to deduplicate by batch ID in case primary batch is also in enrolledBatches
        const batchMap = new Map();

        if (student.batch) {
            batchMap.set(student.batch.id, student.batch);
        }

        if (student.enrolledBatches && student.enrolledBatches.length > 0) {
            student.enrolledBatches.forEach(batch => {
                batchMap.set(batch.id, batch);
            });
        }

        const allBatches = Array.from(batchMap.values());

        res.status(200).json({
            success: true,
            count: allBatches.length,
            data: allBatches
        });

    } catch (error) {
        console.error('Error fetching student batches:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student batches',
            error: error.message
        });
    }
};

/**
 * Get Specific Batch Details for Student
 * GET /api/student-batches/:batchId/details
 * Verification: Ensure student is enrolled in the requested batch
 */
exports.getBatchDetails = async (req, res) => {
    try {
        const { batchId } = req.params;
        let isMember = false;

        // 1. Check access based on user type
        if (req.enquiry) {
            // Student Access: Verify enrollment
            const enquiryId = req.enquiry.enquiryId;
            const student = await Enquiry.findByPk(enquiryId, {
                include: [
                    {
                        model: Batch,
                        as: 'batch', // Primary batch
                        where: { id: batchId },
                        required: false
                    },
                    {
                        model: Batch,
                        as: 'enrolledBatches', // Batches via many-to-many
                        where: { id: batchId },
                        required: false,
                        through: { attributes: [] }
                    }
                ]
            });

            isMember = (student && student.batch && student.batch.id == batchId) ||
                (student && student.enrolledBatches && student.enrolledBatches.length > 0);
        } else if (req.user) {
            // Staff Access: Admin/Counsellor see all, Instructor sees assigned batches
            const { id: userId, role } = req.user;

            if (role === 'ADMIN' || role === 'COUNSELLOR') {
                isMember = true;
            } else if (role === 'INSTRUCTOR') {
                const batch = await Batch.findByPk(batchId);
                isMember = batch && (batch.instructorId === userId || batch.createdBy === userId);
            }
        }

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have permission to view this batch.'
            });
        }

        // 2. Fetch full details (Instructor and classmates)
        const batchDetails = await Batch.findByPk(batchId, {
            include: [
                {
                    model: User,
                    as: 'instructor',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Enquiry,
                    as: 'enrolledStudents',
                    attributes: ['id', 'name', 'email'],
                    through: { attributes: [] }
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: batchDetails
        });

    } catch (error) {
        console.error('Error fetching student batch details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch batch details',
            error: error.message
        });
    }
};
