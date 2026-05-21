const db = require('../models');
const { signToken } = require('../config/jwt');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const Enquiry = db.Enquiry;
const Batch = db.Batch;
const Package = db.Package;
const Subject = db.Subject;
const User = db.User;
const Assignment = db.Assignment;
const Material = db.Material;
const MockInterview = db.MockInterview;
const sequelize = db.sequelize;

/**
 * ENQUIRY STUDENT SIGNUP
 * Public route — any student can self-register
 * Required: name, email, phone, password
 * Optional: current_location, profession, qualification, experience,
 *           trainingMode, trainingTime, startTime, referral, consent
 */
exports.enquiryStudentSignup = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Name, email, phone, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone (at least 10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return res.status(400).json({ message: 'Phone number must contain at least 10 digits' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check for existing enquiry with same email or phone
    const existing = await Enquiry.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { phone: phoneDigits }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({
        message: existing.email === email.toLowerCase()
          ? 'An account with this email already exists'
          : 'An account with this phone number already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create enquiry record
    const enquiry = await Enquiry.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phoneDigits,
      password: hashedPassword,
      candidateStatus: 'enquiry stage',
      global: true,
      passwordChanged: true,
    });

    // Generate JWT token (same as login)
    const token = await signToken({
      enquiryId: enquiry.id,
      name: enquiry.name,
      email: enquiry.email,
      role: 'student'
    });

    return res.status(201).json({
      success: true,
      message: 'Signup successful',
      token,
      name: enquiry.name,
      email: enquiry.email,
    });
  } catch (error) {
    console.error('Error in enquiryStudentSignup:', error);
    res.status(500).json({ message: error.message });
  }
};


/**
 * ENQUIRY STUDENT LOGIN
 * Students with candidateStatus 'class' or 'class qualified' can login with email
 */
exports.enquiryStudentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find enquiry by email first (to validate password before checking status)
    const enquiry = await Enquiry.findOne({ where: { email } });

    if (!enquiry) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Validate password using the model's comparePassword method
    const isPasswordValid = await enquiry.comparePassword(password);
    console.log(isPasswordValid);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token for enquiry student
    const token = await signToken({
      enquiryId: enquiry.id,
      name: enquiry.name,
      email: enquiry.email,
      role: 'student'
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      name: enquiry.name,
      email: enquiry.email,
    });
  } catch (error) {
    console.error('Error in enquiryStudentLogin:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * VALIDATE ENQUIRY STUDENT TOKEN
 * Returns basic student info if token is valid
 */
exports.validateToken = async (req, res) => {
  try {
    const enquiry = req.enquiry;

    if (!enquiry) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      enquiry: {
        enquiryId: enquiry.enquiryId,
        name: enquiry.name,
        email: enquiry.email,
        role: enquiry.role,
      }
    });
  } catch (error) {
    console.error('Error in validateToken:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * GET STUDENT CLASSROOM DASHBOARD
 * Shows batch details, enrolled package/subjects, classmates, and all batch content
 * (announcements, assignments, materials, mock interviews)
 */
exports.getStudentClassroom = async (req, res) => {
  try {
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ message: 'Enquiry ID not found in token' });
    }

    // Fetch enquiry with all relationships
    const enquiry = await Enquiry.findByPk(enquiryId, {
      include: [
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'code', 'sessionStartDate', 'sessionTime', 'sessionLink', 'numberOfStudents'],
          include: [
            {
              model: Subject,
              as: 'subject',
              attributes: ['id', 'name', 'code', 'image']
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email', 'role']
            }
          ]
        },
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'image'],
          include: [
            {
              model: Subject,
              through: { attributes: [] },
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ]
    });

    if (!enquiry) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    if (enquiry.candidateStatus !== 'class' && enquiry.candidateStatus !== 'class qualified') {
      return res.status(403).json({
        message: 'Access denied. Only students with "class" or "class qualified" status can access classroom.'
      });
    }

    // Fetch classmates in the same batch
    let classmates = [];
    if (enquiry.batchId) {
      classmates = await Enquiry.findAll({
        where: {
          batchId: enquiry.batchId,
          id: { [db.Sequelize.Op.ne]: enquiryId },
          candidateStatus: ['class', 'class qualified']
        },
        attributes: ['id', 'name', 'email', 'phone', 'candidateStatus'],
        order: [['name', 'ASC']]
      });
    }

    // Prepare enrollment info
    let enrollmentInfo = null;
    let packageInfo = null;
    let individualSubjects = [];

    // Check if student has package
    if (enquiry.packageId && enquiry.package) {
      // Student took whole package
      packageInfo = {
        packageId: enquiry.packageId,
        packageName: enquiry.package.name,
        packageImage: enquiry.package.image,
        packageSubjects: enquiry.package.Subjects || [],
        totalPackageSubjects: enquiry.package.Subjects?.length || 0
      };
    }

    // Check if student has individual subjects
    if (enquiry.subjectIds && enquiry.subjectIds.length > 0) {
      const subjects = await Subject.findAll({
        where: {
          id: enquiry.subjectIds
        },
        attributes: ['id', 'name', 'code', 'image', 'overview']
      });
      individualSubjects = subjects;
    }

    // Prepare enrollment info based on what student enrolled in
    if (packageInfo && individualSubjects.length > 0) {
      // Student took BOTH package and individual subjects
      enrollmentInfo = {
        type: 'package_and_subjects',
        package: packageInfo,
        individualSubjects: individualSubjects,
        totalIndividualSubjects: individualSubjects.length
      };
    } else if (packageInfo) {
      // Student took only PACKAGE
      enrollmentInfo = {
        type: 'package',
        package: packageInfo
      };
    } else if (individualSubjects.length > 0) {
      // Student took only INDIVIDUAL SUBJECTS
      enrollmentInfo = {
        type: 'subjects',
        subjects: individualSubjects,
        totalSubjects: individualSubjects.length
      };
    }

    // Prepare batch info with instructor
    const batchInfo = enquiry.batch ? {
      id: enquiry.batch.id,
      name: enquiry.batch.name,
      code: enquiry.batch.code,
      startDate: enquiry.batch.sessionStartDate,
      timing: enquiry.batch.sessionTime,
      sessionLink: enquiry.batch.sessionLink,
      totalStudents: enquiry.batch.numberOfStudents,
      subject: enquiry.batch.subject,
      instructor: enquiry.batch.creator
    } : null;

    // Fetch batch content for this student's batch
    let batchContent = {
      announcements: [],
      assignments: [],
      materials: [],
      mockInterviews: []
    };

    if (enquiry.batchId) {
      // Fetch assignments for this batch
      const assignments = await Assignment.findAll({
        where: { batchId: enquiry.batchId },
        attributes: ['id', 'title', 'description', 'dueDate', 'createdDate', 'submissionFile'],
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Subject,
            as: 'subject',
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [['createdDate', 'DESC']],
        limit: 10
      });

      // Fetch materials for this batch
      const materials = await Material.findAll({
        where: { batchId: enquiry.batchId },
        attributes: ['id', 'title', 'description', 'documentName', 'documentUrl', 'uploadedOn'],
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Subject,
            as: 'subject',
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [['uploadedOn', 'DESC']],
        limit: 10
      });

      // Fetch mock interviews for this student in this batch
      const mockInterviews = await MockInterview.findAll({
        where: {
          batchId: enquiry.batchId,
          enquiryId: enquiryId
        },
        attributes: ['id', 'studentName', 'interviewDate', 'interviewTime', 'mode', 'interviewLink', 'feedback', 'status', 'createdAt'],
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['interviewDate', 'DESC']],
        limit: 10
      });

      batchContent = {
        assignments: {
          count: assignments.length,
          items: assignments
        },
        materials: {
          count: materials.length,
          items: materials
        },
        mockInterviews: {
          count: mockInterviews.length,
          items: mockInterviews
        }
      };
    }

    res.status(200).json({
      success: true,
      message: 'Student classroom dashboard with batch content',
      data: {
        student: {
          id: enquiry.id,
          name: enquiry.name,
          email: enquiry.email,
          phone: enquiry.phone,
          candidateStatus: enquiry.candidateStatus,
          profession: enquiry.profession,
          qualification: enquiry.qualification,
          experience: enquiry.experience,
          currentLocation: enquiry.current_location
        },
        enrollment: enrollmentInfo,
        batch: batchInfo,
        classmates: {
          total: classmates.length,
          students: classmates
        },
        batchContent: batchContent
      }
    });
  } catch (error) {
    console.error('Error in getStudentClassroom:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET STUDENT BATCH STUDENTS (Classmates List)
 */
exports.getClassmates = async (req, res) => {
  try {
    const enquiryId = req.enquiry?.enquiryId;

    const enquiry = await Enquiry.findByPk(enquiryId, {
      attributes: ['batchId'],
      include: [
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!enquiry || !enquiry.batchId) {
      return res.status(404).json({ message: 'Batch information not found' });
    }

    // Fetch all students in the batch with active status
    const batchStudents = await Enquiry.findAll({
      where: {
        batchId: enquiry.batchId,
        candidateStatus: ['class', 'class qualified']
      },
      attributes: ['id', 'name', 'email', 'phone', 'profession', 'candidateStatus'],
      order: [['name', 'ASC']],
      include: [
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Classmates list',
      batch: enquiry.batch,
      total: batchStudents.length,
      data: batchStudents
    });
  } catch (error) {
    console.error('Error in getClassmates:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET STUDENT ENROLLMENT DETAILS
 */
exports.getEnrollmentDetails = async (req, res) => {
  try {
    const enquiryId = req.enquiry?.enquiryId;

    const enquiry = await Enquiry.findByPk(enquiryId, {
      attributes: ['id', 'name', 'email', 'packageId', 'subjectIds', 'batchId'],
      include: [
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'image'],
          include: [
            {
              model: Subject,
              through: { attributes: [] },
              attributes: ['id', 'name', 'code', 'image', 'overview']
            }
          ]
        },
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'code', 'sessionStartDate']
        }
      ]
    });

    if (!enquiry) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    let enrollment = null;
    let packageEnrollment = null;
    let subjectEnrollment = null;

    // Check package enrollment
    if (enquiry.packageId && enquiry.package) {
      packageEnrollment = {
        packageId: enquiry.package.id,
        packageName: enquiry.package.name,
        packageImage: enquiry.package.image,
        packageSubjects: enquiry.package.Subjects,
        totalPackageSubjects: enquiry.package.Subjects?.length || 0
      };
    }

    // Check individual subjects enrollment
    if (enquiry.subjectIds && enquiry.subjectIds.length > 0) {
      const subjects = await Subject.findAll({
        where: {
          id: enquiry.subjectIds
        },
        attributes: ['id', 'name', 'code', 'image', 'overview', 'prerequisites', 'startDate']
      });

      subjectEnrollment = {
        subjects,
        totalSubjects: subjects.length
      };
    }

    // Prepare enrollment response based on what student has
    if (packageEnrollment && subjectEnrollment) {
      // Student has BOTH package and individual subjects
      enrollment = {
        type: 'PACKAGE_AND_SUBJECTS',
        package: packageEnrollment,
        individualSubjects: subjectEnrollment.subjects,
        totalIndividualSubjects: subjectEnrollment.totalSubjects,
        batch: enquiry.batch
      };
    } else if (packageEnrollment) {
      // Student has only PACKAGE
      enrollment = {
        type: 'PACKAGE',
        package: packageEnrollment,
        batch: enquiry.batch
      };
    } else if (subjectEnrollment) {
      // Student has only INDIVIDUAL SUBJECTS
      enrollment = {
        type: 'SUBJECTS',
        subjects: subjectEnrollment.subjects,
        totalSubjects: subjectEnrollment.totalSubjects,
        batch: enquiry.batch
      };
    } else {
      return res.status(404).json({ message: 'No enrollment found' });
    }

    res.status(200).json({
      success: true,
      message: 'Enrollment details',
      data: enrollment
    });
  } catch (error) {
    console.error('Error in getEnrollmentDetails:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * UPDATE STUDENT PROFILE
 * Allows students to update their own personal details
 */
exports.updateStudentProfile = async (req, res) => {
  try {
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ message: 'Enquiry ID not found in token' });
    }

    const enquiry = await Enquiry.findByPk(enquiryId);
    if (!enquiry) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    const {
      name,
      current_location,
      profession,
      qualification,
      experience
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (current_location !== undefined) updateData.current_location = current_location?.trim() || null;
    if (profession !== undefined) updateData.profession = profession?.trim() || null;
    if (qualification !== undefined) updateData.qualification = qualification?.trim() || null;
    if (experience !== undefined) updateData.experience = experience?.trim() || null;

    await enquiry.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: enquiry.id,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        current_location: enquiry.current_location,
        profession: enquiry.profession,
        qualification: enquiry.qualification,
        experience: enquiry.experience,
        updatedAt: enquiry.updatedAt
      }
    });
  } catch (error) {
    console.error('Error in updateStudentProfile:', error);
    res.status(500).json({ message: error.message });
  }
};
