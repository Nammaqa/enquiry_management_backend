module.exports = (sequelize, DataTypes) => {
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
    }
  );
};
