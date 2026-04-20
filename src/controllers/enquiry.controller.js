const { Enquiry } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const validateStringLength = (value, fieldName, maxLength) => {
  if (!value) return null;
  if (typeof value !== 'string') return `${fieldName} must be a string`;
  if (value.trim().length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters long`;
  }
  return null;
};

const parseDatabaseLengthError = (error) => {
  const message = error?.message || '';
  if (message.includes('value too long for type character varying')) {
    return 'One or more fields exceed their maximum allowed length';
  }
  return null;
};

/**
 * CREATE Enquiry (ADMIN only)
 * Creates a new enquiry with all details: personal info, enrollment details, and preferences
 */
exports.createEnquiry = async (req, res) => {
  try {
    const {
      // Required fields
      name,
      email,
      phone,

      // Personal details
      current_location,
      profession,
      qualification,
      experience,

      // Enrollment details
      packageId,
      batchId,
      subjectIds,

      // Preferences
      trainingMode,
      trainingTime,
      startTime,

      // Additional info
      referral,
      consent,
      candidateStatus,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      console.log('Validation failed - missing required fields. Received body:', req.body);
      return res.status(400).json({
        message: 'Name, email, and phone are required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }

    // Validate lengths for fixed-size fields
    const fieldValidations = [
      validateStringLength(name, 'Name', 100),
      validateStringLength(phone.replace(/\D/g, ''), 'Phone number', 20),
      validateStringLength(current_location, 'Current location', 100),
      validateStringLength(profession, 'Profession', 100),
      validateStringLength(qualification, 'Qualification', 100),
      validateStringLength(experience, 'Experience', 50),
      validateStringLength(trainingMode, 'Training mode', 50),
      validateStringLength(trainingTime, 'Training time', 50),
      validateStringLength(startTime, 'Start time', 50),
      validateStringLength(referral, 'Referral', 100),
    ].filter(Boolean);

    if (fieldValidations.length > 0) {
      return res.status(400).json({
        message: fieldValidations[0]
      });
    }

    // Validate phone format (at least 10 digits)
    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({
        message: 'Phone number must contain at least 10 digits'
      });
    }

    // Check for existing enquiry with same email or phone
    const normalizedPhone = phone.replace(/\D/g, '');
    const emailExists = await Enquiry.findOne({ where: { email: email.toLowerCase() } });
    const phoneExists = await Enquiry.findOne({ where: { phone: normalizedPhone } });

    if (emailExists || phoneExists) {
      if (emailExists && phoneExists) {
        return res.status(400).json({
          message: 'An enquiry with this email and phone number already exists'
        });
      }
      if (emailExists) {
        return res.status(400).json({
          message: 'An enquiry with this email already exists'
        });
      }
      return res.status(400).json({
        message: 'An enquiry with this phone number already exists'
      });
    }

    // Validate candidateStatus if provided
    const validStatuses = ['demo', 'qualified demo', 'class', 'class qualified', 'placement', 'enquiry stage'];
    if (candidateStatus && !validStatuses.includes(candidateStatus)) {
      return res.status(400).json({
        message: `Invalid candidate status. Allowed values: ${validStatuses.join(', ')}`
      });
    }

    // Validate subjectIds is array if provided
    if (subjectIds && !Array.isArray(subjectIds)) {
      return res.status(400).json({
        message: 'subjectIds must be an array of integers'
      });
    }

    // Validate consent is boolean
    if (consent !== undefined && typeof consent !== 'boolean') {
      return res.status(400).json({
        message: 'consent must be a boolean value'
      });
    }

    // Hash the default password before storing
    const hashedPassword = await bcrypt.hash('nammaqa@1', 10);

    // Create enquiry with all details
    const enquiry = await Enquiry.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.replace(/\D/g, ''),
      current_location: current_location?.trim() || null,
      profession: profession?.trim() || null,
      qualification: qualification?.trim() || null,
      experience: experience?.trim() || null,
      packageId: packageId || null,
      batchId: batchId || null,
      subjectIds: subjectIds || [],
      trainingMode: trainingMode?.trim() || null,
      trainingTime: trainingTime?.trim() || null,
      startTime: startTime?.trim() || null,
      referral: referral?.trim() || null,
      consent: consent || false,
      candidateStatus: candidateStatus || 'enquiry stage',
      password: hashedPassword,
      globalUser: false,
      passwordChanged: false,
    });

    res.status(201).json({
      success: true,
      message: 'Enquiry created successfully',
      data: {
        id: enquiry.id,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        current_location: enquiry.current_location,
        profession: enquiry.profession,
        qualification: enquiry.qualification,
        experience: enquiry.experience,
        packageId: enquiry.packageId,
        batchId: enquiry.batchId,
        subjectIds: enquiry.subjectIds,
        trainingMode: enquiry.trainingMode,
        trainingTime: enquiry.trainingTime,
        startTime: enquiry.startTime,
        referral: enquiry.referral,
        consent: enquiry.consent,
        candidateStatus: enquiry.candidateStatus,
        createdAt: enquiry.createdAt,
      }
    });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    const dbErrorMessage = parseDatabaseLengthError(error);
    if (dbErrorMessage) {
      return res.status(400).json({
        success: false,
        message: dbErrorMessage,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating enquiry',
      error: error.message
    });
  }
};

/**
 * GET all enquiries (ALL ROLES)
 */
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.findAll({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: require('../models').Billing,
          as: 'billing',
          attributes: ['id', 'packageCost', 'amountPaid', 'discount', 'balance'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Format response with payment status
    const formattedEnquiries = enquiries.map(enquiry => {
      const enquiryData = enquiry.toJSON();
      let paymentStatus = 'not paid';

      if (enquiryData.billing) {
        const { amountPaid, balance, packageCost } = enquiryData.billing;
        
        if (balance === 0 || amountPaid >= packageCost) {
          paymentStatus = 'fully paid';
        } else if (amountPaid > 0 && balance > 0) {
          paymentStatus = 'partially paid';
        } else {
          paymentStatus = 'not paid';
        }
      }

      return {
        ...enquiryData,
        paymentStatus,
      };
    });

    res.json(formattedEnquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET enquiry by ID (ALL ROLES)
 */
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByPk(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        message: 'Enquiry not found',
      });
    }

    res.json(enquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * UPDATE enquiry (ADMIN and COUNSELLOR)
 * Updates enquiry with validation for all fields
 */
exports.updateEnquiry = async (req, res) => {
  try {
    // Check if user role is COUNSELLOR, ADMIN, or ACCOUNTS
    const userrole = req.user.role;
    if (userrole !== 'COUNSELLOR' && userrole !== 'ADMIN' && userrole !== 'ACCOUNTS') {
      return res.status(403).json({ message: 'You do not have permission to update enquiries. Please contact your administrator.' });
    }

    const enquiry = await Enquiry.findByPk(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    const {
      name,
      email,
      phone,
      current_location,
      profession,
      qualification,
      experience,
      packageId,
      batchId,
      subjectIds,
      trainingMode,
      trainingTime,
      startTime,
      referral,
      consent,
      candidateStatus,
    } = req.body;

    const normalizedPhone = phone?.replace(/\D/g, '');
    let emailExists = null;
    let phoneExists = null;

    // Validate email format if provided
    if (email && email !== enquiry.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      emailExists = await Enquiry.findOne({
        where: {
          email: email.toLowerCase(),
          id: { [Op.ne]: enquiry.id }
        }
      });
    }

    // Validate phone format if provided and changed
    if (normalizedPhone && normalizedPhone !== enquiry.phone) {
      const phoneLengthError = validateStringLength(normalizedPhone, 'Phone number', 20);
      if (phoneLengthError) {
        return res.status(400).json({ message: phoneLengthError });
      }

      const phoneRegex = /^\d{10,}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        return res.status(400).json({ message: 'Phone number must contain at least 10 digits' });
      }

      phoneExists = await Enquiry.findOne({
        where: {
          phone: normalizedPhone,
          id: { [Op.ne]: enquiry.id }
        }
      });
    }

    if (emailExists || phoneExists) {
      if (emailExists && phoneExists) {
        return res.status(400).json({ message: 'Email and phone number already exist in another enquiry' });
      }
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists in another enquiry' });
      }
      return res.status(400).json({ message: 'Phone number already exists in another enquiry' });
    }

    // Validate candidateStatus if provided
    if (candidateStatus) {
      const validStatuses = ['demo', 'qualified demo', 'class', 'class qualified', 'placement', 'enquiry stage'];
      if (!validStatuses.includes(candidateStatus)) {
        return res.status(400).json({
          message: `Invalid candidate status. Allowed values: ${validStatuses.join(', ')}`
        });
      }
    }

    // Validate text field lengths on update
    const lengthValidations = [
      validateStringLength(name, 'Name', 100),
      validateStringLength(current_location, 'Current location', 100),
      validateStringLength(profession, 'Profession', 100),
      validateStringLength(qualification, 'Qualification', 100),
      validateStringLength(experience, 'Experience', 50),
      validateStringLength(trainingMode, 'Training mode', 50),
      validateStringLength(trainingTime, 'Training time', 50),
      validateStringLength(startTime, 'Start time', 50),
      validateStringLength(referral, 'Referral', 100),
    ].filter(Boolean);

    if (lengthValidations.length > 0) {
      return res.status(400).json({ message: lengthValidations[0] });
    }

    // Validate subjectIds if provided
    if (subjectIds !== undefined) {
      if (!Array.isArray(subjectIds)) {
        return res.status(400).json({ message: 'subjectIds must be an array of integers' });
      }
    }

    // Validate consent if provided
    if (consent !== undefined && typeof consent !== 'boolean') {
      return res.status(400).json({ message: 'consent must be a boolean value' });
    }

    // Update enquiry with trimmed and validated data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone.replace(/\D/g, '');
    if (current_location !== undefined) updateData.current_location = current_location?.trim() || null;
    if (profession !== undefined) updateData.profession = profession?.trim() || null;
    if (qualification !== undefined) updateData.qualification = qualification?.trim() || null;
    if (experience !== undefined) updateData.experience = experience?.trim() || null;
    if (packageId !== undefined) updateData.packageId = packageId || null;
    if (batchId !== undefined) updateData.batchId = batchId || null;
    if (subjectIds !== undefined) updateData.subjectIds = subjectIds || [];
    if (trainingMode !== undefined) updateData.trainingMode = trainingMode?.trim() || null;
    if (trainingTime !== undefined) updateData.trainingTime = trainingTime?.trim() || null;
    if (startTime !== undefined) updateData.startTime = startTime?.trim() || null;
    if (referral !== undefined) updateData.referral = referral?.trim() || null;
    if (consent !== undefined) updateData.consent = consent;
    if (candidateStatus !== undefined) updateData.candidateStatus = candidateStatus;

    await enquiry.update(updateData);

    res.json({
      success: true,
      message: 'Enquiry updated successfully',
      data: {
        id: enquiry.id,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        current_location: enquiry.current_location,
        profession: enquiry.profession,
        qualification: enquiry.qualification,
        experience: enquiry.experience,
        packageId: enquiry.packageId,
        batchId: enquiry.batchId,
        subjectIds: enquiry.subjectIds,
        trainingMode: enquiry.trainingMode,
        trainingTime: enquiry.trainingTime,
        startTime: enquiry.startTime,
        referral: enquiry.referral,
        consent: enquiry.consent,
        candidateStatus: enquiry.candidateStatus,
        updatedAt: enquiry.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error updating enquiry:', error);
    const dbErrorMessage = parseDatabaseLengthError(error);
    if (dbErrorMessage) {
      return res.status(400).json({
        success: false,
        message: dbErrorMessage,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating enquiry',
      error: error.message
    });
  }
};

/**
 * DELETE enquiry (ADMIN only)
 */
exports.deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByPk(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        message: 'Enquiry not found',
      });
    }

    await enquiry.destroy();

    res.json({
      message: 'Enquiry deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changeEnquiryStatus = async (req, res) => {
  try {
    const userrole = req.user.role;
    const { enquiryId, newStatus } = req.body;
    const enquiry = await Enquiry.findByPk(enquiryId);

    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    const currentStatus = enquiry.candidateStatus;

    // Rule 1: COUNSELLOR can move from enquiry stage to demo
    if (currentStatus === 'enquiry stage' && newStatus === 'demo') {
      if (userrole !== 'COUNSELLOR') {
        return res.status(403).json({ message: 'Only COUNSELLOR can move from enquiry stage to demo' });
      }
    }
    // Rule 2: ACCOUNTS can move from demo to class
    else if (currentStatus === 'demo' && newStatus === 'class') {
      if (userrole !== 'ACCOUNTS') {
        return res.status(403).json({ message: 'Only ACCOUNTS can move from demo to class' });
      }
    }
    // Rule 3: ACCOUNTS can move from demo to enquiry stage
    else if (currentStatus === 'demo' && newStatus === 'enquiry stage') {
      if (userrole !== 'ACCOUNTS') {
        return res.status(403).json({ message: 'Only ACCOUNTS can move from demo to enquiry stage' });
      }
    }
    // Disallow any other transitions
    else {
      return res.status(403).json({ message: `Invalid status transition from ${currentStatus} to ${newStatus}` });
    }

    enquiry.candidateStatus = newStatus;
    await enquiry.save();

    res.status(200).json({
      message: 'Enquiry status updated successfully',
      enquiry,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};