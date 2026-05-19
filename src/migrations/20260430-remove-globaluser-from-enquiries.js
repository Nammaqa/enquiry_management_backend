'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove globalUser column from enquiries table
    await queryInterface.removeColumn('enquiries', 'globalUser');
  },

  async down(queryInterface, Sequelize) {
    // Restore globalUser column if migration is rolled back
    await queryInterface.addColumn('enquiries', 'globalUser', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });
  }
};
