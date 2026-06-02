module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'Package',
    {
      name: DataTypes.STRING,
      code: {
        type: DataTypes.STRING,
        unique: true,
      },
      description: DataTypes.TEXT,
      type: DataTypes.STRING,
      duration: DataTypes.INTEGER,
      image: DataTypes.STRING,
      overview: DataTypes.JSON,
      syllabus: DataTypes.JSON,
      prerequisites: DataTypes.JSON,
      startDate: DataTypes.DATE,
      domain: DataTypes.TEXT,
      mode: DataTypes.TEXT,
    },
    {
      tableName: 'packages',
      freezeTableName: true,
    }
  );
};
