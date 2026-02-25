const db = require('../models');
const { Batch, Enquiry, Feedback, User } = db;

/**
 * Submit Class Feedback (Unprotected)
 * POST /api/class-feedback?batchCode=ABC
 */
exports.submitFeedback = async (req, res) => {
    try {
        const { batchCode } = req.query;
        const { email, rating, feedbackText } = req.body;

        if (!batchCode || !email || !rating) {
            return res.status(400).json({
                success: false,
                message: 'batchCode (query), email, and rating (body) are required'
            });
        }

        // 1. Find Batch by code
        const batch = await Batch.findOne({ where: { code: batchCode } });
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        // 2. Find Student by email
        const student = await Enquiry.findOne({
            where: { email },
            include: [
                {
                    model: Batch,
                    as: 'batch', // Primary batch
                    required: false
                },
                {
                    model: Batch,
                    as: 'enrolledBatches', // Batches via junction
                    required: false,
                    through: { attributes: [] }
                }
            ]
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found with this email' });
        }

        // 3. Verify membership
        const isMember = (student.batch && student.batch.id === batch.id) ||
            (student.enrolledBatches && student.enrolledBatches.some(b => b.id === batch.id));

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not enrolled in this batch.'
            });
        }

        // 4. Create Feedback
        // Note: Feedback model uses instructorId from the batch
        const feedback = await Feedback.create({
            enquiryId: student.id,
            batchId: batch.id,
            instructorId: batch.instructorId,
            rating: rating,
            feedbackText: feedbackText ? [feedbackText] : [] // model expects array
        });

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback
        });

    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Get Batch Feedback (Unprotected)
 * GET /api/class-feedback/batch/:batchId
 */
exports.getBatchFeedback = async (req, res) => {
    try {
        const { batchId } = req.params;

        if (!batchId) {
            return res.status(400).json({ success: false, message: 'batchId parameter is required' });
        }

        const batch = await Batch.findByPk(batchId);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        const feedbacks = await Feedback.findAll({
            where: { batchId: batch.id },
            include: [
                {
                    model: Enquiry,
                    as: 'enquiry',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: feedbacks.length,
            data: {
                batchName: batch.name,
                batchId: batch.id,
                batchCode: batch.code,
                feedbacks
            }
        });

    } catch (error) {
        console.error('Error fetching batch feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
