const { Course } = require('../models');
const { uploadImage, deleteImage } = require('../utils/cloudinary');
const { Formidable } = require('formidable');
const fs = require('fs');

/**
 * CREATE Course (ADMIN and COUNSELLOR)
 */
exports.createCourse = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can create courses
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can create courses',
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
    const getFieldValue = (field) => field ? (Array.isArray(field) ? field[0] : field) : null;
    
    const title = getFieldValue(fields.title);
    const description = getFieldValue(fields.description);
    const type = getFieldValue(fields.type);
    const duration = getFieldValue(fields.duration);
    const overview = getFieldValue(fields.overview);
    const syllabus = getFieldValue(fields.syllabus);
    const prerequisites = getFieldValue(fields.prerequisites);

    if (!title) {
      return res.status(400).json({
        message: 'title is required',
      });
    }

    let imageUrl = null;
    let imagePublicId = null;

    // Upload image if provided
    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      const fileBuffer = await fs.promises.readFile(imageFile.filepath);
      
      const uploadResult = await uploadImage(fileBuffer, `course-${Date.now()}`);
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;

      // Clean up temporary file
      await fs.promises.unlink(imageFile.filepath).catch(() => {});
    }

    const course = await Course.create({
      title,
      description: description || null,
      type: type || null,
      duration: duration || null,
      overview: overview || null,
      syllabus: syllabus || null,
      prerequisites: prerequisites || null,
      image: imageUrl,
      imagePublicId: imagePublicId,
    });

    return res.status(201).json({
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    console.error('Error creating course:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * GET ALL Courses (ALL LOGGED-IN USERS)
 */
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.findAll();

    return res.status(200).json({
      message: 'Courses retrieved successfully',
      data: courses,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * GET Course by ID (ALL LOGGED-IN USERS)
 */
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({
        message: 'Course not found',
      });
    }

    return res.status(200).json({
      message: 'Course retrieved successfully',
      data: course,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * UPDATE Course by ID (ADMIN and COUNSELLOR)
 */
exports.updateCourse = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can update courses
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can update courses',
      });
    }

    const { id } = req.params;

    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({
        message: 'Course not found',
      });
    }

    // Parse form data using formidable
    const form = new Formidable({
      multiples: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);

    // Extract field values
    const getFieldValue = (field) => field ? (Array.isArray(field) ? field[0] : field) : null;
    
    const title = getFieldValue(fields.title);
    const description = getFieldValue(fields.description);
    const type = getFieldValue(fields.type);
    const duration = getFieldValue(fields.duration);
    const overview = getFieldValue(fields.overview);
    const syllabus = getFieldValue(fields.syllabus);
    const prerequisites = getFieldValue(fields.prerequisites);

    // Update fields if provided
    if (title) course.title = title;
    if (description) course.description = description;
    if (type) course.type = type;
    if (duration) course.duration = duration;
    if (overview) course.overview = overview;
    if (syllabus) course.syllabus = syllabus;
    if (prerequisites) course.prerequisites = prerequisites;

    // Handle image upload if provided
    if (files.image && files.image.length > 0) {
      // Delete old image if exists
      if (course.imagePublicId) {
        await deleteImage(course.imagePublicId).catch(() => {});
      }

      const imageFile = files.image[0];
      const fileBuffer = await fs.promises.readFile(imageFile.filepath);
      
      const uploadResult = await uploadImage(fileBuffer, `course-${Date.now()}`);
      course.image = uploadResult.secure_url;
      course.imagePublicId = uploadResult.public_id;

      // Clean up temporary file
      await fs.promises.unlink(imageFile.filepath).catch(() => {});
    }

    await course.save();

    return res.status(200).json({
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * DELETE Course by ID (ADMIN and COUNSELLOR)
 */
exports.deleteCourse = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can delete courses
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can delete courses',
      });
    }

    const { id } = req.params;

    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({
        message: 'Course not found',
      });
    }

    // Delete image from Cloudinary if exists
    if (course.imagePublicId) {
      await deleteImage(course.imagePublicId).catch(() => {});
    }

    await course.destroy();

    return res.status(200).json({
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message,
    });
  }
};
