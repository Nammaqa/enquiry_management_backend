'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if packageType column already exists
    const tableDescription = await queryInterface.describeTable('packages');

    if (!tableDescription.packageType) {
      await queryInterface.addColumn('packages', 'packageType', {
        type: Sequelize.ENUM('standard', 'others'),
        defaultValue: 'standard',
        allowNull: false,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if packageType column exists before dropping
    const tableDescription = await queryInterface.describeTable('packages');

    if (tableDescription.packageType) {
      await queryInterface.removeColumn('packages', 'packageType');
    }
  },
};
