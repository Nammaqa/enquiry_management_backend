'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('assignments');
    if (tableDescription.reviewedBy) {
      await queryInterface.removeColumn('assignments', 'reviewedBy');
      console.log('Removed reviewedBy column from assignments table');
    } else {
      console.log('reviewedBy column does not exist in assignments table, skipping removal');
    }
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('assignments', 'reviewedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });
  },
};
