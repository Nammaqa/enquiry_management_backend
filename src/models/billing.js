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
    }
  );
};
