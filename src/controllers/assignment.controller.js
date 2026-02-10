const db = require('../models');
const Batch = db.Batch;
const Subject = db.Subject;
const Assignment = db.Assignment;
const User = db.User;
const { Formidable } = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const { uploadImage } = require('../utils/cloudinary');

// Create Assignment by Instructor for their associated batch
exports.createInstructorAssignment = async (req, res) => {
  const form = new Formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024, keepExtensions: true });

  try {
    const [fields, files] = await form.parse(req);
    const batchId = fields.batchId ? fields.batchId[0] : (fields.courseId ? fields.courseId[0] : null);
    const title = fields.title ? fields.title[0] : null;
    const description = fields.description ? fields.description[0] : null;
    const dueDate = fields.dueDate ? fields.dueDate[0] : null;
    const instructorId = req.user.userId; // from token

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
    console.log('Batch found for assignment creation:', batch.instructorId, 'Instructor ID from token:', instructorId);
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
        await fs.unlink(file.filepath).catch(() => { });
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
    const instructorId = req.user.userId; // from token
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

// Update Assignment by Instructor
exports.updateInstructorAssignment = async (req, res) => {
  const form = new Formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024, keepExtensions: true });

  try {
    const [fields, files] = await form.parse(req);
    const assignmentId = req.params.assignmentId;
    const instructorId = req.user.userId; // from token

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: 'assignmentId is required',
      });
    }

    // Find the assignment
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'code', 'instructorId'],
          as: 'batch',
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Verify the instructor owns this assignment
    if (assignment.createdBy !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the creator of this assignment.',
      });
    }

    // Verify the instructor is still assigned to the batch
    if (assignment.batch.instructorId !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the assigned instructor for this batch.',
      });
    }

    // Prepare update data
    const updateData = {};

    if (fields.title && fields.title[0]) {
      // Check if new title conflicts with another assignment in the same batch
      const existingAssignment = await Assignment.findOne({
        where: {
          title: fields.title[0],
          batchId: assignment.batchId,
          id: { [db.Sequelize.Op.ne]: assignmentId } // exclude current assignment
        },
      });

      if (existingAssignment) {
        return res.status(409).json({
          success: false,
          message: 'An assignment with this title already exists for this batch.',
        });
      }
      updateData.title = fields.title[0];
    }

    if (fields.description !== undefined) {
      updateData.description = fields.description[0] || null;
    }

    if (fields.dueDate && fields.dueDate[0]) {
      updateData.dueDate = fields.dueDate[0];
    }

    // Handle file upload if provided
    if (files.assignmentFile && files.assignmentFile[0]) {
      const file = files.assignmentFile[0];
      const fileBuffer = await fs.readFile(file.filepath);
      const uniqueName = `assignment-${assignment.batchId}-${Date.now()}`;

      try {
        const uploadResult = await uploadImage(fileBuffer, uniqueName);
        updateData.assignmentFile = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload assignment file',
          error: uploadError.message,
        });
      } finally {
        await fs.unlink(file.filepath).catch(() => { });
      }
    }

    // Update the assignment
    await assignment.update(updateData);

    // Fetch updated assignment with all associations
    const updatedAssignment = await Assignment.findByPk(assignmentId, {
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
    });

    console.log('Assignment updated:', updatedAssignment?.dataValues);

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: updatedAssignment,
    });
  } catch (error) {
    console.error('Error in updateInstructorAssignment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Assignment by Instructor
exports.deleteInstructorAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const instructorId = req.user.userId; // from token

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: 'assignmentId is required',
      });
    }

    // Find the assignment
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'code', 'instructorId'],
          as: 'batch',
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Verify the instructor owns this assignment
    if (assignment.createdBy !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the creator of this assignment.',
      });
    }

    // Verify the instructor is still assigned to the batch
    if (assignment.batch.instructorId !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the assigned instructor for this batch.',
      });
    }

    // Store assignment details before deletion for response
    const deletedAssignmentInfo = {
      id: assignment.id,
      title: assignment.title,
      batchId: assignment.batchId,
      batchName: assignment.batch.name,
    };

    // Delete the assignment
    await assignment.destroy();

    console.log('Assignment deleted:', deletedAssignmentInfo);

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully',
      data: deletedAssignmentInfo,
    });
  } catch (error) {
    console.error('Error in deleteInstructorAssignment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

