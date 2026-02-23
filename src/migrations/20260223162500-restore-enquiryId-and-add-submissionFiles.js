'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Add enquiryId back
        await queryInterface.addColumn('assignmentresponses', 'enquiryId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'enquiries', key: 'id' },
            onDelete: 'CASCADE',
        });

        // 2. Add submissionFiles (JSON) for multiple files
        await queryInterface.addColumn('assignmentresponses', 'submissionFiles', {
            type: Sequelize.JSON,
            allowNull: true,
        });

        // 3. Remove the old single submissionFile column if it exists
        // We'll wrap this in a try-catch to avoid errors if it's already gone
        try {
            await queryInterface.removeColumn('assignmentresponses', 'submissionFile');
        } catch (e) {
            console.log('submissionFile column not found, skipping removal.');
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('assignmentresponses', 'submissionFile', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.removeColumn('assignmentresponses', 'submissionFiles');
        await queryInterface.removeColumn('assignmentresponses', 'enquiryId');
    },
};
