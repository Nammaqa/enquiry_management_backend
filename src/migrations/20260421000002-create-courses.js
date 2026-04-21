'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('courses', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            title: {
                type: Sequelize.STRING(200),
                allowNull: false,
            },
            description: {
                type: Sequelize.STRING(500),
                allowNull: true,
            },
            type: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            duration: {
                type: Sequelize.STRING(50),
                allowNull: true,
            },
            overview: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            syllabus: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            prerequisites: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('now'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('now'),
            },
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('courses');
    },
};
