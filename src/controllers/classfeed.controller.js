const db = require('../models');
const { Op } = require('sequelize');

const Enquiry = db.Enquiry;
const Batch = db.Batch;
const Assignment = db.Assignment;
const Material = db.Material;
const MockInterview = db.MockInterview;
const Subject = db.Subject;
const User = db.User;

// ─── Shared includes ─────────────────────────────────────────────────────────
const instructorInclude = {
    model: User,
    as: 'instructor',
    attributes: ['id', 'name', 'email']
};

const subjectInclude = {
    model: Subject,
    as: 'subject',
    attributes: ['id', 'name', 'code']
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: get all batches (with instructorId + instructor details) for a student.
 * Combines the primary batch (FK on Enquiry) and many-to-many (BatchStudent).
 */
async function getStudentBatchDetails(enquiryId) {
    const student = await Enquiry.findByPk(enquiryId, {
        attributes: ['id', 'batchId'],
        include: [
            {
                model: Batch,
                as: 'batch',
                attributes: ['id', 'name', 'code', 'instructorId'],
                include: [{ model: User, as: 'instructor', attributes: ['id', 'name', 'email'] }]
            },
            {
                model: Batch,
                as: 'enrolledBatches',
                attributes: ['id', 'name', 'code', 'instructorId'],
                include: [{ model: User, as: 'instructor', attributes: ['id', 'name', 'email'] }],
                through: { attributes: [] }
            }
        ]
    });

    if (!student) return null;

    const batchMap = new Map();

    if (student.batch) {
        batchMap.set(student.batch.id, student.batch);
    }

    if (student.enrolledBatches) {
        student.enrolledBatches.forEach(b => batchMap.set(b.id, b));
    }

    return Array.from(batchMap.values());
}

/**
 * Fetch and tag content for ONE batch, filtered strictly to that batch's instructor.
 * Returns a time-sorted array of { type, sortDate, data } items.
 */
async function fetchFeedForBatch(batch, enquiryId, typeFilter) {
    const { id: batchId, instructorId } = batch;

    if (!instructorId) return [];   // batch has no instructor assigned yet

    const shouldFetch = (type) => !typeFilter || typeFilter === type;

    const [assignments, materials, mockInterviews] = await Promise.all([

        // Assignments  — instructor FK is `createdBy`
        shouldFetch('assignment')
            ? Assignment.findAll({
                where: { batchId, createdBy: instructorId },
                attributes: ['id', 'title', 'description', 'assignmentFile', 'dueDate', 'createdDate', 'createdAt'],
                include: [instructorInclude, subjectInclude],
                order: [['createdDate', 'DESC']]
            })
            : [],

        // Materials — instructor FK is `instructorId`
        shouldFetch('material')
            ? Material.findAll({
                where: { batchId, instructorId },
                attributes: ['id', 'title', 'description', 'documentName', 'documentUrl', 'uploadedOn', 'createdAt'],
                include: [instructorInclude, subjectInclude],
                order: [['uploadedOn', 'DESC']]
            })
            : [],

        // Mock Interviews — only this student's own, by this batch's instructor
        shouldFetch('mock_interview')
            ? MockInterview.findAll({
                where: { batchId, instructorId, enquiryId },
                attributes: [
                    'id', 'studentName', 'studentEmail',
                    'interviewDate', 'interviewTime', 'mode',
                    'interviewLink', 'documentUpload',
                    'status', 'feedback', 'score', 'outOf', 'createdAt'
                ],
                include: [instructorInclude],
                order: [['interviewDate', 'DESC']]
            })
            : []
    ]);

    // Tag each item with its content type and a normalised sort date
    const tag = (items, type, dateField) =>
        items.map(item => ({
            type,
            sortDate: item[dateField] || item.createdAt,
            data: item
        }));

    const feed = [
        ...tag(assignments, 'assignment', 'createdDate'),
        ...tag(materials, 'material', 'uploadedOn'),
        ...tag(mockInterviews, 'mock_interview', 'interviewDate')
    ];

    // Sort newest → oldest within the batch
    feed.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

    return feed;
}

/**
 * GET /api/class-feed/:batchId
 *
 * Returns the class feed for ONE specific batch the student is enrolled in.
 * Only shows content posted by that batch's assigned instructor for that batch.
 *
 * Optional query params:
 *   ?type=assignment|material|mock_interview
 *   ?page=1&limit=20
 *
 * @access  Private (Enquiry Student JWT)
 */
exports.getBatchFeed = async (req, res) => {
    try {
        const enquiryId = req.enquiry.enquiryId;
        const batchId = parseInt(req.params.batchId, 10);

        if (!enquiryId) {
            return res.status(400).json({ message: 'Student ID not found in request' });
        }

        if (!batchId || isNaN(batchId)) {
            return res.status(400).json({ message: 'Invalid batch ID' });
        }

        const batches = await getStudentBatchDetails(enquiryId);

        if (!batches) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const batch = batches.find(b => b.id === batchId);

        if (!batch) {
            return res.status(403).json({
                success: false,
                message: 'You are not enrolled in this batch'
            });
        }

        if (!batch.instructorId) {
            return res.status(200).json({
                success: true,
                message: 'No instructor assigned to this batch yet',
                batch: { id: batch.id, name: batch.name, code: batch.code },
                count: 0,
                data: []
            });
        }

        const typeFilter = req.query.type;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

        const feed = await fetchFeedForBatch(batch, enquiryId, typeFilter);
        const total = feed.length;
        const paginated = feed.slice((page - 1) * limit, page * limit);

        return res.status(200).json({
            success: true,
            batch: {
                id: batch.id,
                name: batch.name,
                code: batch.code,
                instructor: batch.instructor || null
            },
            count: paginated.length,
            total,
            totalPages: Math.ceil(total / limit),
            page,
            data: paginated
        });

    } catch (error) {
        console.error('Error fetching batch class feed:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch batch class feed',
            error: error.message
        });
    }
};
