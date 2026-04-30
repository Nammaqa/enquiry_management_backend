'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove fees column from subjects table
    await queryInterface.removeColumn('subjects', 'fees');
  },

  async down(queryInterface, Sequelize) {
    // Restore fees column if migration is rolled back
    await queryInterface.addColumn('subjects', 'fees', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    });
  }
};
