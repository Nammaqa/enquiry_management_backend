'use strict';

const formatInvoiceNumber = (id, createdAt = new Date()) => {
  const year = new Date(createdAt).getFullYear();
  return `NQA-${year}${String(id).padStart(6, '0')}`;
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('billings');

    if (!table.invoiceNumber) {
      await queryInterface.addColumn('billings', 'invoiceNumber', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        defaultValue: '',
        comment: 'Unique invoice number generated for each billing',
      });
    }

    

    const [billings] = await queryInterface.sequelize.query(
      'SELECT id, "createdAt" FROM billings ORDER BY id ASC'
    );

    for (const billing of billings) {
      const invoiceNumber = formatInvoiceNumber(billing.id, billing.createdAt || new Date());
      await queryInterface.sequelize.query(
        'UPDATE billings SET "invoiceNumber" = :invoiceNumber WHERE id = :id',
        {
          replacements: { invoiceNumber, id: billing.id },
        }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('billings', 'invoiceNumber');
  },
};
