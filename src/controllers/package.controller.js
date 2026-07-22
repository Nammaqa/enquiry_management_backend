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

    let name, code, description, type, duration, startDate, packageType, overview, syllabus, prerequisites, subjectIds, domain, mode, imageUrl = null;

    // Check if request has files (multipart/form-data) or is JSON
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Handle multipart form data with formidable
      const form = new Formidable({
        multiples: false,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        keepExtensions: true
      });

      const [fields, files] = await form.parse(req);

      // Extract field values
      name = getFieldValue(fields.name);
      code = getFieldValue(fields.code);
      description = getFieldValue(fields.description);
      type = getFieldValue(fields.type);
      duration = getFieldValue(fields.duration);
      startDate = getFieldValue(fields.startDate);
      packageType = getFieldValue(fields.packageType);
      overview = getFieldValue(fields.overview);
      syllabus = getFieldValue(fields.syllabus);
      prerequisites = getFieldValue(fields.prerequisites);
      domain = getFieldValue(fields.domain);
      mode = getFieldValue(fields.mode);
      subjectIds = parseSubjectIds(fields.subjectIds);

      // Handle image upload if provided
      if (files.image && files.image[0]) {
      const imageFile = files.image[0];

      const fileBuffer = await fs.promises.readFile(imageFile.filepath);

      const uploadResult = await uploadImage(
        fileBuffer,
        `package-${Date.now()}`
      );

      imageUrl = uploadResult.secure_url;

      await fs.promises.unlink(imageFile.filepath).catch(() => {});
    }
    } else {
      // Handle JSON request
      const { name: reqName, code: reqCode, description: reqDescription, type: reqType, duration: reqDuration, startDate: reqStartDate, packageType: reqPackageType, overview: reqOverview, syllabus: reqSyllabus, prerequisites: reqPrerequisites, domain: reqDomain, mode: reqMode, subjectIds: reqSubjectIds } = req.body;
      name = reqName;
      code = reqCode;
      description = reqDescription;
      type = reqType;
      duration = reqDuration;
      startDate = reqStartDate;
      packageType = reqPackageType;
      overview = reqOverview;
      syllabus = reqSyllabus;
      prerequisites = reqPrerequisites;
      domain = reqDomain;
      mode = reqMode;
      subjectIds = reqSubjectIds;
    }

    if (!name || !code) {
      return res.status(400).json({
        message: 'name and code are required',
      });
    }

    // Check if code is unique
    const existingPackage = await Package.findOne({ where: { code } });
    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: 'Package code already exists. It must be unique.',
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

    // Validate packageType - use default 'standard' if not provided
    const finalPackageType = packageType || 'standard';
    if (!['standard', 'others'].includes(finalPackageType)) {
      return res.status(400).json({
        message: 'packageType must be either "standard" or "others"',
      });
    }

    // If packageType is 'others', subjectIds must be provided and not empty
    if (finalPackageType === 'others') {
      if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
        return res.status(400).json({
          message: 'When packageType is "others", subjectIds must be provided as a non-empty array',
        });
      }
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
      description,
      type,
      duration: duration ? parseInt(duration) : null,
      startDate: startDate || null,
      packageType: finalPackageType,
      domain,
      mode,
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
      attributes: ['id', 'name', 'code', 'description', 'type', 'duration', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate', 'domain', 'mode', 'createdAt', 'updatedAt'],
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
      attributes: ['id', 'name', 'code', 'description', 'type', 'duration', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate', 'domain', 'mode', 'createdAt', 'updatedAt'],
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
  const startTime = Date.now();
  const transaction = await Package.sequelize.transaction();

  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can update packages
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      await transaction.rollback();
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can update packages',
      });
    }

    const pkg = await Package.findByPk(req.params.id, { transaction });

    if (!pkg) {
      await transaction.rollback();
      return res.status(404).json({
        message: 'Package not found',
      });
    }

    let updateData = {};
    let subjectIds = null;
    let imageUrl = pkg.image;

    // Check if request has files (multipart/form-data) or is JSON
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Handle multipart form data with formidable
      const form = new Formidable({
        multiples: false,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        keepExtensions: true
      });

      const [fields, files] = await form.parse(req);

      // Extract field values
      const name = getFieldValue(fields.name);
      const code = getFieldValue(fields.code);
      const description = getFieldValue(fields.description);
      const type = getFieldValue(fields.type);
      const duration = getFieldValue(fields.duration);
      const startDate = getFieldValue(fields.startDate);
      const packageType = getFieldValue(fields.packageType);
      const overview = getFieldValue(fields.overview);
      const syllabus = getFieldValue(fields.syllabus);
      const prerequisites = getFieldValue(fields.prerequisites);
      const domain = getFieldValue(fields.domain);
      const mode = getFieldValue(fields.mode);
      subjectIds = parseSubjectIds(fields.subjectIds);

      // Validate packageType if provided
      if (packageType && !['standard', 'others'].includes(packageType)) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'packageType must be either "standard" or "others"',
        });
      }

      // Validate type field
      if (type && !['starter', 'advance', 'expert'].includes(type)) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'type must be one of: starter, advance, expert',
        });
      }

      // Validate duration is a number
      if (duration !== null && duration !== undefined && isNaN(duration)) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'duration must be a valid number',
        });
      }

      // If packageType is being changed to 'others', ensure subjectIds are provided
      if (packageType === 'others' && (!subjectIds || subjectIds.length === 0)) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'When packageType is "others", subjectIds must be provided as a non-empty array',
        });
      }

      // Handle image update
      if (files.image && files.image.length > 0) {
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
          }
        }
      }

      // Build update data
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
      if (startDate !== undefined) updateData.startDate = startDate;
      if (packageType !== undefined) updateData.packageType = packageType;
      if (overview !== undefined) updateData.overview = safeJsonParse(overview);
      if (syllabus !== undefined) updateData.syllabus = safeJsonParse(syllabus);
      if (prerequisites !== undefined) updateData.prerequisites = safeJsonParse(prerequisites);
      if (domain !== undefined) updateData.domain = domain;
      if (mode !== undefined) updateData.mode = mode;
      updateData.image = imageUrl;

    } else {
      // Handle JSON request body
      const { name, code, description, type, duration, startDate, overview, syllabus, prerequisites, domain, mode, subjectIds: subjIds } = req.body;
      subjectIds = subjIds;

      // Validate packageType if provided (need to get from req.body)
      const packageType = req.body.packageType;

      // Validate packageType if provided
      if (packageType && !['standard', 'others'].includes(packageType)) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'packageType must be either "standard" or "others"',
        });
      }

      // Validate type field
      if (type && !['starter', 'advance', 'expert'].includes(type)) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'type must be one of: starter, advance, expert',
        });
      }

      // Validate duration is a number
      if (duration !== null && duration !== undefined && isNaN(duration)) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'duration must be a valid number',
        });
      }

      // If packageType is being changed to 'others', ensure subjectIds are provided
      if (packageType === 'others' && (!subjectIds || subjectIds.length === 0)) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'When packageType is "others", subjectIds must be provided as a non-empty array',
        });
      }

      // Build update data
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
      if (startDate !== undefined) updateData.startDate = startDate;
      if (packageType !== undefined) updateData.packageType = packageType;
      if (overview !== undefined) updateData.overview = overview;
      if (syllabus !== undefined) updateData.syllabus = syllabus;
      if (prerequisites !== undefined) updateData.prerequisites = prerequisites;
      if (domain !== undefined) updateData.domain = domain;
      if (mode !== undefined) updateData.mode = mode;
      updateData.image = imageUrl;
    }

    // Check if new code is unique
    if (updateData.code && updateData.code !== pkg.code) {
      const existingPackage = await Package.findOne({ where: { code: updateData.code }, transaction });
      if (existingPackage) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Package code already exists. It must be unique.',
        });
      }
    }

    // Validate and update subjects if provided
    if (subjectIds !== null && subjectIds !== undefined) {
      if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ message: 'subjectIds must be a non-empty array' });
      }

      const foundSubjects = await Subject.findAll({
        where: { id: subjectIds },
        transaction
      });

      if (foundSubjects.length !== subjectIds.length) {
        await transaction.rollback();
        return res.status(404).json({ message: 'One or more subjects not found' });
      }

      // Get current subjects to check if they changed
      const currentSubjects = await pkg.getSubjects({ transaction });
      const currentSubjectIds = currentSubjects.map(s => s.id).sort();
      const newSubjectIds = [...subjectIds].sort();

      // Only update subjects if they actually changed
      const subjectsChanged = currentSubjectIds.length !== newSubjectIds.length ||
        !currentSubjectIds.every((id, index) => id === newSubjectIds[index]);

      if (subjectsChanged) {
        // Update subjects association within transaction
        await pkg.setSubjects(subjectIds, { transaction });
      }
    }

    // Update package fields
    await pkg.update(updateData, { transaction });

    // Fetch with subjects for response (only if subjects were updated or always for consistency)
    const pkgWithSubjects = await Package.findByPk(pkg.id, {
      include: {
        model: Subject,
        as: 'subjects',
        attributes: ['id', 'name', 'code'],
        through: { attributes: [] },
      },
      transaction
    });

    await transaction.commit();

    const duration = Date.now() - startTime;
    console.log(`Package ${pkg.id} updated successfully in ${duration}ms`);

    return res.status(200).json({
      message: 'Package updated successfully',
      package: pkgWithSubjects,
    });
  } catch (error) {
    await transaction.rollback();
    const duration = Date.now() - startTime;
    console.error(`Package update failed after ${duration}ms:`, error.message);
    return res.status(500).json({ message: 'Server error', error: error.message });
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
/**
 * GET package details by ID (ALL ROLES)
 */
exports.getPackagePriceByid = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id, {
      attributes: ['id', 'name', 'code', 'description', 'type', 'duration', 'packageType']
    });

    if (!pkg) {
      return res.status(404).json({
        message: 'Package not found',
      });
    }

    return res.status(200).json({
      id: pkg.id,
      name: pkg.name,
      code: pkg.code,
      description: pkg.description,
      type: pkg.type,
      duration: pkg.duration,
      packageType: pkg.packageType,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
}