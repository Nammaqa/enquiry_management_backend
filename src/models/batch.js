module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'Batch',
    {
      name: DataTypes.STRING,
      code: {
        type: DataTypes.STRING,
        unique: true,
      },
      status: DataTypes.ENUM('yet to start', 'In progress', 'completed'),
      sessionLink: DataTypes.STRING,
      sessionStartDate: DataTypes.DATE,
      sessionEndDate: DataTypes.DATE,
      sessionTime: DataTypes.STRING,
      sessionQr: DataTypes.TEXT, 
      numberOfStudents: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      approvalStatus: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: true,
        defaultValue: 'pending',
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      instructorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'subjects', key: 'id' },
      },
    },
    {
      tableName: 'batches',
      freezeTableName: true,
    }
  );
};
