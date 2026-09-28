const db = require('../models');
const { uploadImage, uploadDocument } = require('../utils/cloudinary');
const { Formidable } = require('formidable');
const fs = require('fs');
const path = require('path');

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
    let assignmentId, batchId, submissionNotes, filesArray = [];
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      let submissionNotes, filesArray = [];
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      const form = new Formidable({
        multiples: true,
        maxFileSize: 10 * 1024 * 1024,
        keepExtensions: true
      });

      const [fields, files] = await form.parse(req);
      submissionNotes = fields.submissionNotes ? fields.submissionNotes[0] : null;

      const uploadedFiles = files.submissionFiles || [];
      filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    } else {
      submissionNotes = req.body.submissionNotes;
    }

    let updateData = {};
    if (submissionNotes) updateData.submissionNotes = submissionNotes;

    // Handle file updates (replaces old files if new ones are provided)
    // filesArray is already prepared

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
          const ext = path.extname(file.originalFilename || file.newFilename || '');
          const fileName = `assignment-response-${submission.assignmentId}-${enquiryId}-${Date.now()}-${index}${ext}`;
          const uploadResult = await uploadDocument(fileBuffer, fileName);
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


/**
 * GET All Assignment Responses (Instructors/Admins)
 * GET /api/assignment-responses?assignmentId=X&batchId=Y
 */
exports.getAllResponses = async (req, res) => {
  try {
    const { assignmentId, batchId } = req.query;

    const where = {};
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
        },
        {
          model: Enquiry,
          as: 'enquiry',
          attributes: ['id', 'name', 'email', 'phone']
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
    console.error('Error in getAllResponses:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
