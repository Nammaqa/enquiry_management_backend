const { JobPost } = require('../models');

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
    } = req.body;

    // Basic validation
    if (!companyName || !jobTitle || !location || !workMode || !jobType || !jobDescription) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
      });
    }

    const jobPost = await JobPost.create({
      companyName,
      companyLogo,
      jobTitle,
      location,
      workMode,
      jobType,
      about,
      jobDescription,
      preferredExperience,
      postedAt: new Date(),
    });

    res.status(201).json({
      status: 'success',
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

    await jobPost.update(updateData);

    res.status(200).json({
      status: 'success',
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

module.exports = {
  createJobPost,
  getJobPosts,
  updateJobPost,
  deleteJobPost,
};
