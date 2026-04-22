module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'Package',
    {
      name: DataTypes.STRING,
      code: DataTypes.STRING,
      image: DataTypes.STRING,
      overview: DataTypes.JSON,
      syllabus: DataTypes.JSON,
      prerequisites: DataTypes.JSON,
      startDate: DataTypes.DATE,
      fees: DataTypes.INTEGER,
      packageType: {
        type: DataTypes.ENUM('standard', 'others'),
        defaultValue: 'standard',
        allowNull: false,
      },
    },
    {
      tableName: 'packages',
      freezeTableName: true,
    }
  );
};
