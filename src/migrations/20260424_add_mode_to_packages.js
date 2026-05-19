'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add mode text column
    const tableDescription = await queryInterface.describeTable('packages');
    if (!tableDescription.mode) {
      await queryInterface.addColumn('packages', 'mode', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('packages', 'mode');
  },
};
