'use strict';

const formatInvoiceNumber = (id, createdAt = new Date()) => {
  const year = new Date(createdAt).getFullYear();
  return `NQA-${year}${String(id).padStart(6, '0')}`;
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('billing_payment_history');

    if (!table.invoiceNumber) {
      await queryInterface.addColumn('billing_payment_history', 'invoiceNumber', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Unique invoice number generated for each payment transaction',
      });
    }

    const [payments] = await queryInterface.sequelize.query(
      'SELECT id, "createdAt" FROM billing_payment_history ORDER BY id ASC'
    );

    for (const payment of payments) {
      const invoiceNumber = formatInvoiceNumber(payment.id, payment.createdAt || new Date());
      await queryInterface.sequelize.query(
        'UPDATE billing_payment_history SET "invoiceNumber" = :invoiceNumber WHERE id = :id',
        {
          replacements: { invoiceNumber, id: payment.id },
        }
      );
    }

    await queryInterface.changeColumn('billing_payment_history', 'invoiceNumber', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Unique invoice number generated for each payment transaction',
    });

    await queryInterface.addConstraint('billing_payment_history', {
      fields: ['invoiceNumber'],
      type: 'unique',
      name: 'billing_payment_history_invoiceNumber_unique',
    });
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('billing_payment_history');

    if (table.invoiceNumber) {
      await queryInterface.removeConstraint(
        'billing_payment_history',
        'billing_payment_history_invoiceNumber_unique'
      ).catch(() => {});
      await queryInterface.removeColumn('billing_payment_history', 'invoiceNumber');
    }
  },
};
