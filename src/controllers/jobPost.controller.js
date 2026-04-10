const { JobPost, HigherEducation, Placement, StudentPlacementApplied } = require('../models');

// Valid enum values
const VALID_WORK_MODES = ['Remote', 'On-site', 'Hybrid'];
const VALID_JOB_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract'];

/**
 * Normalize and validate workMode enum value
 */
const normalizeWorkMode = (value) => {
  if (!value) return null;
  
  const normalized = value.trim();
  
  // Direct match
  if (VALID_WORK_MODES.includes(normalized)) {
    return normalized;
  }
  
  // Case-insensitive and format-flexible matching
  const lowerValue = normalized.toLowerCase();
  if (lowerValue === 'remote') return 'Remote';
  if (lowerValue === 'onsite' || lowerValue === 'on-site' || lowerValue === 'on site') return 'On-site';
  if (lowerValue === 'hybrid') return 'Hybrid';
  
  return null;
};

/**
 * Normalize and validate jobType enum value
 */
const normalizeJobType = (value) => {
  if (!value) return null;
  
  const normalized = value.trim();
  
  // Direct match
  if (VALID_JOB_TYPES.includes(normalized)) {
    return normalized;
  }
  
  // Case-insensitive and format-flexible matching
  const lowerValue = normalized.toLowerCase();
  if (lowerValue === 'fulltime' || lowerValue === 'full-time' || lowerValue === 'full time') return 'Full-time';
  if (lowerValue === 'parttime' || lowerValue === 'part-time' || lowerValue === 'part time') return 'Part-time';
  if (lowerValue === 'internship') return 'Internship';
  if (lowerValue === 'contract') return 'Contract';
  
  return null;
};

/**
 * Create a new Job Post
 */
const createJobPost = async (req, res) => {
  try {
    const {
      companyName,
      companyLogo,
      jobTitle,
      location,
      workMode,
      jobType,
      about,
      jobDescription,
      preferredExperience,
      technicalSkills,
    } = req.body;

    // Basic validation
    if (!companyName || !jobTitle || !location || !workMode || !jobType || !jobDescription) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: companyName, jobTitle, location, workMode, jobType, jobDescription',
      });
    }

    // Normalize and validate workMode
    const normalizedWorkMode = normalizeWorkMode(workMode);
    if (!normalizedWorkMode) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid workMode. Must be one of: ${VALID_WORK_MODES.join(', ')}`,
      });
    }

    // Normalize and validate jobType
    const normalizedJobType = normalizeJobType(jobType);
    if (!normalizedJobType) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid jobType. Must be one of: ${VALID_JOB_TYPES.join(', ')}`,
      });
    }

    const jobPost = await JobPost.create({
      companyName,
      companyLogo,
      jobTitle,
      location,
      workMode: normalizedWorkMode,
      jobType: normalizedJobType,
      about,
      jobDescription,
      preferredExperience,
      technicalSkills: technicalSkills || [],
      postedAt: new Date(),
    });

    res.status(201).json({
      status: 'success',
      message: 'Job post created successfully',
      data: jobPost,
    });
  } catch (error) {
    console.error('Error creating job post:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get all Job Posts
 */
const getJobPosts = async (req, res) => {
  try {
    const jobPosts = await JobPost.findAll({
      order: [['postedAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      results: jobPosts.length,
      data: jobPosts,
    });
  } catch (error) {
    console.error('Error fetching job posts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get a single Job Post by ID
 */
const getJobPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const jobPost = await JobPost.findByPk(id);

    if (!jobPost) {
      return res.status(404).json({
        status: 'error',
        message: 'Job post not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: jobPost,
    });
  } catch (error) {
    console.error('Error fetching job post details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Update a Job Post
 */
const updateJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const jobPost = await JobPost.findByPk(id);

    if (!jobPost) {
      return res.status(404).json({
        status: 'error',
        message: 'Job post not found',
      });
    }

    // Normalize workMode if provided
    if (updateData.workMode) {
      const normalizedWorkMode = normalizeWorkMode(updateData.workMode);
      if (!normalizedWorkMode) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid workMode. Must be one of: ${VALID_WORK_MODES.join(', ')}`,
        });
      }
      updateData.workMode = normalizedWorkMode;
    }

    // Normalize jobType if provided
    if (updateData.jobType) {
      const normalizedJobType = normalizeJobType(updateData.jobType);
      if (!normalizedJobType) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid jobType. Must be one of: ${VALID_JOB_TYPES.join(', ')}`,
        });
      }
      updateData.jobType = normalizedJobType;
    }

    await jobPost.update(updateData);

    res.status(200).json({
      status: 'success',
      message: 'Job post updated successfully',
      data: jobPost,
    });
  } catch (error) {
    console.error('Error updating job post:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Delete a Job Post
 */
const deleteJobPost = async (req, res) => {
  try {
    const { id } = req.params;

    const jobPost = await JobPost.findByPk(id);

    if (!jobPost) {
      return res.status(404).json({
        status: 'error',
        message: 'Job post not found',
      });
    }

    await jobPost.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Job post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting job post:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get metadata: Unique Technical Skills and Highest Education Year
 */
const getMetadata = async (req, res) => {
  try {
    // 1. Get unique technical skills from all JobPosts
    const jobPosts = await JobPost.findAll({
      attributes: ['technicalSkills'],
    });

    const skillSet = new Set();
    jobPosts.forEach((post) => {
      if (Array.isArray(post.technicalSkills)) {
        post.technicalSkills.forEach((skill) => skillSet.add(skill));
      }
    });

    // 2. Get highest year of passing from HigherEducation
    const highestYear = await HigherEducation.max('endYear');

    res.status(200).json({
      status: 'success',
      data: {
        technicalSkills: Array.from(skillSet).sort(),
        highestEducationYear: highestYear,
      },
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Apply for a Job
 */
const applyForJob = async (req, res) => {
  try {
    const { id: jobPostId } = req.params;
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Enquiry ID not found in token',
      });
    }

    // 1. Check if job exists
    const job = await JobPost.findByPk(jobPostId);
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job post not found',
      });
    }

    // 2. Get student's placement detail ID
    const placement = await Placement.findOne({ where: { enquiryId } });
    if (!placement) {
      return res.status(400).json({
        status: 'error',
        message: 'Placement profile not found. Please complete your profile before applying.',
      });
    }

    // 3. Create application record
    const [application, created] = await StudentPlacementApplied.findOrCreate({
      where: { jobPostId, enquiryId },
      defaults: {
        userPlacementDetailId: placement.id,
        appliedStatus: true
      }
    });

    if (!created) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already applied for this job',
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully',
      data: application
    });

  } catch (error) {
    console.error('Error applying for job:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = {
  createJobPost,
  getJobPosts,
  getJobPostById,
  applyForJob,
  updateJobPost,
  deleteJobPost,
  getMetadata,
};
