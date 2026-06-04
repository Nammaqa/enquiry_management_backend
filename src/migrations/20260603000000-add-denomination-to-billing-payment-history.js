'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('billing_payment_history', 'denomination', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Cash denomination e.g. 500x2',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('billing_payment_history', 'denomination');
  }
};
