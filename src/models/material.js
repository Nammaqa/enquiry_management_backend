module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'Material',
    {
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'subjects', key: 'id' },
      },
      batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'batches', key: 'id' },
      },
      instructorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      documentUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      documentName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      uploadedOn: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'materials',
      freezeTableName: true,
    }
  );
};
