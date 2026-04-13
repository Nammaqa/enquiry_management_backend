'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('job_posts', 'preferredExperience', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('job_posts', 'preferredExperience', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
