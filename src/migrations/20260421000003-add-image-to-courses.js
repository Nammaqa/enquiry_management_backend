'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('courses', 'image', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('courses', 'imagePublicId', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('courses', 'image');
        await queryInterface.removeColumn('courses', 'imagePublicId');
    },
};
