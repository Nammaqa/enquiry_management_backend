'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove fees column from packages table
    await queryInterface.removeColumn('packages', 'fees');
  },

  async down(queryInterface, Sequelize) {
    // Restore fees column if migration is rolled back
    await queryInterface.addColumn('packages', 'fees', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    });
  }
};
