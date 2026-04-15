"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns already exist before adding
    const table = await queryInterface.describeTable("batches");
    
    if (!table.sessionEndDate) {
      await queryInterface.addColumn("batches", "sessionEndDate", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    
    if (!table.sessionQr) {
      await queryInterface.addColumn("batches", "sessionQr", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("batches", "sessionEndDate");
    await queryInterface.removeColumn("batches", "sessionQr");
  },
};
