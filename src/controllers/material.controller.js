const db = require('../models');
const Material = db.Material;
const Batch = db.Batch;
const Subject = db.Subject;
const User = db.User;
const { Formidable } = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const { uploadImage } = require('../utils/cloudinary');

// Create Material by Instructor for their associated batch
exports.createInstructorMaterial = async (req, res) => {
  const form = new Formidable({ multiples: false, maxFileSize: 50 * 1024 * 1024, keepExtensions: true });

  try {
    const [fields, files] = await form.parse(req);
    const batchId = fields.batchId ? fields.batchId[0] : (fields.courseId ? fields.courseId[0] : null);
    // Title is optional, if not provided we'll use the filename later
    let title = fields.title ? fields.title[0] : null;
    const description = fields.description ? fields.description[0] : null;
    const instructorId = req.user.userId; // from token

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: 'batchId (or courseId) is required',
      });
    }

    // Check for file in 'file' (from frontend) or 'document' (legacy/postman)
    const uploadedFile = files.file ? files.file[0] : (files.document ? files.document[0] : null);

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'File is required',
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
        message: 'This batch has no associated subject. Cannot create material.',
      });
    }

    let documentUrl = null;
    let documentName = null;

    // Handle file upload
    const file = uploadedFile;
    const fileBuffer = await fs.readFile(file.filepath);
    const uniqueName = `material-${batchId}-${Date.now()}`;

    // If title is missing, use the original filename
    if (!title) {
      title = file.originalFilename || file.newFilename || 'Untitled Material';
    }

    try {
      const uploadResult = await uploadImage(fileBuffer, uniqueName);
      documentUrl = uploadResult.secure_url;
      documentName = file.originalFilename || file.newFilename;
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return res.status(400).json({
        message: 'Failed to upload material document',
        error: uploadError.message,
      });
    } finally {
      await fs.unlink(file.filepath).catch(() => { });
    }

    const material = await Material.create({
      title,
      description: description || null,
      batchId,
      subjectId: batch.subjectId,
      instructorId,
      documentUrl,
      documentName,
      uploadedOn: new Date(),
    });

    console.log('Instructor material created:', material?.dataValues);

    res.status(201).json({
      success: true,
      message: 'Material created successfully',
      data: material,
    });
  } catch (error) {
    console.error('Error in createInstructorMaterial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all materials for the logged-in instructor's associated batch
exports.getInstructorMaterials = async (req, res) => {
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

    // Get materials for this batch
    const materials = await Material.findAll({
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
          foreignKey: 'instructorId',
          as: 'instructor',
        },
      ],
      order: [['uploadedOn', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Instructor materials retrieved successfully',
      total: materials.length,
      batchName: batch.name,
      batchCode: batch.code,
      subject: batch.subject,
      data: materials,
    });
  } catch (error) {
    console.error('Error in getInstructorMaterials:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
