module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'AssignmentResponse',
    {
      assignmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'assignments', key: 'id' },
      },
      batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'batches', key: 'id' },
      },
      // enquiryId removed: assignment responses are now batch-based only
      submittedOn: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      submissionNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submissionFile: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('assigned', 'submitted', 'reviewed'),
        defaultValue: 'assigned',
      },
      reviewedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      reviewedOn: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      instructorComments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'assignmentresponses',
      freezeTableName: true,
    }
  );
};
