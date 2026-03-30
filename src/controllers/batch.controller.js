const db = require('../models');
const User = db.User;
const Batch = db.Batch;
const QRCode = require('qrcode');
const { Formidable } = require('formidable');

// Create Batch
exports.createBatch = async (req, res) => {
  const form = new Formidable({ multiples: false, maxFileSize: 50 * 1024 * 1024, keepExtensions: true });

  try {
    const [fields, files] = await form.parse(req);

    // Extract fields from formidable
    const name = fields.name ? fields.name[0] : null;
    const code = fields.code ? fields.code[0] : null;
    const sessionDate = fields.sessionDate ? fields.sessionDate[0] : null;
    const sessionEndDate = fields.sessionEndDate ? fields.sessionEndDate[0] : null;
    const sessionTime = fields.sessionTime ? fields.sessionTime[0] : null;
    const sessionLink = fields.sessionLink ? fields.sessionLink[0] : null;
    const status = fields.status ? fields.status[0] : null;
    const numberOfStudents = fields.numberOfStudents ? parseInt(fields.numberOfStudents[0]) : 0;
    const subjectId = fields.subjectId ? parseInt(fields.subjectId[0]) : null;
    const instructorId = fields.instructorId ? parseInt(fields.instructorId[0]) : null;
    const imageFile = files.image ? files.image[0] : null;

    const userId = req.user.id;  // From authenticated User
    const userRole = req.user.role;  // Role validation

    // Only ADMIN, COUNSELLOR, and INSTRUCTOR can create batches
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR' && userRole !== 'INSTRUCTOR') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin, Counsellor, and Instructor can create batches.',
      });
    }

    console.log('Create batch request:', { name, code, subjectId, userRole, userId });

    if (!name || !code || !sessionDate || !sessionTime) {
      return res.status(400).json({
        message: 'name, code, sessionDate, and sessionTime are required',
      });
    }

    // Check if subject exists - OPTIONAL
    if (subjectId) {
      const subject = await db.Subject.findByPk(subjectId);
      if (!subject) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create batch. The specified subject does not exist. Please create or select a valid subject first.',
        });
      }
    }

    // Set approval status based on user role
    // Admin/Counsellor: always approved, cannot be overridden by request
    // Instructor: always pending
    let approvalStatus;
    if (userRole === 'ADMIN' || userRole === 'COUNSELLOR') {
      approvalStatus = 'approved';
    } else {
      approvalStatus = 'pending';
    }

    const batch = await Batch.create({
      name,
      code,
      sessionDate,
      sessionEndDate: sessionEndDate || null,
      sessionTime,
      sessionLink: sessionLink || null,
      sessionQr: null, // Will be generated after batch is created
      status: status || 'yet to start',
      numberOfStudents: numberOfStudents || 0,
      approvalStatus,
      createdBy: userId,
      instructorId: instructorId || null,
      subjectId: subjectId || null,
    });

    // Generate QR code with batch ID and store as base64
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(batch.id.toString());
      batch.sessionQr = qrCodeDataUrl;
      await batch.save();
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
      // Continue without QR code if generation fails
    }

    // Create association between instructor and subject in InstructorSubject table
    if (instructorId && subjectId) {
      try {
        // Check if association already exists
        const existingAssociation = await db.InstructorSubject.findOne({
          where: { instructorId, subjectId }
        });

        if (!existingAssociation) {
          await db.InstructorSubject.create({
            instructorId,
            subjectId
          });
          console.log('InstructorSubject association created:', { instructorId, subjectId });
        } else {
          console.log('InstructorSubject association already exists:', { instructorId, subjectId });
        }
      } catch (assocError) {
        console.error('Error creating InstructorSubject association:', assocError);
        // Continue without association if creation fails
      }
    }

    console.log('Batch created:', batch?.dataValues);

    res.status(201).json({
      success: true,
      message: approvalStatus === 'pending'
        ? 'Batch created successfully. Awaiting approval from Admin/Counsellor.'
        : 'Batch created successfully',
      approvalStatus,
      data: batch,
    });
  } catch (error) {
    console.error('Error in createBatch:', error);
    res.status(500).json({
      message: error.message,
      error: error.toString(),
    });
  }
};

// Get available batches for instructor (created by admin/counsellor)
exports.getAvailableBatches = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only instructors can view available batches
    if (userRole !== 'INSTRUCTOR') {
      return res.status(403).json({ message: 'Only instructors can view available batches' });
    }

    const batches = await Batch.findAll({
      where: {
        approvalStatus: 'approved',
      },
      attributes: { include: ['sessionQr'] },
      include: [
        {
          model: db.User,
          attributes: ['id', 'name', 'email'],
          foreignKey: 'createdBy',
          as: 'creator',
        },
        {
          model: db.Subject,
          attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
          foreignKey: 'subjectId',
          as: 'subject',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Available batches created by Admin/Counsellor',
      total: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error('Error in getAvailableBatches:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all batches (with filtering for instructors)
exports.getBatches = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    let batches;

    // Instructors can only see their own batches and approved batches
    if (userRole === 'INSTRUCTOR') {
      batches = await Batch.findAll({
        where: {
          [db.Sequelize.Op.or]: [
            { createdBy: userId }, // their own batches
            { approvalStatus: 'approved' }, // approved batches
          ],
        },
        attributes: { include: ['sessionQr'] },
        include: [
          {
            model: db.User,
            attributes: ['id', 'name', 'email'],
            foreignKey: 'createdBy',
            as: 'creator',
          },
          {
            model: db.Subject,
            attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
            foreignKey: 'subjectId',
            as: 'subject',
          },
        ],
        order: [['createdAt', 'DESC']],
      });
    } else if (userRole === 'ADMIN' || userRole === 'COUNSELLOR') {
      // Admin/Counsellor can see all batches
      batches = await Batch.findAll({
        attributes: { include: ['sessionQr'] },
        include: [
          {
            model: db.User,
            attributes: ['id', 'name', 'email'],
            foreignKey: 'createdBy',
            as: 'creator',
          },
          {
            model: db.Subject,
            attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
            foreignKey: 'subjectId',
            as: 'subject',
          },
        ],
        order: [['createdAt', 'DESC']],
      });
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({
      success: true,
      total: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error('Error in getBatches:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get batch by ID
exports.getBatchById = async (req, res) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const batch = await Batch.findByPk(batchId, {
      attributes: { include: ['sessionQr'] },
      include: [
        {
          model: db.User,
          attributes: ['id', 'name', 'email'],
          foreignKey: 'createdBy',
          as: 'creator',
        },
        {
          model: db.Subject,
          attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
          foreignKey: 'subjectId',
          as: 'subject',
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Instructors can view:
    // 1. Their own batches (any status)
    // 2. Approved batches (created by anyone)
    if (userRole === 'INSTRUCTOR') {
      if (batch.createdBy !== userId && batch.approvalStatus !== 'approved') {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    console.error('Error in getBatchById:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get Batch Details (including instructor and enrolled students)
exports.getBatchDetails = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: db.User,
          as: 'instructor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.Enquiry,
          as: 'enrolledStudents',
          attributes: ['id', 'name', 'email', 'phone', 'candidateStatus'],
          through: { attributes: [] } // Hide junction table fields
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    console.error('Error in getBatchDetails:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update Batch (instructor updates go to pending, admin/counsellor can update freely)
exports.updateBatch = async (req, res) => {
  const form = new Formidable({ multiples: false, maxFileSize: 50 * 1024 * 1024, keepExtensions: true });

  try {
    const [fields, files] = await form.parse(req);
    const { batchId } = req.params;

    // Extract fields from formidable
    const name = fields.name ? fields.name[0] : null;
    const code = fields.code ? fields.code[0] : null;
    const sessionDate = fields.sessionDate ? fields.sessionDate[0] : null;
    const sessionEndDate = fields.sessionEndDate ? fields.sessionEndDate[0] : null;
    const sessionTime = fields.sessionTime ? fields.sessionTime[0] : null;
    const sessionLink = fields.sessionLink ? fields.sessionLink[0] : null;
    const status = fields.status ? fields.status[0] : null;
    const numberOfStudents = fields.numberOfStudents ? parseInt(fields.numberOfStudents[0]) : null;
    const subjectId = fields.subjectId ? parseInt(fields.subjectId[0]) : null;
    const instructorId = fields.instructorId ? parseInt(fields.instructorId[0]) : null;
    const approvalStatus = fields.approvalStatus ? fields.approvalStatus[0] : null;
    const imageFile = files.image ? files.image[0] : null;

    const userId = req.user.id;
    const userRole = req.user.role;

    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Instructors can only update their own batches or approved batches created by admin/counsellor
    if (userRole === 'INSTRUCTOR') {
      if (batch.createdBy !== userId && batch.approvalStatus !== 'approved') {
        return res.status(403).json({
          message: 'Access denied. Only approved batches can be updated by other instructors'
        });
      }
    }

    // Update fields
    if (name) batch.name = name;
    if (code) batch.code = code;
    if (sessionDate) batch.sessionDate = sessionDate;
    if (sessionEndDate !== undefined) batch.sessionEndDate = sessionEndDate;
    if (sessionTime) batch.sessionTime = sessionTime;
    if (status) batch.status = status;
    if (numberOfStudents !== undefined) batch.numberOfStudents = numberOfStudents;
    if (sessionLink) batch.sessionLink = sessionLink;
    if (subjectId) batch.subjectId = subjectId;
    if (instructorId !== undefined) batch.instructorId = instructorId;

    // ANY instructor update requires approval
    if (userRole === 'INSTRUCTOR') {
      batch.approvalStatus = 'pending';
    } else if (approvalStatus && (userRole === 'ADMIN' || userRole === 'COUNSELLOR')) {
      batch.approvalStatus = approvalStatus;
    }

    await batch.save();

    // Regenerate QR code with batch ID and store as base64
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(batch.id.toString());
      batch.sessionQr = qrCodeDataUrl;
      await batch.save();
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
      // Continue without QR code if generation fails
    }

    // Update association between instructor and subject in InstructorSubject table
    if (instructorId !== undefined && subjectId !== undefined && instructorId && subjectId) {
      try {
        // Check if association already exists
        const existingAssociation = await db.InstructorSubject.findOne({
          where: { instructorId, subjectId }
        });

        if (!existingAssociation) {
          await db.InstructorSubject.create({
            instructorId,
            subjectId
          });
          console.log('InstructorSubject association created:', { instructorId, subjectId });
        } else {
          console.log('InstructorSubject association already exists:', { instructorId, subjectId });
        }
      } catch (assocError) {
        console.error('Error updating InstructorSubject association:', assocError);
        // Continue without association if creation fails
      }
    }

    console.log('Batch updated:', batch?.dataValues);

    res.status(200).json({
      success: true,
      message: userRole === 'INSTRUCTOR'
        ? 'Batch updated and sent for approval'
        : 'Batch updated successfully',
      data: batch,
    });
  } catch (error) {
    console.error('Error in updateBatch:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update Batch Approval Status (only admin/counsellor)
exports.updateApprovalStatus = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { approvalStatus } = req.body;
    const userRole = req.user.role;

    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({ message: 'Only Admin and Counsellor can approve/reject batches' });
    }

    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approval status. Use: approved, rejected, or pending' });
    }

    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    batch.approvalStatus = approvalStatus;
    await batch.save();

    console.log('Batch approval status updated:', batch?.dataValues);

    res.status(200).json({
      success: true,
      message: `Batch ${approvalStatus} successfully`,
      data: batch,
    });
  } catch (error) {
    console.error('Error in updateApprovalStatus:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add students to batch
exports.addStudentstoBatch = async (req, res) => {
  try {
    const { batchId, studentIds } = req.body;

    if (!batchId || !studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({
        message: 'batchId and studentIds (array of enquiry IDs) are required',
      });
    }

    const batch = await db.Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const addedStudents = [];
    const existingStudents = [];

    for (const enquiryId of studentIds) {
      // Check if student exists in Enquiry table
      const student = await db.Enquiry.findByPk(enquiryId);
      if (!student) {
        console.warn(`Student with ID ${enquiryId} not found, skipping.`);
        continue;
      }

      // Check if already in batch
      const existingEntry = await db.BatchStudent.findOne({
        where: {
          batchId,
          enquiryId,
        },
      });

      if (existingEntry) {
        existingStudents.push(enquiryId);
      } else {
        await db.BatchStudent.create({
          batchId,
          enquiryId,
        });
        addedStudents.push(enquiryId);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Students processed for batch enrollment',
      data: {
        added: addedStudents,
        existing: existingStudents,
      },
    });
  } catch (error) {
    console.error('Error in addStudentstoBatch:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get batches by subject ID for the logged-in instructor
exports.getBatchesBySubject = async (req, res) => {
  try {
    console.log('getBatchesBySubject called with user:', req.user);
    const instructorId = req.user.userId; // from token
    const { subjectId } = req.params; // from URL

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required' });
    }

    const batches = await Batch.findAll({
      where: {
        subjectId: parseInt(subjectId),
        instructorId,
      },
      attributes: { include: ['sessionQr'] },
      include: [
        {
          model: db.User,
          attributes: ['id', 'name', 'email'],
          foreignKey: 'createdBy',
          as: 'creator',
        },
        {
          model: db.Subject,
          attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
          foreignKey: 'subjectId',
          as: 'subject',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Also fetch all subjects assigned to this instructor
    const instructorSubjects = await db.Subject.findAll({
      include: [{
        model: db.User,
        as: 'instructors',
        where: { id: instructorId },
        attributes: [],
      }],
      attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
    });

    res.status(200).json({
      success: true,
      message: `Batches for subject ${subjectId} assigned to instructor`,
      totalBatches: batches.length,
      totalSubjects: instructorSubjects.length,
      batches,
      instructorSubjects,
    });
  } catch (error) {
    console.error('Error in getBatchesBySubject:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all subjects for the logged-in instructor
exports.getInstructorSubjects = async (req, res) => {
  try {
    const instructorId = req.user.id; // from token

    const subjects = await db.Subject.findAll({
      include: [{
        model: db.User,
        as: 'instructors',
        where: { id: instructorId },
        attributes: [],
      }],
      attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
    });

    res.status(200).json({
      success: true,
      message: 'Subjects assigned to instructor',
      total: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error('Error in getInstructorSubjects:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all students for enrollment (status 'class' or 'class qualified')
exports.getBatchStudentsforEnrollment = async (req, res) => {
  try {
    const students = await db.Enquiry.findAll({
      where: {
        candidateStatus: {
          [db.Sequelize.Op.in]: ['class', 'class qualified']
        }
      },
      attributes: ['id', 'name', 'email', 'phone', 'candidateStatus', 'packageId'],
      include: [
        {
          model: db.Batch,
          as: 'enrolledBatches',
          attributes: ['id', 'name'],
          through: { attributes: [] },
          required: false
        },
        {
          model: db.Package,
          as: 'package',
          attributes: ['id', 'name'],
          required: false,
          include: [
            {
              model: db.Subject,
              as: 'subjects',
              attributes: ['id', 'name'],
              through: { attributes: [] },
              required: false
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    // Format the response
    const formattedStudents = students.map(student => {
      const studentData = student.toJSON();

      return {
        id: studentData.id,
        name: studentData.name,
        email: studentData.email,
        phone: studentData.phone,
        candidateStatus: studentData.candidateStatus,
        packageId: studentData.packageId,
        enrolledBatches: studentData.enrolledBatches || [],
        packageName: studentData.package?.name || null,
        subjectNames: studentData.package?.Subjects?.map(s => s.name) || []
      };
    });

    res.status(200).json({
      success: true,
      count: formattedStudents.length,
      data: formattedStudents
    });

  } catch (error) {
    console.error('Error in getBatchStudentsforEnrollment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete Batch (only admin/counsellor can delete, instructors cannot delete)
exports.deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only admin/counsellor can delete batches
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can delete batches. Instructors must request approval to delete.'
      });
    }

    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    await batch.destroy();

    console.log('Batch deleted:', batchId);

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteBatch:', error);
    res.status(500).json({ message: error.message });
  }
};

