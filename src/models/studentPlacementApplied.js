const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudentPlacementApplied extends Model {
    static associate(models) {
      StudentPlacementApplied.belongsTo(models.JobPost, { foreignKey: 'jobPostId', as: 'jobPost' });
      StudentPlacementApplied.belongsTo(models.Enquiry, { foreignKey: 'enquiryId', as: 'enquiry' });
      StudentPlacementApplied.belongsTo(models.Placement, { foreignKey: 'userPlacementDetailId', as: 'userPlacementDetail' });
    }
  }

  StudentPlacementApplied.init({
    jobPostId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    enquiryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userPlacementDetailId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    appliedStatus: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    job_status: {
      type: DataTypes.ENUM('in-progress', 'selected', 'rejected'),
      defaultValue: 'in-progress'
    }
  }, {
    sequelize,
    modelName: 'StudentPlacementApplied',
    tableName: 'student_placement_applied'
  });

  return StudentPlacementApplied;
};
