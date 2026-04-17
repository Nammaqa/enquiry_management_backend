'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add fees column to packages table if it doesn't exist
    const packageTable = await queryInterface.describeTable('packages');
    
    if (!packageTable.fees) {
      await queryInterface.addColumn('packages', 'fees', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      });
      console.log('✓ Added fees column to packages table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove fees column from packages table
    const packageTable = await queryInterface.describeTable('packages');
    
    if (packageTable.fees) {
      await queryInterface.removeColumn('packages', 'fees');
      console.log('✓ Removed fees column from packages table');
    }
  },
};
