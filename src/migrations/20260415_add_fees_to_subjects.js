'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add fees column to subjects table if it doesn't exist
    const subjectTable = await queryInterface.describeTable('subjects');
    
    if (!subjectTable.fees) {
      await queryInterface.addColumn('subjects', 'fees', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      });
      console.log('✓ Added fees column to subjects table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove fees column from subjects table
    const subjectTable = await queryInterface.describeTable('subjects');
    
    if (subjectTable.fees) {
      await queryInterface.removeColumn('subjects', 'fees');
      console.log('✓ Removed fees column from subjects table');
    }
  },
};
