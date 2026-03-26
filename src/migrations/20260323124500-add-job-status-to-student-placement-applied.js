'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('student_placement_applied', 'job_status', {
      type: Sequelize.ENUM('in-progress', 'selected', 'rejected'),
      defaultValue: 'in-progress'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('student_placement_applied', 'job_status');
    // Note: To truly remove an ENUM type in Postgres, more steps are required, 
    // but column removal is usually sufficient for a simple undo.
  }
};
