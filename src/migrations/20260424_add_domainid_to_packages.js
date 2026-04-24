'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First remove old domainId column if it exists
    const tableDescription = await queryInterface.describeTable('packages');
    if (tableDescription.domainId) {
      await queryInterface.removeColumn('packages', 'domainId');
    }

    // Add domain text column
    if (!tableDescription.domain) {
      await queryInterface.addColumn('packages', 'domain', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('packages', 'domain');
  },
};
