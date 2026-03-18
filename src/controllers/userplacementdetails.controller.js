const { 
  Placement, 
  WorkExperience, 
  HigherEducation, 
  Certification, 
  Project,
  JobPost,
  StudentPlacementApplied,
  sequelize 
} = require('../models');

/**
 * Save Unified Placement Data
 * This handles UserPlacementDetail (referenced as Placement in models) and its related associations (WorkExperience, HigherEducation, Certification, Project)
 */
exports.saveUnifiedPlacementData = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ error: 'Unauthorized: Enquiry ID not found in token' });
    }

    const { 
      userPlacementDetail, 
      workExperiences, 
      higherEducations, 
      certifications, 
      projects 
    } = req.body;

    console.log('--- Unified Save Debug ---');
    console.log('Enquiry ID:', enquiryId);
    console.log('UserPlacementDetail Fields:', userPlacementDetail ? Object.keys(userPlacementDetail) : 'none');

    // 4. Field Mapping & Enum Normalization
    if (userPlacementDetail) {
      // Map common field name variations
      const mappings = {
        mobile: 'mobileNumber',
        linkedIn: 'linkedinProfile',
        github: 'githubProfile',
        portfolio: 'portfolioUrl'
      };

      Object.keys(mappings).forEach(key => {
        if (userPlacementDetail[key] && !userPlacementDetail[mappings[key]]) {
          userPlacementDetail[mappings[key]] = userPlacementDetail[key];
        }
      });

      // Normalize ENUMs to lowercase
      ['sslcBoardType', 'sslcResultFormat', 'pucBoardType', 'pucResultFormat'].forEach(field => {
        if (userPlacementDetail[field]) {
          userPlacementDetail[field] = userPlacementDetail[field].toLowerCase();
        }
      });

      // Normalize ARRAYs
      ['languagesKnown', 'technicalSkills', 'softSkills'].forEach(field => {
        if (userPlacementDetail[field]) {
          if (typeof userPlacementDetail[field] === 'string') {
            userPlacementDetail[field] = userPlacementDetail[field].split(',').map(s => s.trim());
          } else if (!Array.isArray(userPlacementDetail[field])) {
            userPlacementDetail[field] = [userPlacementDetail[field]];
          }
        }
      });
    }

    // Helper to clean and normalize association data
    const prepareAssociationData = (data) => {
      if (Array.isArray(data)) {
        data.forEach(item => {
          // Fix empty dates
          ['startDate', 'endDate'].forEach(dateField => {
            if (item[dateField] === '') item[dateField] = null;
          });
          // Fix ENUM casing (resultFormat)
          if (item.resultFormat) item.resultFormat = item.resultFormat.toLowerCase();
          if (item.sslcBoardType) item.sslcBoardType = item.sslcBoardType.toLowerCase();
          if (item.pucBoardType) item.pucBoardType = item.pucBoardType.toLowerCase();
        });
      }
    };

    prepareAssociationData(workExperiences);
    prepareAssociationData(higherEducations);
    prepareAssociationData(certifications);
    prepareAssociationData(projects);

    // 1. Create or Update Placement (UserPlacementDetail)
    let [placementDetail, created] = await Placement.findOrCreate({
      where: { enquiryId },
      defaults: userPlacementDetail,
      transaction: t
    });

    if (!created) {
      await placementDetail.update(userPlacementDetail, { transaction: t });
    }

    const userPlacementDetailId = placementDetail.id;

    // Helper to sync associations (Append new)
    const syncAssociation = async (Model, data, fkName) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const itemsToCreate = data.map(item => ({ ...item, [fkName]: userPlacementDetailId }));
        await Model.bulkCreate(itemsToCreate, { transaction: t });
      }
    };

    // 2. Sync WorkExperience
    await syncAssociation(WorkExperience, workExperiences, 'userPlacementDetailId');

    // 3. Sync HigherEducation
    await syncAssociation(HigherEducation, higherEducations, 'userPlacementDetailId');

    // 4. Sync Certification
    await syncAssociation(Certification, certifications, 'userPlacementDetailId');

    // 5. Sync Project
    await syncAssociation(Project, projects, 'userPlacementDetailId');

    await t.commit();

    res.status(200).json({
      message: 'Placement data saved successfully',
      userPlacementDetailId
    });
  } catch (err) {
    await t.rollback();
    console.error('Unified Save Error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update Unified Placement Data (Edit mode)
 * This replaces existing associated records to reflect the current state of the profile
 */
exports.updateUnifiedPlacementData = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ error: 'Unauthorized: Enquiry ID not found in token' });
    }

    const { 
      userPlacementDetail, 
      workExperiences, 
      higherEducations, 
      certifications, 
      projects 
    } = req.body;

    // Normalization logic (Reuse or extract if needed, but for simplicity re-applying here)
    if (userPlacementDetail) {
      const mappings = {
        mobile: 'mobileNumber',
        linkedIn: 'linkedinProfile',
        github: 'githubProfile',
        portfolio: 'portfolioUrl'
      };

      Object.keys(mappings).forEach(key => {
        if (userPlacementDetail[key] && !userPlacementDetail[mappings[key]]) {
          userPlacementDetail[mappings[key]] = userPlacementDetail[key];
        }
      });

      ['sslcBoardType', 'sslcResultFormat', 'pucBoardType', 'pucResultFormat'].forEach(field => {
        if (userPlacementDetail[field]) {
          userPlacementDetail[field] = userPlacementDetail[field].toLowerCase();
        }
      });

      ['languagesKnown', 'technicalSkills', 'softSkills'].forEach(field => {
        if (userPlacementDetail[field]) {
          if (typeof userPlacementDetail[field] === 'string') {
            userPlacementDetail[field] = userPlacementDetail[field].split(',').map(s => s.trim());
          } else if (!Array.isArray(userPlacementDetail[field])) {
            userPlacementDetail[field] = [userPlacementDetail[field]];
          }
        }
      });
    }

    const prepareAssociationData = (data) => {
      if (Array.isArray(data)) {
        data.forEach(item => {
          ['startDate', 'endDate'].forEach(dateField => {
            if (item[dateField] === '') item[dateField] = null;
          });
          if (item.resultFormat) item.resultFormat = item.resultFormat.toLowerCase();
          if (item.sslcBoardType) item.sslcBoardType = item.sslcBoardType.toLowerCase();
          if (item.pucBoardType) item.pucBoardType = item.pucBoardType.toLowerCase();
        });
      }
    };

    prepareAssociationData(workExperiences);
    prepareAssociationData(higherEducations);
    prepareAssociationData(certifications);
    prepareAssociationData(projects);

    // 1. Find and Update Placement
    let placementDetail = await Placement.findOne({ where: { enquiryId }, transaction: t });
    
    if (!placementDetail) {
      // If none exists, create one
      placementDetail = await Placement.create({ ...userPlacementDetail, enquiryId }, { transaction: t });
    } else {
      await placementDetail.update(userPlacementDetail, { transaction: t });
    }

    const userPlacementDetailId = placementDetail.id;

    // Helper to OVERWRITE associations
    const overwriteAssociation = async (Model, data, fkName) => {
      // 1. Delete existing
      await Model.destroy({ where: { [fkName]: userPlacementDetailId }, transaction: t });
      
      // 2. Create new if provided
      if (data && Array.isArray(data) && data.length > 0) {
        const itemsToCreate = data.map(item => ({ ...item, [fkName]: userPlacementDetailId }));
        await Model.bulkCreate(itemsToCreate, { transaction: t });
      }
    };

    // Sync all associations by overwriting
    await overwriteAssociation(WorkExperience, workExperiences, 'userPlacementDetailId');
    await overwriteAssociation(HigherEducation, higherEducations, 'userPlacementDetailId');
    await overwriteAssociation(Certification, certifications, 'userPlacementDetailId');
    await overwriteAssociation(Project, projects, 'userPlacementDetailId');

    await t.commit();

    res.status(200).json({
      message: 'Placement profile updated successfully',
      userPlacementDetailId
    });
  } catch (err) {
    await t.rollback();
    console.error('Unified Update Error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get Unified Placement Data
 * Fetches the complete placement profile for the authenticated student
 */
exports.getUnifiedPlacementData = async (req, res) => {
  try {
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ error: 'Unauthorized: Enquiry ID not found in token' });
    }

    const placement = await Placement.findOne({
      where: { enquiryId },
      include: [
        { model: WorkExperience, as: 'workExperiences' },
        { model: HigherEducation, as: 'higherEducations' },
        { model: Certification, as: 'certifications' },
        { model: Project, as: 'projects' }
      ]
    });

    if (!placement) {
      return res.status(404).json({ message: 'Placement profile not found for this student' });
    }

    res.status(200).json({
      success: true,
      data: placement
    });
  } catch (err) {
    console.error('Unified Get Error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get All Placements (Admin/Instructor view)
 * Fetches all placement records in the system
 */
exports.getAllPlacements = async (req, res) => {
  try {
    const placements = await Placement.findAll({
      include: [
        { model: WorkExperience, as: 'workExperiences' },
        { model: HigherEducation, as: 'higherEducations' },
        { model: Certification, as: 'certifications' },
        { model: Project, as: 'projects' }
      ]
    });

    res.status(200).json({
      success: true,
      total: placements.length,
      data: placements
    });
  } catch (err) {
    console.error('Get All Placements Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// -------- Individual Model CRUD (Optional but kept for granular updates) --------

// WorkExperience
exports.createWorkExperience = async (req, res) => {
  try {
    const work = await WorkExperience.create(req.body);
    res.status(201).json(work);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getWorkExperiences = async (req, res) => {
  try {
    const { userPlacementDetailId } = req.query;
    const where = userPlacementDetailId ? { userPlacementDetailId } : {};
    const works = await WorkExperience.findAll({ where });
    res.json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// HigherEducation
exports.createHigherEducation = async (req, res) => {
  try {
    const edu = await HigherEducation.create(req.body);
    res.status(201).json(edu);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHigherEducations = async (req, res) => {
  try {
    const { userPlacementDetailId } = req.query;
    const where = userPlacementDetailId ? { userPlacementDetailId } : {};
    const edus = await HigherEducation.findAll({ where });
    res.json(edus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Certification
exports.createCertification = async (req, res) => {
  try {
    const cert = await Certification.create(req.body);
    res.status(201).json(cert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCertifications = async (req, res) => {
  try {
    const { userPlacementDetailId } = req.query;
    const where = userPlacementDetailId ? { userPlacementDetailId } : {};
    const certs = await Certification.findAll({ where });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Project
exports.createProject = async (req, res) => {
  try {
    const proj = await Project.create(req.body);
    res.status(201).json(proj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { userPlacementDetailId } = req.query;
    const where = userPlacementDetailId ? { userPlacementDetailId } : {};
    const projs = await Project.findAll({ where });
    res.json(projs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get Recommended Jobs for Student
 * Matches JobPost technicalSkills with student's technicalSkills
 */
exports.getRecommendedJobs = async (req, res) => {
  try {
    const enquiryId = req.enquiry?.enquiryId;

    if (!enquiryId) {
      return res.status(401).json({ error: 'Unauthorized: Enquiry ID not found in token' });
    }

    // 1. Fetch student's placement details to get skills
    const studentProfile = await Placement.findOne({
      where: { enquiryId },
      attributes: ['technicalSkills']
    });

    if (!studentProfile || !studentProfile.technicalSkills || studentProfile.technicalSkills.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No technical skills found in your profile. Please update your profile to see recommended jobs.',
        data: []
      });
    }

    const studentSkills = studentProfile.technicalSkills.map(s => s.toLowerCase().trim());

    // 2. Fetch all job posts
    const allJobs = await JobPost.findAll({
      order: [['postedAt', 'DESC']]
    });

    // 3. Fetch current student's applications
    const studentApplications = await StudentPlacementApplied.findAll({
      where: { enquiryId },
      attributes: ['jobPostId']
    });

    const appliedJobIds = new Set(studentApplications.map(app => app.jobPostId));

    // 4. Perform matching
    const recommendedJobs = allJobs.map(job => {
      const jobSkills = Array.isArray(job.technicalSkills) ? job.technicalSkills : [];
      const matchingSkills = jobSkills.filter(skill => 
        studentSkills.includes(skill.toLowerCase().trim())
      );

      return {
        ...job.get({ plain: true }),
        matchCount: matchingSkills.length,
        matchingSkills: matchingSkills,
        userApplied: appliedJobIds.has(job.id)
      };
    })
    .filter(job => job.matchCount > 0) // Only include jobs with at least one match
    .sort((a, b) => b.matchCount - a.matchCount); // Sort by highest match count

    res.status(200).json({
      success: true,
      total: recommendedJobs.length,
      data: recommendedJobs
    });

  } catch (err) {
    console.error('Get Recommended Jobs Error:', err);
    res.status(500).json({ error: err.message });
  }
};
