'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('job_posts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      companyName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      companyLogo: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      jobTitle: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      location: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      workMode: {
        type: Sequelize.ENUM('Remote', 'On-site', 'Hybrid'),
        allowNull: false,
      },
      jobType: {
        type: Sequelize.ENUM('Full-time', 'Part-time', 'Internship', 'Contract'),
        allowNull: false,
      },
      about: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      jobDescription: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      preferredExperience: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      postedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('job_posts');
  },
};
