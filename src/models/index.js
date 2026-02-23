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
db.BatchStudent = require('./batchstudent')(sequelize, DataTypes);

db.InstructorSubject = require('./instructorsubject')(sequelize, DataTypes);
db.Attendance = require('./attendance')(sequelize, DataTypes);
db.Placement = require('./userplacementdetails')(sequelize, DataTypes);
db.WorkExperience = require('./workexperience')(sequelize, DataTypes);
db.HigherEducation = require('./highereducation')(sequelize, DataTypes);
db.Certification = require('./certification')(sequelize, DataTypes);
db.Project = require('./project')(sequelize, DataTypes);
// ONE-TO-MANY: Placement (UserPlacementDetail) has many WorkExperiences
db.Placement.hasMany(db.WorkExperience, {
	foreignKey: 'userPlacementDetailId',
	as: 'workExperiences',
	onDelete: 'CASCADE',
});
db.WorkExperience.belongsTo(db.Placement, {
	foreignKey: 'userPlacementDetailId',
	as: 'userPlacementDetail',
});

// ONE-TO-MANY: Placement (UserPlacementDetail) has many HigherEducations
db.Placement.hasMany(db.HigherEducation, {
	foreignKey: 'userPlacementDetailId',
	as: 'higherEducations',
	onDelete: 'CASCADE',
});
db.HigherEducation.belongsTo(db.Placement, {
	foreignKey: 'userPlacementDetailId',
	as: 'userPlacementDetail',
});

// ONE-TO-MANY: Placement (UserPlacementDetail) has many Certifications
db.Placement.hasMany(db.Certification, {
	foreignKey: 'userPlacementDetailId',
	as: 'certifications',
	onDelete: 'CASCADE',
});
db.Certification.belongsTo(db.Placement, {
	foreignKey: 'userPlacementDetailId',
	as: 'userPlacementDetail',
});

// ONE-TO-MANY: Placement (UserPlacementDetail) has many Projects
db.Placement.hasMany(db.Project, {
	foreignKey: 'userPlacementDetailId',
	as: 'projects',
	onDelete: 'CASCADE',
});
db.Project.belongsTo(db.Placement, {
	foreignKey: 'userPlacementDetailId',
	as: 'userPlacementDetail',
});
// ONE-TO-MANY: Enquiry has many Placements
db.Enquiry.hasMany(db.Placement, {
	foreignKey: 'enquiryId',
	onDelete: 'CASCADE',
	as: 'placements',
});
db.Placement.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
	as: 'enquiry',
});

// Many-to-many association between Package and Subject using join table 'PackageSubjects'
db.Package.belongsToMany(db.Subject, {
	through: 'PackageSubjects',
	foreignKey: 'packageId',
	otherKey: 'subjectId',
});
db.Subject.belongsToMany(db.Package, {
	through: 'PackageSubjects',
	foreignKey: 'subjectId',
	otherKey: 'packageId',
});

// One-to-many association between User and Log
db.User.hasMany(db.Log, {
	foreignKey: 'userId',
	onDelete: 'CASCADE',
});
db.Log.belongsTo(db.User, {
	foreignKey: 'userId',
});

// One-to-many association between Enquiry and Billing
db.Enquiry.hasMany(db.Billing, {
	foreignKey: 'enquiryId',
	onDelete: 'CASCADE',
});
db.Billing.belongsTo(db.Enquiry, {
	foreignKey: 'enquiryId',
});

// Many-to-many association between User and Subject through Instructor
db.User.belongsToMany(db.Subject, {
	through: db.Instructor,
	foreignKey: 'userId',
	otherKey: 'subjectId',
});
db.Subject.belongsToMany(db.User, {
	through: db.Instructor,
	foreignKey: 'subjectId',
	otherKey: 'userId',
});

// One-to-one association between User and Instructor (profile)
db.User.hasOne(db.Instructor, {
	foreignKey: 'userId',
	as: 'instructorProfile',
});
db.Instructor.belongsTo(db.User, {
	foreignKey: 'userId',
	as: 'user',
});

// One-to-many association between User and Batch
db.User.hasMany(db.Batch, {
	foreignKey: 'createdBy',
	onDelete: 'SET NULL',
});
db.Batch.belongsTo(db.User, {
	foreignKey: 'createdBy',
	as: 'creator',
});

// One-to-many association between User (Instructor) and Batch
db.User.hasMany(db.Batch, {
	foreignKey: 'instructorId',
	onDelete: 'SET NULL',
});
db.Batch.belongsTo(db.User, {
	foreignKey: 'instructorId',
	as: 'instructor',
});

// One-to-many association between Subject and Batch
db.Subject.hasMany(db.Batch, {
	foreignKey: 'subjectId',
	onDelete: 'CASCADE',
});
db.Batch.belongsTo(db.Subject, {
	foreignKey: 'subjectId',
	as: 'subject',
});

// One-to-many association between Batch and Enquiry (students)
db.Batch.hasMany(db.Enquiry, {
	foreignKey: 'batchId',
	onDelete: 'SET NULL',
});
db.Enquiry.belongsTo(db.Batch, {
	foreignKey: 'batchId',
	as: 'batch',
});

// Many-to-many: Batch has many Students (Enquiries) through BatchStudent
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


// One-to-many association between Package and Enquiry
db.Package.hasMany(db.Enquiry, {
	foreignKey: 'packageId',
	onDelete: 'SET NULL',
});
db.Enquiry.belongsTo(db.Package, {
	foreignKey: 'packageId',
	as: 'package',
});

// One-to-many association between Subject and Review
db.Subject.hasMany(db.Review, {
	foreignKey: 'subjectId',
	onDelete: 'CASCADE',
});
db.Review.belongsTo(db.Subject, {
	foreignKey: 'subjectId',
	as: 'subject',
});

// One-to-many association between Package and Review
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

// Assignment is not associated with Enquiry (batch-based only)

// Assignment is not reviewed by a user (no reviewedBy association)

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





// Many-to-many: Instructor teaches many Subjects
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

module.exports = db;
