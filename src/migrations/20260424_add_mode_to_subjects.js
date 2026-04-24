'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add mode text column
    const tableDescription = await queryInterface.describeTable('subjects');
    if (!tableDescription.mode) {
      await queryInterface.addColumn('subjects', 'mode', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('subjects', 'mode');
  },
};
