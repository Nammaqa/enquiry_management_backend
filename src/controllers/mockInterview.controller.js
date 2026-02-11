const db = require('../models');
const MockInterview = db.MockInterview;
const Enquiry = db.Enquiry;
const Batch = db.Batch;
const BatchStudent = db.BatchStudent;
const User = db.User;
const { Formidable } = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const { uploadDocument } = require('../utils/cloudinary');

// POST API: Schedule Mock Interview for Batch Students
exports.scheduleMockInterview = async (req, res) => {
  const form = new Formidable({ multiples: false, maxFileSize: 50 * 1024 * 1024, keepExtensions: true });

  try {
    const [fields, files] = await form.parse(req);

    // Extract fields from FormData
    const batchId = fields.batchId ? fields.batchId[0] : null;
    const studentName = fields.studentName ? fields.studentName[0] : null;
    const studentEmail = fields.studentEmail ? fields.studentEmail[0] : null;
    const interviewDate = fields.interviewDate ? fields.interviewDate[0] : null;
    const interviewTime = fields.interviewTime ? fields.interviewTime[0] : null;
    const mode = fields.mode ? fields.mode[0] : null;
    const interviewLink = fields.interviewLink ? fields.interviewLink[0] : null;

    // Get instructorId from authentication token
    const instructorId = req.user.userId;

    // Validate required fields
    if (!batchId || !studentEmail || !interviewDate || !interviewTime || !mode) {
      return res.status(400).json({
        success: false,
        message: 'batchId, studentEmail, interviewDate, interviewTime, and mode are required',
      });
    }

    // Validate mode
    if (!['online', 'offline'].includes(mode.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'mode must be either \"online\" or \"offline\"',
      });
    }

    // Normalize mode to lowercase
    const normalizedMode = mode.toLowerCase();

    // Validate online mode has interview link
    if (normalizedMode === 'online' && !interviewLink) {
      return res.status(400).json({
        success: false,
        message: 'interviewLink is required for online mode',
      });
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    // Find the enquiry by email
    const enquiry = await Enquiry.findOne({
      where: { email: studentEmail }
    });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Student not found with the provided email',
      });
    }

    // Check if student belongs to the batch
    const batchStudent = await BatchStudent.findOne({
      where: { batchId, enquiryId: enquiry.id }
    });

    if (!batchStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not enrolled in this batch',
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

    // Handle document upload if provided
    let documentUrl = null;
    const uploadedFile = files.document ? files.document[0] : null;

    if (uploadedFile) {
      const fileBuffer = await fs.readFile(uploadedFile.filepath);
      const uniqueName = `mock-interview-${batchId}-${enquiry.id}-${Date.now()}`;

      try {
        const uploadResult = await uploadDocument(fileBuffer, uniqueName);
        documentUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload document',
          error: uploadError.message,
        });
      } finally {
        await fs.unlink(uploadedFile.filepath).catch(() => { });
      }
    }

    // Create mock interview
    const mockInterview = await MockInterview.create({
      batchId,
      enquiryId: enquiry.id,
      instructorId,
      studentName: studentName || enquiry.name,
      studentEmail: enquiry.email,
      interviewDate,
      interviewTime,
      mode: normalizedMode,
      interviewLink: normalizedMode === 'online' ? interviewLink : null,
      documentUpload: documentUrl,
      status: 'scheduled',
    });

    res.status(201).json({
      success: true,
      message: 'Mock interview scheduled successfully',
      data: mockInterview,
    });
  } catch (error) {
    console.error('Error in scheduleMockInterview:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET API: Get all mock interviews for a specific batch
exports.getBatchMockInterviews = async (req, res) => {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: 'batchId is required',
      });
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    // Get all mock interviews for this batch
    const mockInterviews = await MockInterview.findAll({
      where: { batchId },
      include: [
        {
          model: Enquiry,
          as: 'enquiry',
          attributes: ['id', 'name', 'email', 'phone', 'candidateStatus'],
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['interviewDate', 'ASC'], ['interviewTime', 'ASC']],
    });

    res.status(200).json({
      success: true,
      message: 'Mock interviews retrieved successfully',
      total: mockInterviews.length,
      batchName: batch.name,
      batchCode: batch.code,
      data: mockInterviews,
    });
  } catch (error) {
    console.error('Error in getBatchMockInterviews:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET API: Get all students for a specific batch for mock interview scheduling
exports.getMockInterviewStudents = async (req, res) => {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: 'batchId is required',
      });
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    // Get all students enrolled in this batch
    const batchStudents = await BatchStudent.findAll({
      where: { batchId },
      include: [
        {
          model: Enquiry,
          as: 'enquiry',
          attributes: ['id', 'name', 'email', 'phone', 'candidateStatus'],
        },
      ],
      order: [[{ model: Enquiry, as: 'enquiry' }, 'name', 'ASC']],
    });

    const students = batchStudents
      .filter(bs => bs.enquiry) // Filter out any null enquiries just in case
      .map(bs => ({
        id: bs.enquiry.id,
        name: bs.enquiry.name,
        email: bs.enquiry.email,
        phone: bs.enquiry.phone,
        status: bs.enquiry.candidateStatus,
        enrolledAt: bs.createdAt
      }));

    res.status(200).json({
      success: true,
      message: 'Batch students retrieved successfully',
      total: students.length,
      batchName: batch.name,
      batchCode: batch.code,
      data: students,
    });
  } catch (error) {
    console.error('Error in getMockInterviewStudents:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT API: Update interview status (attended/not-attended)
exports.updateInterviewStatus = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { status } = req.body;

    // Validate interviewId
    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: 'interviewId is required',
      });
    }

    // Validate status
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required',
      });
    }

    const validStatuses = ['scheduled', 'attended', 'not-attended', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Find the interview
    const interview = await MockInterview.findByPk(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
      });
    }

    // Update the status
    interview.status = status;
    await interview.save();

    // Fetch the updated interview with associations
    const updatedInterview = await MockInterview.findByPk(interviewId, {
      include: [
        {
          model: Enquiry,
          as: 'enquiry',
          attributes: ['id', 'name', 'email', 'phone', 'candidateStatus'],
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'code'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Interview status updated successfully',
      data: updatedInterview,
    });
  } catch (error) {
    console.error('Error in updateInterviewStatus:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
