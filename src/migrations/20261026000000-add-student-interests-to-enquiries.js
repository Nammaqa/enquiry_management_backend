'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('enquiries', 'learningFields', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn('enquiries', 'occupations', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn('enquiries', 'skills', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn('enquiries', 'interestsCompletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('enquiries', 'interestsCompletedAt');
    await queryInterface.removeColumn('enquiries', 'skills');
    await queryInterface.removeColumn('enquiries', 'occupations');
    await queryInterface.removeColumn('enquiries', 'learningFields');
  },
};
