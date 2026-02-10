'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('assignmentresponses', 'enquiryId');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('assignmentresponses', 'enquiryId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'enquiries', key: 'id' },
      onDelete: 'CASCADE',
    });
  },
};
