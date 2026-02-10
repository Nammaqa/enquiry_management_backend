'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('assignments', 'reviewedBy');
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
