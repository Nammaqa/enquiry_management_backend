'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('enquiries', 'globalUser');
      console.log('Successfully removed globalUser column');
    } catch (error) {
      console.log('Column globalUser might not exist, skipping. Error:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Restore globalUser column if migration is rolled back
    await queryInterface.addColumn('enquiries', 'globalUser', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });
  }
};
