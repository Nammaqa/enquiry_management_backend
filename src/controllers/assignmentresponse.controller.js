const db = require('../models');
const { uploadImage } = require('../utils/cloudinary');
const { Formidable } = require('formidable');
const fs = require('fs');

const AssignmentResponse = db.AssignmentResponse;
const Assignment = db.Assignment;
const Batch = db.Batch;
const Enquiry = db.Enquiry;

/**
 * CREATE Assignment Response (STUDENTS/ENQUIRIES)
 * POST /api/assignment-responses
 * Supports multiple file uploads.
 */
exports.createAssignmentResponse = async (req, res) => {
  try {
    // Parse form data using formidable
    const form = new Formidable({
      multiples: true, // Allow multiple files
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);

    // Extract field values (formidable returns arrays for fields)
    const assignmentId = fields.assignmentId ? fields.assignmentId[0] : null;
    const batchId = fields.batchId ? fields.batchId[0] : null;
    const enquiryId = req.enquiry?.enquiryId; // Get from student token middleware
    const submissionNotes = fields.submissionNotes ? fields.submissionNotes[0] : null;

    // Validate required fields
    if (!assignmentId || !batchId) {
      return res.status(400).json({
        message: 'assignmentId and batchId are required',
      });
    }

    if (!enquiryId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if assignment exists
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Handle multiple file uploads to Cloudinary
    let submissionFileUrls = [];

    // Normalise files to an array (formidable can return a single object or an array)
    const uploadedFiles = files.submissionFiles || [];
    const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

    if (filesArray.length > 0 && filesArray[0] !== undefined) {
      const uploadPromises = filesArray.map(async (file, index) => {
        try {
          const fileBuffer = await fs.promises.readFile(file.filepath);
          const fileName = `assignment-response-${assignmentId}-${enquiryId}-${Date.now()}-${index}`;
          const uploadResult = await uploadImage(fileBuffer, fileName);

          // Cleanup local temp file
          await fs.promises.unlink(file.filepath).catch(() => { });

          return {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id // e.g., "enquiry_system/filename"
          };
        } catch (error) {
          console.error(`Error uploading file ${index}:`, error);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      submissionFileUrls = results.filter(item => item !== null);
    }

    // Create assignment response record
    const response = await AssignmentResponse.create({
      assignmentId,
      batchId,
      enquiryId,
      submissionNotes: submissionNotes || null,
      submissionFiles: submissionFileUrls, // Store array of {url, publicId} as JSON
      status: 'submitted',
      submittedOn: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Assignment response submitted successfully',
      data: response,
    });
  } catch (error) {
    console.error('Error in createAssignmentResponse:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET Student's Assignment Submissions
 * GET /api/assignment-responses/my-submissions
 */
exports.getStudentSubmissions = async (req, res) => {
  try {
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { assignmentId, batchId } = req.query;

    const where = { enquiryId };
    if (assignmentId) where.assignmentId = assignmentId;
    if (batchId) where.batchId = batchId;

    const submissions = await AssignmentResponse.findAll({
      where,
      include: [
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'description', 'dueDate']
        },
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['submittedOn', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    console.error('Error in getStudentSubmissions:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * UPDATE Student's Assignment Submission
 * PUT /api/assignment-responses/:id
 * Allows updating notes and replacing files.
 */
exports.updateStudentSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const submission = await AssignmentResponse.findOne({
      where: { id, enquiryId }
    });

    console.log(`DEBUG: updateStudentSubmission - Searching for id: ${id}, enquiryId: ${enquiryId}`);

    if (!submission) {
      console.log(`DEBUG: updateStudentSubmission - Submission NOT found for id: ${id}, enquiryId: ${enquiryId}`);
      return res.status(404).json({ message: 'Submission not found or unauthorized' });
    }

    // Prevent editing if already reviewed
    if (submission.status === 'reviewed') {
      return res.status(400).json({ message: 'Cannot edit an assignment that has already been reviewed' });
    }

    // Parse form data
    const form = new Formidable({
      multiples: true,
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);
    const submissionNotes = fields.submissionNotes ? fields.submissionNotes[0] : null;

    let updateData = {};
    if (submissionNotes) updateData.submissionNotes = submissionNotes;

    // Handle file updates (replaces old files if new ones are provided)
    const uploadedFiles = files.submissionFiles || [];
    const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

    if (filesArray.length > 0 && filesArray[0] !== undefined) {
      // 1. Delete old files from Cloudinary
      if (submission.submissionFiles && Array.isArray(submission.submissionFiles)) {
        const { deleteImage } = require('../utils/cloudinary');
        for (const fileObj of submission.submissionFiles) {
          if (fileObj.publicId) {
            await deleteImage(fileObj.publicId).catch(err => {
              console.error('Error deleting old file from Cloudinary:', err);
            });
          }
        }
      }

      // 2. Upload new files
      const uploadPromises = filesArray.map(async (file, index) => {
        try {
          const fileBuffer = await fs.promises.readFile(file.filepath);
          const fileName = `assignment-response-${submission.assignmentId}-${enquiryId}-${Date.now()}-${index}`;
          const uploadResult = await uploadImage(fileBuffer, fileName);
          await fs.promises.unlink(file.filepath).catch(() => { });
          return {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
          };
        } catch (error) {
          console.error(`Error uploading file ${index}:`, error);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      updateData.submissionFiles = results.filter(item => item !== null);
    }

    await submission.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Submission updated successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error in updateStudentSubmission:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * DELETE Student's Assignment Submission
 * DELETE /api/assignment-responses/:id
 */
exports.deleteStudentSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const submission = await AssignmentResponse.findOne({
      where: { id, enquiryId }
    });

    console.log(`DEBUG: deleteStudentSubmission - Searching for id: ${id}, enquiryId: ${enquiryId}`);

    if (!submission) {
      console.log(`DEBUG: deleteStudentSubmission - Submission NOT found for id: ${id}, enquiryId: ${enquiryId}`);
      return res.status(404).json({ message: 'Submission not found or unauthorized' });
    }

    // Prevent deletion if already reviewed
    if (submission.status === 'reviewed') {
      return res.status(400).json({ message: 'Cannot delete an assignment that has already been reviewed' });
    }

    // 1. Delete all associated files from Cloudinary
    if (submission.submissionFiles && Array.isArray(submission.submissionFiles)) {
      const { deleteImage } = require('../utils/cloudinary');
      for (const fileObj of submission.submissionFiles) {
        if (fileObj.publicId) {
          await deleteImage(fileObj.publicId).catch(err => {
            console.error('Error deleting file from Cloudinary:', err);
          });
        }
      }
    }

    // 2. Delete database record
    await submission.destroy();

    res.status(200).json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteStudentSubmission:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
