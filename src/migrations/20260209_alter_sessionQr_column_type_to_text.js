'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('batches', 'sessionQr', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('batches', 'sessionQr', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
