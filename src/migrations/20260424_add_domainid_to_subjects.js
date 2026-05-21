'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First remove old domainId column if it exists
    const tableDescription = await queryInterface.describeTable('subjects');
    if (tableDescription.domainId) {
      await queryInterface.removeColumn('subjects', 'domainId');
    }

    // Add domain text column
    if (!tableDescription.domain) {
      await queryInterface.addColumn('subjects', 'domain', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('subjects', 'domain');
  },
};
