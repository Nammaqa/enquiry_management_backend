const { Subject } = require('../models');
const { uploadImage, deleteImage, updateImage } = require('../utils/cloudinary');
const { Formidable } = require('formidable');
const fs = require('fs');

/**
 * Helper function to safely parse JSON strings
 */
const safeJsonParse = (data) => {
  if (!data) return null;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
};

/**
 * CREATE Subject (ADMIN and COUNSELLOR)
 */
exports.createSubject = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can create subjects
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can create subjects',
      });
    }

    // Parse form data using formidable
    const form = new Formidable({ 
      multiples: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);

    // Extract field values (formidable returns arrays for fields)
    const name = fields.name ? fields.name[0] : null;
    const code = fields.code ? fields.code[0] : null;
    const startDate = fields.startDate ? fields.startDate[0] : null;
    const overview = fields.overview ? fields.overview[0] : null;
    const syllabus = fields.syllabus ? fields.syllabus[0] : null;
    const prerequisites = fields.prerequisites ? fields.prerequisites[0] : null;
  

    if (!name || !code) {
      return res.status(400).json({
        message: 'name and code are required',
      });
    }

    let imageUrl = null;
    let imagePublicId = null;

    // Upload image if provided
    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      const fileBuffer = await fs.promises.readFile(imageFile.filepath);
      
      const uploadResult = await uploadImage(fileBuffer, `subject-${Date.now()}`);
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;

      // Clean up temporary file
      await fs.promises.unlink(imageFile.filepath).catch(() => {});
    }

    const subject = await Subject.create({ 
      name, 
      code,
      startDate: startDate || null,
      image: imageUrl,
      overview: safeJsonParse(overview),
      syllabus: safeJsonParse(syllabus),
      prerequisites: safeJsonParse(prerequisites),
    });

    res.status(201).json({
      message: 'Subject created successfully',
      subject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET all subjects (ALL ROLES)
 */
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.findAll({
      attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate', 'createdAt', 'updatedAt'],
      include: {
        model: require('../models').Package,
        attributes: ['id', 'name', 'code'],
        through: { attributes: [] },
      },
    });
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET subject by ID (ALL ROLES)
 */
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id, {
      attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate', 'createdAt', 'updatedAt'],
      include: {
        model: require('../models').Package,
        attributes: ['id', 'name', 'code'],
        through: { attributes: [] },
      },
    });

    if (!subject) {
      return res.status(404).json({
        message: 'Subject not found',
      });
    }

    res.json(subject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * UPDATE subject (ADMIN and COUNSELLOR)
 */
exports.updateSubject = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can update subjects
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can update subjects',
      });
    }

    const subject = await Subject.findByPk(req.params.id);

    if (!subject) {
      return res.status(404).json({
        message: 'Subject not found',
      });
    }

    // Parse form data using formidable
    const form = new Formidable({ 
      multiples: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);

    // Extract field values (formidable returns arrays for fields)
    const name = fields.name ? fields.name[0] : null;
    const code = fields.code ? fields.code[0] : null;
    const startDate = fields.startDate ? fields.startDate[0] : null;
    const overview = fields.overview ? fields.overview[0] : null;
    const syllabus = fields.syllabus ? fields.syllabus[0] : null;
    const prerequisites = fields.prerequisites ? fields.prerequisites[0] : null;

    let imageUrl = subject.image;

    // Handle image update
    if (files.image && files.image.length > 0) {
      // If old image exists, delete it
      if (subject.image) {
        const publicId = subject.image.split('/').pop().split('.')[0];
        await deleteImage(`enquiry_system/${publicId}`);
      }

      const imageFile = files.image[0];
      const fileBuffer = await fs.promises.readFile(imageFile.filepath);
      
      const uploadResult = await uploadImage(fileBuffer, `subject-${Date.now()}`);
      imageUrl = uploadResult.secure_url;

      // Clean up temporary file
      await fs.promises.unlink(imageFile.filepath).catch(() => {});
    }

    await subject.update({
      name: name || subject.name,
      code: code || subject.code,
      startDate: startDate || subject.startDate,
      image: imageUrl,
      overview: overview !== undefined ? safeJsonParse(overview) : subject.overview,
      syllabus: syllabus !== undefined ? safeJsonParse(syllabus) : subject.syllabus,
      prerequisites: prerequisites !== undefined ? safeJsonParse(prerequisites) : subject.prerequisites,
    });

    res.json({
      message: 'Subject updated successfully',
      subject,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE subject (ADMIN and COUNSELLOR)
 */
exports.deleteSubject = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can delete subjects
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can delete subjects',
      });
    }

    const subject = await Subject.findByPk(req.params.id);

    if (!subject) {
      return res.status(404).json({
        message: 'Subject not found',
      });
    }

    // Delete image from Cloudinary if it exists
    if (subject.image) {
      const publicId = subject.image.split('/').pop().split('.')[0];
      await deleteImage(`enquiry_system/${publicId}`);
    }

    await subject.destroy();

    res.json({
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
//formidable functions are async