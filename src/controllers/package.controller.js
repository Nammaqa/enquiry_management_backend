const { Package, Subject } = require('../models');
const { uploadImage, deleteImage } = require('../utils/cloudinary');
const { Formidable } = require('formidable');
const fs = require('fs');

const safeJsonParse = (data) => {
  if (data === undefined || data === null) return null;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
};

const getFieldValue = (field) => {
  if (field === undefined || field === null) return null;
  if (Array.isArray(field)) return field[0];
  return field;
};

const parseSubjectIds = (value) => {
  if (value === undefined || value === null) return null;
  let parsed = getFieldValue(value);
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      parsed = parsed.split(',').map((id) => Number(id.trim())).filter(Boolean);
    }
  }
  return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => !Number.isNaN(id)) : null;
};

/**
 * CREATE Package (ADMIN and COUNSELLOR)
 */
exports.createPackage = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can create packages
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can create packages',
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
    const name = getFieldValue(fields.name);
    const code = getFieldValue(fields.code);
    const startDate = getFieldValue(fields.startDate);
    const overview = getFieldValue(fields.overview);
    const syllabus = getFieldValue(fields.syllabus);
    const prerequisites = getFieldValue(fields.prerequisites);
    const subjectIds = parseSubjectIds(fields.subjectIds);

    if (!name || !code) {
      return res.status(400).json({
        message: 'name and code are required',
      });
    }

    let imageUrl = null;

    // Upload image if provided
    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      const fileBuffer = await fs.promises.readFile(imageFile.filepath);
      const uploadResult = await uploadImage(fileBuffer, `package-${Date.now()}`);
      imageUrl = uploadResult.secure_url;
      await fs.promises.unlink(imageFile.filepath).catch(() => {});
    }

    // Validate subjects if provided
    let subjectsArray = [];
    if (subjectIds) {
      if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
        return res.status(400).json({ message: 'subjectIds must be a non-empty array' });
      }
      const foundSubjects = await Subject.findAll({ where: { id: subjectIds } });
      if (foundSubjects.length !== subjectIds.length) {
        return res.status(404).json({ message: 'One or more subjects not found' });
      }
      subjectsArray = subjectIds;
    }

    const pkg = await Package.create({
      name,
      code,
      startDate: startDate || null,
      image: imageUrl,
      overview: safeJsonParse(overview),
      syllabus: safeJsonParse(syllabus),
      prerequisites: safeJsonParse(prerequisites),
    });

    if (subjectsArray.length > 0) {
      await pkg.setSubjects(subjectsArray);
    }

    // Fetch with subjects for response
    const pkgWithSubjects = await Package.findByPk(pkg.id, {
      include: {
        model: Subject,
        as: 'subjects',
        attributes: ['id', 'name', 'code'],
        through: { attributes: [] },
      },
    });

    return res.status(201).json({
      message: 'Package created successfully',
      package: pkgWithSubjects,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET all packages (ALL ROLES)
 */
exports.getAllPackages = async (req, res) => {
  try {
    const packages = await Package.findAll({
      include: {
        model: Subject,
        as: 'subjects',
        attributes: ['id', 'name', 'code'],
        through: { attributes: [] },
      },
    });
    return res.status(200).json(packages);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET package by ID (ALL ROLES)
 */
exports.getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id, {
      include: {
        model: Subject,
        as: 'subjects',
        attributes: ['id', 'name', 'code'],
        through: { attributes: [] },
      },
    });

    if (!pkg) {
      return res.status(404).json({
        message: 'Package not found',
      });
    }

    return res.status(200).json(pkg);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * UPDATE package (ADMIN and COUNSELLOR)
 */
exports.updatePackage = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can update packages
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can update packages',
      });
    }

    const pkg = await Package.findByPk(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        message: 'Package not found',
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
    const name = getFieldValue(fields.name);
    const code = getFieldValue(fields.code);
    const startDate = getFieldValue(fields.startDate);
    const overview = getFieldValue(fields.overview);
    const syllabus = getFieldValue(fields.syllabus);
    const prerequisites = getFieldValue(fields.prerequisites);
    const subjectIds = parseSubjectIds(fields.subjectIds);

    let imageUrl = pkg.image;

    // Handle image update
    if (files.image && files.image.length > 0) {
      // Delete old image if it exists
      if (pkg.image) {
        const publicId = pkg.image.split('/').pop().split('.')[0];
        await deleteImage(`enquiry_system/${publicId}`);
      }

      const imageFile = files.image[0];
      const fileBuffer = await fs.promises.readFile(imageFile.filepath);
      const uploadResult = await uploadImage(fileBuffer, `package-${Date.now()}`);
      imageUrl = uploadResult.secure_url;
      await fs.promises.unlink(imageFile.filepath).catch(() => {});

      // Delete old image if it exists
      if (pkg.image) {
        try {
          const publicId = pkg.image.split('/').pop().split('.')[0];
          await deleteImage(`enquiry_system/${publicId}`);
        } catch (imageDeleteError) {
          console.warn('Warning: Failed to delete old image from Cloudinary:', imageDeleteError.message);
          // Continue with update even if old image deletion fails
        }
      }
    }

    // Validate and update subjects if provided
    if (subjectIds) {
      if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
        return res.status(400).json({ message: 'subjectIds must be a non-empty array' });
      }
      const foundSubjects = await Subject.findAll({ where: { id: subjectIds } });
      if (foundSubjects.length !== subjectIds.length) {
        return res.status(404).json({ message: 'One or more subjects not found' });
      }
      await pkg.setSubjects(subjectIds);
    }

    await pkg.update({
      name: name || pkg.name,
      code: code || pkg.code,
      startDate: startDate || pkg.startDate,
      image: imageUrl,
      overview: overview !== undefined ? safeJsonParse(overview) : pkg.overview,
      syllabus: syllabus !== undefined ? safeJsonParse(syllabus) : pkg.syllabus,
      prerequisites: prerequisites !== undefined ? safeJsonParse(prerequisites) : pkg.prerequisites,
    });

    // Fetch with subjects for response
    const pkgWithSubjects = await Package.findByPk(pkg.id, {
      include: {
        model: Subject,
        as: 'subjects',
        attributes: ['id', 'name', 'code'],
        through: { attributes: [] },
      },
    });

    return res.status(200).json({
      message: 'Package updated successfully',
      package: pkgWithSubjects,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE package (ADMIN and COUNSELLOR)
 */
exports.deletePackage = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can delete packages
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can delete packages',
      });
    }

    const pkg = await Package.findByPk(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        message: 'Package not found',
      });
    }

    // Delete image from Cloudinary if it exists (non-blocking)
    if (pkg.image) {
      try {
        const publicId = pkg.image.split('/').pop().split('.')[0];
        await deleteImage(`enquiry_system/${publicId}`);
      } catch (imageDeleteError) {
        console.warn('Warning: Failed to delete image from Cloudinary:', imageDeleteError.message);
        // Continue with package deletion even if image deletion fails
      }
    }

    try {
      const db = require('../models');
      
      // Step 1: Clear all enquiries that reference this package (SET packageId to NULL)
      // This removes the foreign key constraint blocking deletion
      await db.sequelize.query(
        'UPDATE enquiries SET "packageId" = NULL WHERE "packageId" = ?',
        { replacements: [pkg.id] }
      );

      // Step 2: Clear all associated PackageSubjects
      await pkg.setSubjects([]);
      
      // Step 3: Destroy the package record
      await pkg.destroy();
    } catch (destroyError) {
      console.error('Error destroying package record:', destroyError.message, destroyError.stack);
      throw destroyError;
    }

    return res.status(200).json({
      message: 'Package deleted successfully',
    });
  } catch (error) {
    console.error('Error in deletePackage:', error.message, error.stack);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message 
      
    });
  }
};