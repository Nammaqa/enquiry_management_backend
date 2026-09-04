module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'BatchStudent',
    {
      batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'batches', key: 'id' },
        onDelete: 'CASCADE',
      },
      enquiryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'enquiries', key: 'id' },
        onDelete: 'CASCADE',
      },
      mode: {
        type: DataTypes.ENUM('online', 'offline'),
        allowNull: true,
        defaultValue: 'online',
      }
    },
    {
      tableName: 'batchstudents',
      freezeTableName: true,
    }
  );
};
