
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
