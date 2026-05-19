'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add collegeName column to enquiries table
    await queryInterface.addColumn('enquiries', 'collegeName', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove collegeName column if migration is rolled back
    await queryInterface.removeColumn('enquiries', 'collegeName');
  }
};
