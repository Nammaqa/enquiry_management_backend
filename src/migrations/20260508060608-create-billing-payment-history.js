'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('billing_payment_history', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      billingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'billings',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      amountPaid: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      paymentMode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('billing_payment_history');
  }
};
