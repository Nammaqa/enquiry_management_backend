'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('enquiries', 'global', {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('enquiries', 'global');
    },
};
