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

    let fields;
    let files = {};

    // Check if request has multipart form data or JSON
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Parse form data using formidable
      const form = new Formidable({ 
        multiples: false,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        keepExtensions: true
      });

      const [parsedFields, parsedFiles] = await form.parse(req);
      fields = parsedFields;
      files = parsedFiles;
    } else {
      // Handle JSON request body
      fields = {};
      for (const [key, value] of Object.entries(req.body)) {
        fields[key] = [value]; // Convert to array format for consistency
      }
    }

    // Extract field values (formidable returns arrays for fields)
    const name = fields.name ? (Array.isArray(fields.name) ? fields.name[0] : fields.name) : null;
    const code = fields.code ? (Array.isArray(fields.code) ? fields.code[0] : fields.code) : null;
    const description = fields.description ? (Array.isArray(fields.description) ? fields.description[0] : fields.description) : null;
    const type = fields.type ? (Array.isArray(fields.type) ? fields.type[0] : fields.type) : null;
    const duration = fields.duration ? (Array.isArray(fields.duration) ? fields.duration[0] : fields.duration) : null;
    const startDate = fields.startDate ? (Array.isArray(fields.startDate) ? fields.startDate[0] : fields.startDate) : null;
    const overview = fields.overview ? (Array.isArray(fields.overview) ? fields.overview[0] : fields.overview) : null;
    const syllabus = fields.syllabus ? (Array.isArray(fields.syllabus) ? fields.syllabus[0] : fields.syllabus) : null;
    const prerequisites = fields.prerequisites ? (Array.isArray(fields.prerequisites) ? fields.prerequisites[0] : fields.prerequisites) : null;
    const fees = fields.fees ? (Array.isArray(fields.fees) ? fields.fees[0] : fields.fees) : null;
    const domain = fields.domain ? (Array.isArray(fields.domain) ? fields.domain[0] : fields.domain) : null;
    const mode = fields.mode ? (Array.isArray(fields.mode) ? fields.mode[0] : fields.mode) : null;

    if (!name || !code) {
      return res.status(400).json({
        message: 'name and code are required',
      });
    }

    // Validate type field
    if (type && !['starter', 'advance', 'expert'].includes(type)) {
      return res.status(400).json({
        message: 'type must be one of: starter, advance, expert',
      });
    }

    // Validate duration is a number
    if (duration !== null && duration !== undefined && isNaN(duration)) {
      return res.status(400).json({
        message: 'duration must be a valid number',
      });
    }

    let imageUrl = null;

    // Upload image if provided
    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      const fileBuffer = await fs.promises.readFile(imageFile.filepath);

      const uploadResult = await uploadImage(fileBuffer, `subject-${Date.now()}`);
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;

      // Clean up temporary file
      await fs.promises.unlink(imageFile.filepath).catch(() => { });
    }

    const subject = await Subject.create({
      name,
      code,
      description,
      type,
      duration: duration ? parseInt(duration) : null,
      startDate: startDate || null,
      image: imageUrl,
      overview: safeJsonParse(overview),
      syllabus: safeJsonParse(syllabus),
      prerequisites: safeJsonParse(prerequisites),
      fees: fees || null,
      domain,
      mode,
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
      attributes: ['id', 'name', 'code', 'description', 'type', 'duration', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate', 'fees', 'domain', 'mode', 'createdAt', 'updatedAt'],
      include: {
        model: require('../models').Package,
        as: 'packages',
        attributes: ['id', 'name', 'code', 'fees'],
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
 * GET subjects by instructor ID from token (ALL ROLES)
 */
exports.getSubjectsByInstructor = async (req, res) => {
  try {
    console.log('getSubjectsByInstructor called with user:', req.user);
    const instructorId = req.user.userId;
    const db = require('../models');
    const { InstructorSubject, Subject, Package: PackageModel } = db;

    console.log('Fetching subjects for instructorId:', instructorId);
    console.log('InstructorSubject model exists:', !!InstructorSubject);

    // Find all instructor-subject associations for this instructor
    const instructorSubjects = await InstructorSubject.findAll({
      where: { instructorId: instructorId },
      attributes: ['subjectId'],
      raw: true,
    });

    console.log('InstructorSubjects found:', instructorSubjects);

    if (instructorSubjects.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No subjects found for this instructor',
        data: [],
      });
    }

    // Extract subject IDs
    const subjectIds = instructorSubjects.map(item => item.subjectId);
    console.log('Subject IDs:', subjectIds);

    // Find all subjects with those IDs
    const subjects = await Subject.findAll({
      where: { id: subjectIds },
      attributes: ['id', 'name', 'code', 'description', 'type', 'duration', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate', 'fees', 'createdAt', 'updatedAt'],
      include: [
        {
          model: PackageModel,
          as: 'packages',
          attributes: ['id', 'name', 'code', 'fees'],
          through: { attributes: [] },
        },
      ],
    });

    console.log('Subjects found:', subjects.length);

    res.status(200).json({
      success: true,
      message: 'Subjects retrieved successfully',
      total: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error('Error in getSubjectsByInstructor:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * GET subject by ID (ALL ROLES)
 */
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findByPk(req.params.id, {
      attributes: ['id', 'name', 'code', 'description', 'type', 'duration', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate', 'fees', 'createdAt', 'updatedAt'],
      include: {
        model: require('../models').Package,
        as: 'packages',
        attributes: ['id', 'name', 'code', 'fees'],
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

    let fields;
    let files = {};

    // Check if request has multipart form data or JSON
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Parse form data using formidable
      const form = new Formidable({ 
        multiples: false,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        keepExtensions: true
      });

      const [parsedFields, parsedFiles] = await form.parse(req);
      fields = parsedFields;
      files = parsedFiles;
    } else {
      // Handle JSON request body
      fields = {};
      for (const [key, value] of Object.entries(req.body)) {
        fields[key] = [value]; // Convert to array format for consistency
      }
    }

    // Extract field values (formidable returns arrays for fields)
    const name = fields.name ? (Array.isArray(fields.name) ? fields.name[0] : fields.name) : null;
    const code = fields.code ? (Array.isArray(fields.code) ? fields.code[0] : fields.code) : null;
    const description = fields.description ? (Array.isArray(fields.description) ? fields.description[0] : fields.description) : null;
    const type = fields.type ? (Array.isArray(fields.type) ? fields.type[0] : fields.type) : null;
    const duration = fields.duration ? (Array.isArray(fields.duration) ? fields.duration[0] : fields.duration) : null;
    const startDate = fields.startDate ? (Array.isArray(fields.startDate) ? fields.startDate[0] : fields.startDate) : null;
    const overview = fields.overview ? (Array.isArray(fields.overview) ? fields.overview[0] : fields.overview) : null;
    const syllabus = fields.syllabus ? (Array.isArray(fields.syllabus) ? fields.syllabus[0] : fields.syllabus) : null;
    const prerequisites = fields.prerequisites ? (Array.isArray(fields.prerequisites) ? fields.prerequisites[0] : fields.prerequisites) : null;
    const fees = fields.fees ? (Array.isArray(fields.fees) ? fields.fees[0] : fields.fees) : null;
    const domain = fields.domain ? (Array.isArray(fields.domain) ? fields.domain[0] : fields.domain) : null;
    const mode = fields.mode ? (Array.isArray(fields.mode) ? fields.mode[0] : fields.mode) : null;

    // Validate type field
    if (type && !['starter', 'advance', 'expert'].includes(type)) {
      return res.status(400).json({
        message: 'type must be one of: starter, advance, expert',
      });
    }

    // Validate duration is a number
    if (duration !== null && duration !== undefined && isNaN(duration)) {
      return res.status(400).json({
        message: 'duration must be a valid number',
      });
    }

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
      await fs.promises.unlink(imageFile.filepath).catch(() => { });
    }

    await subject.update({
      name: name || subject.name,
      code: code || subject.code,
      description: description !== undefined && description !== null ? description : subject.description,
      type: type !== undefined && type !== null ? type : subject.type,
      duration: duration !== undefined && duration !== null ? parseInt(duration) : subject.duration,
      startDate: startDate || subject.startDate,
      image: imageUrl,
      overview: overview !== undefined ? safeJsonParse(overview) : subject.overview,
      syllabus: syllabus !== undefined ? safeJsonParse(syllabus) : subject.syllabus,
      prerequisites: prerequisites !== undefined ? safeJsonParse(prerequisites) : subject.prerequisites,
      fees: fees !== undefined ? fees : subject.fees,
      domain: domain !== undefined && domain !== null ? domain : subject.domain,
      mode: mode !== undefined && mode !== null ? mode : subject.mode,
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

/**
 * GET subject fees by IDs list (ALL ROLES)
 */
exports.getSubjectFeesByIds = async (req, res) => {
  try {
    let subjectIds = [];

    // Get IDs from query params or request body
    if (req.query.ids) {
      // Handle query string: ?ids=1,2,3 or ?ids=1&ids=2&ids=3
      if (Array.isArray(req.query.ids)) {
        subjectIds = req.query.ids.map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id));
      } else if (typeof req.query.ids === 'string') {
        subjectIds = req.query.ids
          .split(',')
          .map(id => parseInt(id.trim(), 10))
          .filter(id => !Number.isNaN(id));
      }
    } else if (req.body.ids) {
      // Handle request body: { "ids": [1, 2, 3] }
      if (Array.isArray(req.body.ids)) {
        subjectIds = req.body.ids.map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id));
      }
    }

    if (!subjectIds || subjectIds.length === 0) {
      return res.status(400).json({
        message: 'At least one subject ID is required'
      });
    }

    const subjects = await Subject.findAll({
      where: {
        id: subjectIds
      },
      attributes: ['id', 'name', 'code', 'fees']
    });

    if (subjects.length === 0) {
      return res.status(404).json({
        message: 'No subjects found with the provided IDs'
      });
    }

    return res.status(200).json({
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

//formidable functions are async