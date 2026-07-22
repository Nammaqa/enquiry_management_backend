'use strict';

/** @type {import('sequelize-cli').Seeder} */
const bcrypt = require('bcrypt');

module.exports = {
  async up (queryInterface, Sequelize) {
    const hash = await bcrypt.hash('Admin@123', 10);
    
    // Check if admin user already exists
    const existingAdmin = await queryInterface.sequelize.query(
      "SELECT * FROM users WHERE email = 'admin@example.com' LIMIT 1"
    );
    
    if (existingAdmin[0].length === 0) {
      await queryInterface.bulkInsert('users', [
        {
          email: 'admin@example.com',
          password: hash,
          role: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
  }
};
