'use strict';

/** @type {import('sequelize-cli').Seeder} */
const bcrypt = require('bcryptjs'); // Using bcryptjs as defined in your package.json

module.exports = {
  async up(queryInterface, Sequelize) {
    const email = 'instructor@test.com';
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    // Check if instructor user already exists
    const existingInstructor = await queryInterface.sequelize.query(
      `SELECT * FROM users WHERE email = '${email}' LIMIT 1`
    );

    if (existingInstructor[0].length === 0) {
      await queryInterface.bulkInsert('users', [
        {
          name: 'Test Instructor',
          email: email,
          password: hash,
          phone_number: '1234567890',
          role: 'INSTRUCTOR',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], {});
      console.log(`Seeded instructor: ${email} / ${password}`);
    } else {
      console.log(`Instructor ${email} already exists.`);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'instructor@test.com' }, {});
  }
};
