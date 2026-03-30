const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database').development;

const sequelize = new Sequelize(config);

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = require('./user')(sequelize, DataTypes);
db.Subject = require('./subject')(sequelize, DataTypes);
db.Package = require('./package')(sequelize, DataTypes);
db.Batch = require('./batch')(sequelize, DataTypes);
db.Enquiry = require('./enquiry')(sequelize, DataTypes);
db.Log = require('./log')(sequelize, DataTypes);
db.Billing = require('./billing')(sequelize, DataTypes);
db.Review = require('./review')(sequelize, DataTypes);
db.Instructor = require('./instructorProfile')(sequelize, DataTypes);
db.Assignment = require('./assignment')(sequelize, DataTypes);
db.AssignmentResponse = require('./assignmentresponse')(sequelize, DataTypes);
db.MockInterview = require('./mockInterview')(sequelize, DataTypes);
db.Material = require('./material')(sequelize, DataTypes);
db.Feedback = require('./feedback')(sequelize, DataTypes);
db.JobPost = require('./jobPost')(sequelize, DataTypes);
db.BatchStudent = require('./batchstudent')(sequelize, DataTypes);
db.InstructorSubject = require('./instructorsubject')(sequelize, DataTypes);
db.Attendance = require('./attendance')(sequelize, DataTypes);
db.Placement = require('./userplacementdetails')(sequelize, DataTypes);
db.WorkExperience = require('./workexperience')(sequelize, DataTypes);
db.HigherEducation = require('./highereducation')(sequelize, DataTypes);
db.Certification = require('./certification')(sequelize, DataTypes);
db.Project = require('./project')(sequelize, DataTypes);
db.StudentPlacementApplied = require('./studentPlacementApplied')(sequelize, DataTypes);

// ONE-TO-MANY: Placement has many WorkExperiences
db.Placement.hasMany(db.WorkExperience, {
	foreignKey: 'userPlacementDetailId',
	as: 'workExperiences',
	onDelete: 'CASCADE',
});
db.WorkExperience.belongsTo(db.Placement, {
	foreignKey: 'userPlacementDetailId',
	as: 'userPlacementDetail',
});

// ONE-TO-MANY: Placement has many HigherEducations
db.Placement.hasMany(db.HigherEducation, {
	foreignKey: 'userPlacementDetailId',
	as: 'higherEducations',
	onDelete: 'CASCADE',
});
db.HigherEducation.belongsTo(db.Placement, {
	foreignKey: 'userPlacementDetailId',
	as: 'userPlacementDetail',
});

// ONE-TO-MANY: Placement has many Certifications
db.Placement.hasMany(db.Certification, {
	foreignKey: 'userPlacementDetailId',
	as: 'certifications',
	onDelete: 'CASCADE',
});
db.Certification.belongsTo(db.Placement, {
	foreignKey: 'userPlacementDetailId',
	as: 'userPlacementDetail',
});

// ONE-TO-MANY: Placement has many Projects
db.Placement.hasMany(db.Project, {
	foreignKey: 'userPlacementDetailId',
	as: 'projects',
	onDelete: 'CASCADE',
});
db.Project.belongsTo(db.Placement, {
	foreignKey: 'userPlacementDetailId',
	as: 'userPlacementDetail',
});

// ONE-TO-MANY: User (Creator) creates many Batches
db.User.hasMany(db.Batch, {
	foreignKey: 'createdBy',
	onDelete: 'SET NULL',
});
db.Batch.belongsTo(db.User, {
	foreignKey: 'createdBy',
	as: 'creator',
});

// ONE-TO-MANY: User (Instructor) teaches many Batches
db.User.hasMany(db.Batch, {
	foreignKey: 'instructorId',
	onDelete: 'SET NULL',
});
db.Batch.belongsTo(db.User, {
	foreignKey: 'instructorId',
	as: 'instructor',
});

// ONE-TO-MANY: Subject has many Batches
db.Subject.hasMany(db.Batch, {
	foreignKey: 'subjectId',
	onDelete: 'CASCADE',
});
db.Batch.belongsTo(db.Subject, {
	foreignKey: 'subjectId',
	as: 'subject',
});

// ONE-TO-MANY: Batch has many Enquiries (students)
db.Batch.hasMany(db.Enquiry, {
	foreignKey: 'batchId',
	onDelete: 'SET NULL',
});
db.Enquiry.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});

// MANY-TO-MANY: Batch <-> Enquiry through BatchStudent
db.Batch.belongsToMany(db.Enquiry, {
	through: db.BatchStudent,
	foreignKey: 'batchId',
	otherKey: 'enquiryId',
	as: 'enrolledStudents',
});
db.Enquiry.belongsToMany(db.Batch, {
	through: db.BatchStudent,
	foreignKey: 'enquiryId',
	otherKey: 'batchId',
	as: 'enrolledBatches',
});

// ONE-TO-MANY: BatchStudent belongs to Enquiry
db.BatchStudent.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
	as: 'enquiry',
});
db.Enquiry.hasMany(db.BatchStudent, {
	foreignKey: 'enquiryId',
	as: 'batchStudents',
});

// ONE-TO-MANY: BatchStudent belongs to Batch
db.BatchStudent.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});
db.Batch.hasMany(db.BatchStudent, {
	foreignKey: 'batchId',
	as: 'batchStudents',
});

// ONE-TO-MANY: Package has many Enquiries
db.Package.hasMany(db.Enquiry, {
	foreignKey: 'packageId',
	onDelete: 'SET NULL',
});
db.Enquiry.belongsTo(db.Package, {
	foreignKey: 'packageId',
	as: 'package',
});

// ONE-TO-MANY: Subject has many Reviews
db.Subject.hasMany(db.Review, {
	foreignKey: 'subjectId',
	onDelete: 'CASCADE',
});
db.Review.belongsTo(db.Subject, {
	foreignKey: 'subjectId',
	as: 'subject',
});

// ONE-TO-MANY: Package has many Reviews
db.Package.hasMany(db.Review, {
	foreignKey: 'packageId',
	onDelete: 'CASCADE',
});
db.Review.belongsTo(db.Package, {
	foreignKey: 'packageId',
	as: 'package',
});

// ONE-TO-MANY: Batch has many Assignments
db.Batch.hasMany(db.Assignment, {
	foreignKey: 'batchId',
	onDelete: 'CASCADE',
	as: 'assignments',
});
db.Assignment.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});

// ONE-TO-MANY: Subject has many Assignments
db.Subject.hasMany(db.Assignment, {
	foreignKey: 'subjectId',
	onDelete: 'CASCADE',
	as: 'assignments',
});
db.Assignment.belongsTo(db.Subject, {
	foreignKey: 'subjectId',
	as: 'subject',
});

// ONE-TO-MANY: User (Instructor) creates many Assignments
db.User.hasMany(db.Assignment, {
	foreignKey: 'createdBy',
	onDelete: 'CASCADE',
	as: 'createdAssignments',
});
db.Assignment.belongsTo(db.User, {
	foreignKey: 'createdBy',
	as: 'instructor',
});

// ONE-TO-MANY: Assignment has many AssignmentResponses
db.Assignment.hasMany(db.AssignmentResponse, {
	foreignKey: 'assignmentId',
	onDelete: 'CASCADE',
	as: 'responses',
});
db.AssignmentResponse.belongsTo(db.Assignment, {
	foreignKey: 'assignmentId',
	as: 'assignment',
});

// ONE-TO-MANY: Batch has many AssignmentResponses
db.Batch.hasMany(db.AssignmentResponse, {
	foreignKey: 'batchId',
	onDelete: 'CASCADE',
	as: 'assignmentResponses',
});
db.AssignmentResponse.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});

// ONE-TO-MANY: Enquiry has many AssignmentResponses
db.Enquiry.hasMany(db.AssignmentResponse, {
	foreignKey: 'enquiryId',
	onDelete: 'CASCADE',
	as: 'assignmentResponses',
});
db.AssignmentResponse.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
	as: 'enquiry',
});

// ONE-TO-MANY: User (Reviewer) reviews many AssignmentResponses
db.User.hasMany(db.AssignmentResponse, {
	foreignKey: 'reviewedBy',
	onDelete: 'SET NULL',
	as: 'reviewedAssignmentResponses',
});
db.AssignmentResponse.belongsTo(db.User, {
	foreignKey: 'reviewedBy',
	as: 'reviewer',
});

// ONE-TO-MANY: Batch has many Mock Interviews
db.Batch.hasMany(db.MockInterview, {
	foreignKey: 'batchId',
	onDelete: 'CASCADE',
	as: 'mockInterviews',
});
db.MockInterview.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});

// ONE-TO-MANY: Enquiry has many Mock Interviews
db.Enquiry.hasMany(db.MockInterview, {
	foreignKey: 'enquiryId',
	onDelete: 'CASCADE',
	as: 'mockInterviews',
});
db.MockInterview.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
	as: 'enquiry',
});

// ONE-TO-MANY: User (Instructor) schedules many Mock Interviews
db.User.hasMany(db.MockInterview, {
	foreignKey: 'instructorId',
	onDelete: 'CASCADE',
	as: 'scheduledMockInterviews',
});
db.MockInterview.belongsTo(db.User, {
	foreignKey: 'instructorId',
	as: 'instructor',
});

// ONE-TO-MANY: Subject has many Materials
db.Subject.hasMany(db.Material, {
	foreignKey: 'subjectId',
	onDelete: 'CASCADE',
	as: 'materials',
});
db.Material.belongsTo(db.Subject, {
	foreignKey: 'subjectId',
	as: 'subject',
});

// ONE-TO-MANY: Batch has many Materials
db.Batch.hasMany(db.Material, {
	foreignKey: 'batchId',
	onDelete: 'CASCADE',
	as: 'materials',
});
db.Material.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});

// ONE-TO-MANY: User (Instructor) uploads many Materials
db.User.hasMany(db.Material, {
	foreignKey: 'instructorId',
	onDelete: 'CASCADE',
	as: 'uploadedMaterials',
});
db.Material.belongsTo(db.User, {
	foreignKey: 'instructorId',
	as: 'instructor',
});

// ONE-TO-MANY: Enquiry provides many Feedbacks
db.Enquiry.hasMany(db.Feedback, {
	foreignKey: 'enquiryId',
	onDelete: 'CASCADE',
	as: 'feedbacks',
});
db.Feedback.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
	as: 'enquiry',
});

// ONE-TO-MANY: User (Instructor) receives many Feedbacks
db.User.hasMany(db.Feedback, {
	foreignKey: 'instructorId',
	onDelete: 'CASCADE',
	as: 'receivedFeedbacks',
});
db.Feedback.belongsTo(db.User, {
	foreignKey: 'instructorId',
	as: 'instructor',
});

// ONE-TO-MANY: Batch has many Feedbacks
db.Batch.hasMany(db.Feedback, {
	foreignKey: 'batchId',
	onDelete: 'CASCADE',
	as: 'feedbacks',
});
db.Feedback.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});

// MANY-TO-MANY: Instructor <-> Subject through InstructorSubject
db.User.belongsToMany(db.Subject, {
	through: db.InstructorSubject,
	foreignKey: 'instructorId',
	otherKey: 'subjectId',
	as: 'subjects',
});
db.Subject.belongsToMany(db.User, {
	through: db.InstructorSubject,
	foreignKey: 'subjectId',
	otherKey: 'instructorId',
	as: 'instructors',
});

// ONE-TO-MANY: Enquiry has many Attendances
db.Enquiry.hasMany(db.Attendance, {
	foreignKey: 'enquiryId',
	onDelete: 'CASCADE',
	as: 'attendances',
});
db.Attendance.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
	as: 'enquiry',
});

// ONE-TO-MANY: User creates many Logs
db.User.hasMany(db.Log, {
	foreignKey: 'userId',
	onDelete: 'CASCADE',
	as: 'logs',
});
db.Log.belongsTo(db.User, {
	foreignKey: 'userId',
	as: 'user',
});

// ONE-TO-MANY: Enquiry has many Logs
db.Enquiry.hasMany(db.Log, {
	foreignKey: 'enquiryId',
	onDelete: 'CASCADE',
	as: 'logs',
});
db.Log.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
	as: 'enquiry',
});

// ONE-TO-MANY: Batch has many Attendances
db.Batch.hasMany(db.Attendance, {
	foreignKey: 'batchId',
	onDelete: 'CASCADE',
	as: 'attendances',
});
db.Attendance.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});

// ONE-TO-MANY: Subject has many Attendances
db.Subject.hasMany(db.Attendance, {
	foreignKey: 'subjectId',
	onDelete: 'CASCADE',
	as: 'attendances',
});
db.Attendance.belongsTo(db.Subject, {
	foreignKey: 'subjectId',
	as: 'subject',
});

// ONE-TO-MANY: User (Instructor) has many Attendances
db.User.hasMany(db.Attendance, {
	foreignKey: 'instructorId',
	onDelete: 'CASCADE',
	as: 'attendances',
});
db.Attendance.belongsTo(db.User, {
	foreignKey: 'instructorId',
	as: 'instructor',
});

// MANY-TO-MANY: Package <-> Subject through PackageSubjects
db.Package.belongsToMany(db.Subject, {
	through: 'PackageSubjects',
	foreignKey: 'packageId',
	otherKey: 'subjectId',
	as: 'subjects',
});
db.Subject.belongsToMany(db.Package, {
	through: 'PackageSubjects',
	foreignKey: 'subjectId',
	otherKey: 'packageId',
	as: 'packages',
});

// ONE-TO-ONE: Enquiry has one Billing
db.Enquiry.hasOne(db.Billing, {
	foreignKey: 'enquiryId',
	onDelete: 'CASCADE',
	as: 'billing',
});
db.Billing.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
	as: 'enquiry',
});

// JOB APPLICATIONS
db.Enquiry.hasMany(db.StudentPlacementApplied, { foreignKey: 'enquiryId', as: 'jobApplications' });
db.StudentPlacementApplied.belongsTo(db.Enquiry, { foreignKey: 'enquiryId', as: 'enquiry' });

db.JobPost.hasMany(db.StudentPlacementApplied, { foreignKey: 'jobPostId', as: 'applications' });
db.StudentPlacementApplied.belongsTo(db.JobPost, { foreignKey: 'jobPostId', as: 'jobPost' });

db.Placement.hasMany(db.StudentPlacementApplied, { foreignKey: 'userPlacementDetailId', as: 'jobApplications' });
db.StudentPlacementApplied.belongsTo(db.Placement, { foreignKey: 'userPlacementDetailId', as: 'userPlacementDetail' });

module.exports = db;
