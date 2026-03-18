'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('job_posts', 'technicalSkills', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('job_posts', 'technicalSkills');
  },
};
