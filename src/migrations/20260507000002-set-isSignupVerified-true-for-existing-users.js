'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Update all existing enquiries to be marked as verified
    await queryInterface.sequelize.query(
      'UPDATE enquiries SET "isSignupVerified" = true WHERE "isSignupVerified" = false'
    );
  },

  async down(queryInterface, Sequelize) {
    // Rollback: set isSignupVerified to false for all records (optional)
    // Commenting out to avoid losing data on rollback
    // await queryInterface.sequelize.query(
    //   'UPDATE enquiries SET "isSignupVerified" = false'
    // );
  }
};

