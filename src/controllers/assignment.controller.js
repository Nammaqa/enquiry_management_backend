const db = require('../models');
const Batch = db.Batch;
const Subject = db.Subject;
const Assignment = db.Assignment;
const User = db.User;
const { Formidable } = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const uploadImage = require('../utils/cloudinary');

// Create Assignment for a Batch
exports.createAssignment = async (req, res) => {
  const form = new Formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024, keepExtensions: true });
  
  try {
    const [fields, files] = await form.parse(req);
    const batchId = fields.batchId ? fields.batchId[0] : null;
    const title = fields.title ? fields.title[0] : null;
    const description = fields.description ? fields.description[0] : null;
    const dueDate = fields.dueDate ? fields.dueDate[0] : null;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('Create assignment request:', { batchId, title, dueDate, userRole });

    if (!batchId || !title || !dueDate) {
      return res.status(400).json({
        message: 'batchId, title, and dueDate are required',
      });
    }

    // Get batch with subject details
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Subject,
          attributes: ['id', 'name', 'code'],
          as: 'subject',
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Only instructor of that batch or admin/counsellor can create assignments
    if (userRole === 'instructor' && batch.createdBy !== userId) {
      return res.status(403).json({ 
        message: 'Access denied. You can only create assignments for your own batches.' 
      });
    }

    let assignmentFile = null;

    // Handle file upload if provided
    if (files.assignmentFile && files.assignmentFile[0]) {
      const file = files.assignmentFile[0];
      const fileBuffer = await fs.readFile(file.filepath);
      const uniqueName = `assignment-${batchId}-${Date.now()}`;
      
      try {
        const uploadResult = await uploadImage(fileBuffer, uniqueName);
        assignmentFile = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(400).json({
          message: 'Failed to upload assignment file',
          error: uploadError.message,
        });
      } finally {
        // Cleanup temp file
        await fs.unlink(file.filepath).catch(() => {});
      }
    }

    const assignment = await Assignment.create({
      title,
      description: description || null,
      dueDate,
      batchId,
      subjectId: batch.subjectId,
      createdBy: userId,
      assignmentFile,
    });

    console.log('Assignment created:', assignment?.dataValues);

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment,
    });
  } catch (error) {
    console.error('Error in createAssignment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create Assignment by Instructor for their associated batch
exports.createInstructorAssignment = async (req, res) => {
  const form = new Formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024, keepExtensions: true });

  try {
    const [fields, files] = await form.parse(req);
    const batchId = fields.batchId ? fields.batchId[0] : (fields.courseId ? fields.courseId[0] : null);
    const title = fields.title ? fields.title[0] : null;
    const description = fields.description ? fields.description[0] : null;
    const dueDate = fields.dueDate ? fields.dueDate[0] : null;
    const instructorId = req.user.id; // from token

    if (!batchId || !title || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'batchId (or courseId), title, and dueDate are required',
      });
    }

    // Get batch and verify instructor is assigned to it
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Subject,
          attributes: ['id', 'name', 'code'],
          as: 'subject',
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Instructor must be the assigned instructor for this batch
    if (batch.instructorId !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the assigned instructor for this batch.',
      });
    }

    if (!batch.subjectId) {
      return res.status(400).json({
        success: false,
        message: 'This batch has no associated subject. Cannot create assignment.',
      });
    }

    // Check if assignment with same title already exists for this batch
    const existingAssignment = await Assignment.findOne({
      where: { title, batchId },
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: 'An assignment with this title already exists for this batch.',
        data: existingAssignment,
      });
    }

    let assignmentFile = null;

    // Handle file upload if provided
    if (files.assignmentFile && files.assignmentFile[0]) {
      const file = files.assignmentFile[0];
      const fileBuffer = await fs.readFile(file.filepath);
      const uniqueName = `assignment-${batchId}-${Date.now()}`;

      try {
        const uploadResult = await uploadImage(fileBuffer, uniqueName);
        assignmentFile = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(400).json({
          message: 'Failed to upload assignment file',
          error: uploadError.message,
        });
      } finally {
        await fs.unlink(file.filepath).catch(() => {});
      }
    }

    const assignment = await Assignment.create({
      title,
      description: description || null,
      dueDate,
      batchId,
      subjectId: batch.subjectId,
      createdBy: instructorId,
      assignmentFile,
    });

    console.log('Instructor assignment created:', assignment?.dataValues);

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment,
    });
  } catch (error) {
    console.error('Error in createInstructorAssignment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all assignments for the logged-in instructor by batch ID
exports.getInstructorAssignments = async (req, res) => {
  try {
    const instructorId = req.user.id; // from token
    const { batchId } = req.params; // from URL

    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }

    // Verify the batch exists and belongs to this instructor
    const batch = await Batch.findOne({
      where: { id: parseInt(batchId), instructorId },
      include: [
        {
          model: Subject,
          attributes: ['id', 'name', 'code', 'image'],
          as: 'subject',
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found or you are not the assigned instructor for this batch.',
      });
    }

    // Get assignments for this batch
    const assignments = await Assignment.findAll({
      where: { batchId: parseInt(batchId) },
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'code', 'sessionDate', 'sessionTime', 'instructorId', 'subjectId'],
          as: 'batch',
        },
        {
          model: Subject,
          attributes: ['id', 'name', 'code', 'image'],
          as: 'subject',
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
          foreignKey: 'createdBy',
          as: 'instructor',
        },
      ],
      order: [['createdDate', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Instructor assignments retrieved successfully',
      total: assignments.length,
      batchName: batch.name,
      batchCode: batch.code,
      subject: batch.subject,
      data: assignments,
    });
  } catch (error) {
    console.error('Error in getInstructorAssignments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Batches by Instructor ID and Subject ID
exports.getBatchesByInstructorAndSubject = async (req, res) => {
  try {
    const { instructorId, subjectId } = req.query;

    if (!instructorId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: 'instructorId and subjectId are required as query parameters',
      });
    }

    // Check if instructor exists
    const instructor = await User.findByPk(instructorId);
    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }

    // Check if subject exists
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Get batches created by the instructor for the specified subject
    const batches = await Batch.findAll({
      where: {
        createdBy: instructorId,
        subjectId: subjectId,
      },
      include: [
        {
          model: Subject,
          attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
          as: 'subject',
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
          foreignKey: 'createdBy',
          as: 'creator',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Batches retrieved successfully',
      total: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error('Error in getBatchesByInstructorAndSubject:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Assignments for a Batch
exports.getAssignmentsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const assignments = await Assignment.findAll({
      where: { batchId },
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'code'],
          as: 'batch',
        },
        {
          model: Subject,
          attributes: ['id', 'name', 'code'],
          as: 'subject',
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
          foreignKey: 'createdBy',
          as: 'instructor',
        },
      ],
      order: [['createdDate', 'DESC']],
    });

    res.status(200).json({
      success: true,
      total: assignments.length,
      batchName: batch.name,
      batchCode: batch.code,
      data: assignments,
    });
  } catch (error) {
    console.error('Error in getAssignmentsByBatch:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get Single Assignment
exports.getAssignmentById = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'code', 'sessionDate', 'sessionTime'],
          as: 'batch',
        },
        {
          model: Subject,
          attributes: ['id', 'name', 'code', 'image'],
          as: 'subject',
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
          foreignKey: 'createdBy',
          as: 'instructor',
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error('Error in getAssignmentById:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update Assignment (only creator or admin/counsellor)
exports.updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { title, description, dueDate } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await Assignment.findByPk(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only creator or admin/counsellor can update
    if (assignment.createdBy !== userId && userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;

    await assignment.save();

    console.log('Assignment updated:', assignment?.dataValues);

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment,
    });
  } catch (error) {
    console.error('Error in updateAssignment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete Assignment (only creator or admin/counsellor)
exports.deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignment = await Assignment.findByPk(assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only creator or admin/counsellor can delete
    if (assignment.createdBy !== userId && userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await assignment.destroy();

    console.log('Assignment deleted:', assignmentId);

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteAssignment:', error);
    res.status(500).json({ message: error.message });
  }
};
