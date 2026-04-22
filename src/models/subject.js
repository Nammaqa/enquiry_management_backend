module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'Subject',
    {
      name: DataTypes.STRING,
      code:DataTypes.STRING,
      image: DataTypes.STRING,
      overview: DataTypes.JSON,
      syllabus: DataTypes.JSON,
      prerequisites: DataTypes.JSON,
      startDate: DataTypes.DATE,
      fees:DataTypes.INTEGER
    },
    {
      tableName: 'subjects',
      freezeTableName: true,
    }
  );
};
