'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('billings', 'transaction_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Transaction ID for the payment',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('billings', 'transaction_id');
  }
};
