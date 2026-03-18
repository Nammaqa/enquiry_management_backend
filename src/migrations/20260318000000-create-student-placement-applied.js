'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('student_placement_applied', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      jobPostId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'job_posts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      enquiryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'enquiries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userPlacementDetailId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'userplacementdetails',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      appliedStatus: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Composite unique constraint to prevent multiple applications for the same job by the same student
    await queryInterface.addConstraint('student_placement_applied', {
      fields: ['jobPostId', 'enquiryId'],
      type: 'unique',
      name: 'unique_job_enquiry_application'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('student_placement_applied');
  }
};
