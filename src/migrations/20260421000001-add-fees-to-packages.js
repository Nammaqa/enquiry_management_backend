'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if fees column already exists
    const tableDescription = await queryInterface.describeTable('packages');

    if (!tableDescription.fees) {
      await queryInterface.addColumn('packages', 'fees', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if fees column exists before dropping
    const tableDescription = await queryInterface.describeTable('packages');

    if (tableDescription.fees) {
      await queryInterface.removeColumn('packages', 'fees');
    }
  },
};
