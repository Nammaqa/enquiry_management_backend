const { Log, Enquiry } = require('../models');

/**
 * CREATE Log Entry (ALL AUTHENTICATED USERS)
 */
exports.createLog = async (req, res) => {
    try {
        // console.log("ooo", req.user)
        const userId = req.user.userId;
        const { enquiryId, title, description } = req.body;

        // Validate required fields
        if (!enquiryId) {
            return res.status(400).json({ message: 'Enquiry ID is required' });
        }

        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        // Check if enquiry exists
        const enquiry = await Enquiry.findByPk(enquiryId);
        if (!enquiry) {
            return res.status(404).json({ message: 'Enquiry not found' });
        }

        const log = await Log.create({
            enquiryId,
            title,
            description: description || null,
            userId,
        });

        res.status(201).json({
            message: 'Log entry created successfully',
            log,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET logs by Enquiry ID (ALL ROLES)
 */
exports.getLogsByEnquiryId = async (req, res) => {
    try {
        const { enquiryId } = req.params;

        // Check if enquiry exists
        const enquiry = await Enquiry.findByPk(enquiryId);
        if (!enquiry) {
            return res.status(404).json({ message: 'Enquiry not found' });
        }

        const logs = await Log.findAll({
            where: { enquiryId },
            include: [
                {
                    model: require('../models').User,
                    as: 'user',
                    attributes: ['id', 'email', 'role','name'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * DELETE log (ADMIN ONLY)
 */
exports.deleteLog = async (req, res) => {
    try {
        const log = await Log.findByPk(req.params.id);

        if (!log) {
            return res.status(404).json({
                message: 'Log not found',
            });
        }

        await log.destroy();

        res.json({
            message: 'Log deleted successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * UPDATE log (ADMIN, COUNSELLOR, OR THE USER WHO CREATED IT)
 */
exports.updateLog = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { title, description } = req.body;
        const logId = req.params.id;

        // Validate required fields
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        // Find the log
        const log = await Log.findByPk(logId);

        if (!log) {
            return res.status(404).json({
                message: 'Log not found',
            });
        }

        // Check if the user has permission to update (creator, ADMIN, or COUNSELLOR)
        if (log.userId !== userId && userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
            return res.status(403).json({
                message: 'Only ADMIN, COUNSELLOR, or the log creator can edit this log',
            });
        }

        // Update the log
        log.title = title;
        log.description = description || null;
        await log.save();

        res.status(200).json({
            message: 'Log updated successfully',
            log,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
