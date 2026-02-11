'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('batchstudents', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            batchId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'batches', key: 'id' },
                onDelete: 'CASCADE',
            },
            enquiryId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'enquiries', key: 'id' },
                onDelete: 'CASCADE',
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for better query performance (check if they exist first)
        const indexes = await queryInterface.showIndex('batchstudents');

        if (!indexes.some(idx => idx.name === 'batchstudents_batch_id')) {
            await queryInterface.addIndex('batchstudents', ['batchId']);
            console.log('Added index on batchId');
        }

        if (!indexes.some(idx => idx.name === 'batchstudents_enquiry_id')) {
            await queryInterface.addIndex('batchstudents', ['enquiryId']);
            console.log('Added index on enquiryId');
        }

        // Add unique constraint to prevent duplicate enrollments (check if it exists first)
        const constraints = await queryInterface.showConstraint('batchstudents');
        const constraintExists = constraints.some(c => c.constraintName === 'unique_batch_student_enrollment');

        if (!constraintExists) {
            await queryInterface.addConstraint('batchstudents', {
                fields: ['batchId', 'enquiryId'],
                type: 'unique',
                name: 'unique_batch_student_enrollment',
            });
            console.log('Added unique constraint to batchstudents table');
        } else {
            console.log('Unique constraint already exists on batchstudents table, skipping');
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('batchstudents');
    },
};
