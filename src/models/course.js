module.exports = (sequelize, DataTypes) => {
    const Course = sequelize.define(
        'Course',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            title: {
                type: DataTypes.STRING(200),
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },
            type: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            duration: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            overview: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            syllabus: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            prerequisites: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            image: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            imagePublicId: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            tableName: 'courses',
            freezeTableName: true,
        }
    );

    return Course;
};
