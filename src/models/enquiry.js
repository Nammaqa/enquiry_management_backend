const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const Enquiry = sequelize.define(
        'Enquiry',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            password: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            passwordChanged: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            global: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            isSignupVerified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            phone: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },
            collegeName: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            current_location: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            packageId: {
                type: DataTypes.INTEGER,         
                allowNull: true,
                references: {
                    model: 'packages',
                    key: 'id',
                },
            },
            batchId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'batches',
                    key: 'id',
                },
            },
            subjectIds: {
                type: DataTypes.ARRAY(DataTypes.INTEGER),
                allowNull: true,
                defaultValue: [],
            },
            trainingMode: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            trainingTime: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            startTime: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            profession: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            qualification: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            experience: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            referral: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            consent: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            candidateStatus: {
                type: DataTypes.ENUM('demo', 'qualified demo', 'class', 'class qualified', 'placement', 'enquiry stage'),
                allowNull: false,
                defaultValue: 'enquiry stage',
            },
            isSentBack: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            targetedFees: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: null,
            },
        },
        {
            tableName: 'enquiries',
            freezeTableName: true,
        }
    );

    Enquiry.beforeUpdate(async (enquiry) => {
        if (enquiry.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            enquiry.password = await bcrypt.hash(enquiry.password, salt);
        }
    });

    Enquiry.prototype.comparePassword = async function (enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
    };

    return Enquiry;
};