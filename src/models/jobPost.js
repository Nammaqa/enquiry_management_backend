module.exports = (sequelize, DataTypes) => {
  const JobPost = sequelize.define(
    'JobPost',
    {
      companyName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      companyLogo: {
        type: DataTypes.TEXT, // For base64 data URL
        allowNull: true,
      },
      jobTitle: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      workMode: {
        type: DataTypes.ENUM('Remote', 'On-site', 'Hybrid'),
        allowNull: false,
      },
      jobType: {
        type: DataTypes.ENUM('Full-time', 'Part-time', 'Internship', 'Contract'),
        allowNull: false,
      },
      about: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      jobDescription: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      preferredExperience: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      technicalSkills: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      postedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'job_posts',
      freezeTableName: true,
    }
  );

  return JobPost;
};
