module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'Doubt',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ticketCode: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'batches', key: 'id' },
        onDelete: 'CASCADE',
      },
      subjectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'subjects', key: 'id' },
        onDelete: 'SET NULL',
      },
      enquiryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'enquiries', key: 'id' },
        onDelete: 'CASCADE',
      },
      instructorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      topic: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('open', 'answered', 'resolved'),
        allowNull: false,
        defaultValue: 'open',
      },
      answer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      answeredBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      answeredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'doubts',
      freezeTableName: true,
      timestamps: true,
    }
  );
};
