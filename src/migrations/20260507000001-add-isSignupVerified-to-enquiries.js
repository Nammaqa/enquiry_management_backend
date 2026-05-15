'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const table = await queryInterface.describeTable('enquiries');
    
    if (!table.isSignupVerified) {
      // Add isSignupVerified column to enquiries table only if it doesn't exist
      await queryInterface.addColumn('enquiries', 'isSignupVerified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove isSignupVerified column if migration is rolled back
    const table = await queryInterface.describeTable('enquiries');
    
    if (table.isSignupVerified) {
      await queryInterface.removeColumn('enquiries', 'isSignupVerified');
    }
  }
};

