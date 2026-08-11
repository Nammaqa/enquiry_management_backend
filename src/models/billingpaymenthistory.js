module.exports = (sequelize, DataTypes) => {
  const formatInvoiceNumber = (id, createdAt = new Date()) => {
    const year = new Date(createdAt).getFullYear();
    return `NQA-${year}${String(id).padStart(6, '0')}`;
  };

  return sequelize.define(
    'BillingPaymentHistory',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      billingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'billings',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      amountPaid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique invoice number generated for each payment transaction',
      },
      paymentMode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'e.g. UPI, CARD, CASH',
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Transaction ID for UPI/Card payments',
      },
      denomination: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Cash denomination e.g. 500x2',
      },
    },
    {
      tableName: 'billing_payment_history',
      freezeTableName: true,
      timestamps: true,
      hooks: {
        beforeValidate: (payment) => {
          if (!payment.invoiceNumber || !payment.invoiceNumber.trim()) {
            const year = new Date(payment.createdAt || new Date()).getFullYear();
            payment.invoiceNumber = `NQA-${year}PENDING-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
          }
        },
        afterCreate: async (payment) => {
          if (!String(payment.invoiceNumber || '').includes('PENDING')) {
            return;
          }

          const generatedInvoiceNumber = formatInvoiceNumber(payment.id, payment.createdAt || new Date());
          await payment.update({ invoiceNumber: generatedInvoiceNumber }, { hooks: false });
        },
      },
    }
  );
};
