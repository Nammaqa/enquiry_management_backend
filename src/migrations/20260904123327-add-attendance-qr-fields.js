
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('batchstudents', 'mode', {
      type: Sequelize.ENUM('online', 'offline'),
      allowNull: true,
      defaultValue: 'online'
    });

    await queryInterface.addColumn('batches', 'latitude', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    await queryInterface.addColumn('batches', 'longitude', {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    await queryInterface.addColumn('batches', 'offlineQr', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('batchstudents', 'mode');
    await queryInterface.removeColumn('batches', 'latitude');
    await queryInterface.removeColumn('batches', 'longitude');
    await queryInterface.removeColumn('batches', 'offlineQr');
  }
};

