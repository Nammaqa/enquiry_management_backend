const formatInvoiceNumber = (id, createdAt = new Date()) => {
  const year = new Date(createdAt).getFullYear();
  return `NQA-${year}${String(id).padStart(6, '0')}`;
};

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'Billing',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      enquiryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'enquiries',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      packageCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      amountPaid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      gst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true, 
        defaultValue: 0,
        comment: 'GST percentage or amount',
      },
      gstAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Calculated GST amount',
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique invoice number generated for each billing',
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Transaction ID for the payment',
      },
      packageType: {
        type: DataTypes.ENUM('package', 'individual'),
        allowNull: false,
        defaultValue: 'package',
        comment: 'Whether billing is for predefined package or individual subjects',
      },
      subjectIds: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of subject IDs for individual subject selection',
      },
      subjectWiseBreakdown: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Breakdown of costs per subject: [{subjectId, subjectName, fee, paid, balance}]',
      },
    },
    {
      tableName: 'billings',
      freezeTableName: true,
      timestamps: true,
      hooks: {
        beforeCreate: (billing) => {
          if (!billing.invoiceNumber || !billing.invoiceNumber.trim()) {
            billing.invoiceNumber = formatInvoiceNumber(0, billing.createdAt || new Date());
          }
        },
        afterCreate: async (billing) => {
          if (billing.invoiceNumber !== formatInvoiceNumber(0, billing.createdAt || new Date())) {
            return;
          }

          const generatedInvoiceNumber = formatInvoiceNumber(billing.id, billing.createdAt || new Date());
          await billing.update({ invoiceNumber: generatedInvoiceNumber }, { hooks: false });
        },
      },
    }
  );
};
