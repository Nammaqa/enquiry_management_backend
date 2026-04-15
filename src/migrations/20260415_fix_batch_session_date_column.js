'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove old sessionDate column if it exists
    const batchTable = await queryInterface.describeTable('batches');
    
    if (batchTable.sessionDate) {
      await queryInterface.removeColumn('batches', 'sessionDate');
    }
    
    // Ensure sessionStartDate exists
    if (!batchTable.sessionStartDate) {
      await queryInterface.addColumn('batches', 'sessionStartDate', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: add sessionDate back and remove sessionStartDate
    const batchTable = await queryInterface.describeTable('batches');
    
    if (!batchTable.sessionDate) {
      await queryInterface.addColumn('batches', 'sessionDate', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    
    if (batchTable.sessionStartDate) {
      await queryInterface.removeColumn('batches', 'sessionStartDate');
    }
  },
};
