'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('billing_payment_history', 'posReceiptUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Cloudinary URL for Card POS receipt',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('billing_payment_history', 'posReceiptUrl');
  }
};
