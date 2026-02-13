const db = require('../models');
const User = db.User;
const Subject = db.Subject;
const Instructor = db.Instructor;
const Batch = db.Batch;
const Assignment = db.Assignment;
const MockInterview = db.MockInterview;
const Feedback = db.Feedback;
const sequelize = db.sequelize;

// Assign subject to instructor
exports.assignSubjectToInstructor = async (req, res) => {
  try {
    const { userId, subjectId } = req.body;
    const userRole = req.user.role;

    console.log('Request received:', { userId, subjectId, userRole });

    // Only ADMIN and COUNSELLOR can assign subjects
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        message: 'Access denied. Only Admin and Counsellor can assign subjects',
      });
    }

    if (!userId || !subjectId) {
      return res.status(400).json({
        message: 'userId and subjectId are required',
      });
    }

    // Check if user exists and is an instructor
    const user = await User.findByPk(userId);
    console.log('User found:', user?.dataValues);

    if (!user || user.role !== 'instructor') {
      return res.status(404).json({
        message: 'Instructor not found or user is not an instructor',
      });
    }

    // Check if subject exists
    const subject = await Subject.findByPk(subjectId);
    console.log('Subject found:', subject?.dataValues);

    if (!subject) {
      return res.status(404).json({
        message: 'Subject not found',
      });
    }

    // Check if assignment already exists
    const existingAssignment = await Instructor.findOne({
      where: { userId, subjectId },
    });

    if (existingAssignment) {
      return res.status(400).json({
        message: 'Subject already assigned to this instructor',
      });
    }

    // Create the assignment
    const assignment = await Instructor.create({
      userId,
      subjectId,
    });

    console.log('Assignment created:', assignment?.dataValues);

    res.status(201).json({
      success: true,
      message: 'Subject assigned to instructor successfully',
      data: assignment,
    });
  } catch (error) {
    console.error('Error in assignSubjectToInstructor:', error);
    res.status(500).json({ 
      message: error.message,
      error: error.toString()
    });
  }
};

// Get all subjects for logged-in instructor (or all subjects if admin/counsellor)
exports.getMySubjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // If admin or counsellor, return all subjects with instructor information
    if (userRole === 'ADMIN' || userRole === 'COUNSELLOR') {
      const subjects = await Subject.findAll({
        attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
        include: [{
          model: User,
          through: { attributes: [] },
          attributes: ['id', 'name', 'email'],
        }],
      });
      return res.status(200).json({
        success: true,
        message: 'All subjects with instructors',
        data: subjects || [],
      });
    }
    
    // If instructor, return only their assigned subjects
    const instructor = await User.findByPk(userId, {
      include: [{
        model: Subject,
        through: { attributes: [] },
        attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
      }],
    });

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Your assigned subjects',
      data: instructor.Subjects || [],
    });
  } catch (error) {
    console.error('Error in getMySubjects:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single subject details for instructor (or any subject if admin/counsellor)
exports.getSubjectDetail = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // If admin or counsellor, they can view any subject with all instructors assigned to it
    if (userRole === 'ADMIN' || userRole === 'COUNSELLOR') {
      const subject = await Subject.findByPk(subjectId, {
        attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
        include: [{
          model: User,
          through: { attributes: [] },
          attributes: ['id', 'name', 'email'],
        }],
      });

      if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Subject details with all assigned instructors',
        data: { 
          subject,
          instructors: subject.Users || [],
        },
      });
    }

    // For instructors, check if subject is assigned to them
    const instructor = await Instructor.findOne({
      where: { userId, subjectId },
      include: {
        model: Subject,
        attributes: ['id', 'name', 'code', 'image', 'overview', 'syllabus', 'prerequisites', 'startDate'],
      },
    });

    if (!instructor) {
      return res.status(403).json({ message: 'Access denied. This subject is not assigned to you' });
    }

    res.status(200).json({
      success: true,
      message: 'Your subject details',
      data: {
        subject: instructor.Subject,
      },
    });
  } catch (error) {
    console.error('Error in getSubjectDetail:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get individual instructor profile with stats
exports.getInstructorProfile = async (req, res) => {
  try {
    const { instructorId } = req.params;

    // Find instructor with user details
    const instructor = await Instructor.findOne({
      where: { userId: instructorId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }, {
        model: Subject,
        through: { attributes: [] },
        attributes: ['id', 'name', 'code']
      }]
    });

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    // Count subjects
    const subjectsCount = await Instructor.count({
      where: { userId: instructorId }
    });

    // Count total students taught from batches (unique enquiries in batches created by this instructor)
    const studentsCount = await sequelize.query(`
      SELECT COUNT(DISTINCT e.id) as total_students
      FROM enquiries e
      INNER JOIN batches b ON e."batchId" = b.id
      WHERE b."instructorId" = :userId
    `, {
      replacements: { userId: instructorId },
      type: sequelize.QueryTypes.SELECT
    });

    // Count assignments created by instructor
    const assignmentsCount = await Assignment.count({
      where: { instructorId }
    });

    // Count mock interviews taken by instructor
    const mockInterviewsCount = await MockInterview.count({
      where: { instructorId }
    });

    // Get average rating from feedbacks
    const feedbackStats = await sequelize.query(`
      SELECT 
        ROUND(AVG(rating)::numeric, 2) as average_rating,
        COUNT(*) as total_feedbacks
      FROM feedbacks
      WHERE "instructorId" = :instructorId
    `, {
      replacements: { instructorId },
      type: sequelize.QueryTypes.SELECT
    });

    const averageRating = feedbackStats[0]?.average_rating || 0;
    const totalFeedbacks = feedbackStats[0]?.total_feedbacks || 0;

    res.status(200).json({
      success: true,
      message: 'Instructor profile retrieved successfully',
      data: {
        id: instructor.id,
        userId: instructor.userId,
        name: instructor.name || instructor.User?.name,
        email: instructor.User?.email,
        image: instructor.image,
        description: instructor.description,
        stats: {
          subjectsCount,
          studentsCount: parseInt(studentsCount[0]?.total_students || 0),
          assignmentsCreated: assignmentsCount,
          mockInterviewsConducted: mockInterviewsCount,
          averageRating: parseFloat(averageRating),
          totalFeedbacks: parseInt(totalFeedbacks)
        },
        subjects: instructor.Subjects || []
      }
    });
  } catch (error) {
    console.error('Error in getInstructorProfile:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all instructors with their profiles and stats
exports.getAllInstructorsProfiles = async (req, res) => {
  try {
    // Get all instructors
    const instructors = await Instructor.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }, {
        model: Subject,
        through: { attributes: [] },
        attributes: ['id', 'name', 'code']
      }]
    });

    if (!instructors || instructors.length === 0) {
      return res.status(404).json({ message: 'No instructors found' });
    }

    // Fetch stats for each instructor
    const instructorProfiles = await Promise.all(
      instructors.map(async (instructor) => {
        // Count subjects
        const subjectsCount = await Instructor.count({
          where: { userId: instructor.userId }
        });

        // Count total students taught
        const studentsCount = await sequelize.query(`
          SELECT COUNT(DISTINCT e.id) as total_students
          FROM enquiries e
          INNER JOIN batches b ON e."batchId" = b.id
          WHERE b."instructorId" = :userId
        `, {
          replacements: { userId: instructor.userId },
          type: sequelize.QueryTypes.SELECT
        });

        // Count assignments
        const assignmentsCount = await Assignment.count({
          where: { instructorId: instructor.userId }
        });

        // Count mock interviews
        const mockInterviewsCount = await MockInterview.count({
          where: { instructorId: instructor.userId }
        });

        // Get feedback stats
        const feedbackStats = await sequelize.query(`
          SELECT 
            ROUND(AVG(rating)::numeric, 2) as average_rating,
            COUNT(*) as total_feedbacks
          FROM feedbacks
          WHERE "instructorId" = :instructorId
        `, {
          replacements: { instructorId: instructor.userId },
          type: sequelize.QueryTypes.SELECT
        });

        return {
          id: instructor.id,
          userId: instructor.userId,
          name: instructor.name || instructor.User?.name,
          email: instructor.User?.email,
          image: instructor.image,
          description: instructor.description,
          stats: {
            subjectsCount,
            studentsCount: parseInt(studentsCount[0]?.total_students || 0),
            assignmentsCreated: assignmentsCount,
            mockInterviewsConducted: mockInterviewsCount,
            averageRating: parseFloat(feedbackStats[0]?.average_rating || 0),
            totalFeedbacks: parseInt(feedbackStats[0]?.total_feedbacks || 0)
          },
          subjects: instructor.Subjects || []
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'All instructor profiles retrieved successfully',
      total: instructorProfiles.length,
      data: instructorProfiles
    });
  } catch (error) {
    console.error('Error in getAllInstructorsProfiles:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update instructor profile
exports.updateInstructorProfile = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { name, description, image } = req.body;

    // Find instructor
    const instructor = await Instructor.findOne({
      where: { userId: instructorId }
    });

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    // Update profile fields
    if (name) instructor.name = name;
    if (description) instructor.description = description;
    if (image) instructor.image = image;

    await instructor.save();

    // Fetch updated profile with stats
    const subjectsCount = await Instructor.count({
      where: { userId: instructorId }
    });

    const studentsCount = await sequelize.query(`
      SELECT COUNT(DISTINCT e.id) as total_students
      FROM enquiries e
      INNER JOIN batches b ON e."batchId" = b.id
      WHERE b."instructorId" = :userId
    `, {
      replacements: { userId: instructorId },
      type: sequelize.QueryTypes.SELECT
    });

    const assignmentsCount = await Assignment.count({
      where: { instructorId }
    });

    const mockInterviewsCount = await MockInterview.count({
      where: { instructorId }
    });

    const feedbackStats = await sequelize.query(`
      SELECT 
        ROUND(AVG(rating)::numeric, 2) as average_rating,
        COUNT(*) as total_feedbacks
      FROM feedbacks
      WHERE "instructorId" = :instructorId
    `, {
      replacements: { instructorId },
      type: sequelize.QueryTypes.SELECT
    });

    const updatedInstructor = await Instructor.findOne({
      where: { userId: instructorId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }, {
        model: Subject,
        through: { attributes: [] },
        attributes: ['id', 'name', 'code']
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Instructor profile updated successfully',
      data: {
        id: updatedInstructor.id,
        userId: updatedInstructor.userId,
        name: updatedInstructor.name || updatedInstructor.User?.name,
        email: updatedInstructor.User?.email,
        image: updatedInstructor.image,
        description: updatedInstructor.description,
        stats: {
          subjectsCount,
          studentsCount: parseInt(studentsCount[0]?.total_students || 0),
          assignmentsCreated: assignmentsCount,
          mockInterviewsConducted: mockInterviewsCount,
          averageRating: parseFloat(feedbackStats[0]?.average_rating || 0),
          totalFeedbacks: parseInt(feedbackStats[0]?.total_feedbacks || 0)
        },
        subjects: updatedInstructor.Subjects || []
      }
    });
  } catch (error) {
    console.error('Error in updateInstructorProfile:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all assignments by subject ID
exports.getAssignmentsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Subject ID is required',
      });
    }

    // Check if subject exists
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // If instructor, check if they are assigned to this subject
    if (userRole === 'instructor') {
      const isAssigned = await Instructor.findOne({
        where: { userId, subjectId },
      });
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this subject',
        });
      }
    }

    // Get all assignments for this subject
    const assignments = await Assignment.findAll({
      where: { subjectId },
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'code', 'status'],
        },
        {
          model: Subject,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdDate', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Assignments retrieved successfully',
      total: assignments.length,
      data: assignments,
    });
  } catch (error) {
    console.error('Error in getAssignmentsBySubject:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all batches by subject ID and instructor ID
exports.getBatchesBySubjectAndInstructor = async (req, res) => {
  try {
    const { subjectId, instructorId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!subjectId || !instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Subject ID and Instructor ID are required',
      });
    }

    // Check if subject exists
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Check if instructor exists
    const instructor = await User.findByPk(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found',
      });
    }

    // If instructor, they can only view their own batches
    if (userRole === 'instructor' && userId !== parseInt(instructorId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own batches',
      });
    }

    // Get all batches for this subject and instructor
    const batches = await Batch.findAll({
      where: {
        subjectId,
        instructorId,
      },
      include: [
        {
          model: Subject,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['sessionDate', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Batches retrieved successfully',
      total: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error('Error in getBatchesBySubjectAndInstructor:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all assignments by batch ID
exports.getAssignmentsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required',
      });
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Subject,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    // If instructor, check if it's their batch
    if (userRole === 'instructor' && batch.instructorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This is not your batch',
      });
    }

    // Get all assignments for this batch
    const assignments = await Assignment.findAll({
      where: { batchId },
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'code', 'status'],
        },
        {
          model: Subject,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdDate', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Assignments retrieved successfully',
      total: assignments.length,
      batch: batch,
      data: assignments,
    });
  } catch (error) {
    console.error('Error in getAssignmentsByBatch:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all instructors (ADMIN and COUNSELLOR only)
exports.getAllInstructors = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Only ADMIN and COUNSELLOR can view all instructors
    if (userRole !== 'ADMIN' && userRole !== 'COUNSELLOR') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin and Counsellor can view all instructors.',
      });
    }

    const instructors = await User.findAll({
      where: {
        role: 'instructor',
      },
      attributes: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'],
      // include: [
      //   {
      //     model: db.Instructor,
      //     attributes: ['id', 'description', 'image', 'experienceYears'],
      //     as: 'instructor',
      //     required: false,
      //   },
      //   {
      //     model: Subject,
      //     attributes: ['id', 'name', 'code'],
      //     as: 'subjects',
      //     through: { attributes: [] },
      //     required: false,
      //   },
      // ],
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true,
      total: instructors.length,
      message: 'All instructors retrieved successfully',
      data: instructors,
    });
  } catch (error) {
    console.error('Error in getAllInstructors:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
