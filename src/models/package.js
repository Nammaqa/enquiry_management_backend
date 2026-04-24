module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'Package',
    {
      name: DataTypes.STRING,
      code: DataTypes.STRING,
      description: DataTypes.TEXT,
      type: DataTypes.STRING,
      duration: DataTypes.INTEGER,
      image: DataTypes.STRING,
      overview: DataTypes.JSON,
      syllabus: DataTypes.JSON,
      prerequisites: DataTypes.JSON,
      startDate: DataTypes.DATE,
      fees: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      tableName: 'packages',
      freezeTableName: true,
    }
  );
};
