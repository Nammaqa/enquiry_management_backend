'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add targetedFees column to enquiries table as JSON type
    await queryInterface.addColumn('enquiries', 'targetedFees', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove targetedFees column if migration is rolled back
    await queryInterface.removeColumn('enquiries', 'targetedFees');
  }
};
