'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Try to remove the constraint - the name might vary by database
      await queryInterface.removeConstraint('otps', 'otps_userId_fkey');
    } catch (error) {
      try {
        await queryInterface.removeConstraint('otps', 'otps_ibfk_1');
      } catch (error2) {
        console.log('Could not find foreign key constraint, proceeding...');
      }
    }

    // Add new foreign key constraint referencing enquiries table
    await queryInterface.addConstraint('otps', {
      fields: ['userId'],
      type: 'foreign key',
      references: {
        table: 'enquiries',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    try {
      // Try to remove the constraint
      await queryInterface.removeConstraint('otps', 'otps_userId_fkey');
    } catch (error) {
      console.log('Could not find foreign key constraint, proceeding...');
    }

    // Restore the original foreign key constraint referencing users table
    await queryInterface.addConstraint('otps', {
      fields: ['userId'],
      type: 'foreign key',
      references: {
        table: 'users',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
};
