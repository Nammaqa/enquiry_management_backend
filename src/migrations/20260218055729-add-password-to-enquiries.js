'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add password column
    await queryInterface.addColumn('enquiries', 'password', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // 2. Add passwordChanged column
    await queryInterface.addColumn('enquiries', 'passwordChanged', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    // 3. Add globalUser column
    await queryInterface.addColumn('enquiries', 'globalUser', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });

    // 4. Generate hash for default password "password"
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password", salt);

    // 5. Update all existing records with the hashed password, passwordChanged=false, and globalUser=true
    // Note: globalUser default already handles new defaults if nullable false, but good to explicit for existing records just in case
    await queryInterface.sequelize.query(
      `UPDATE enquiries SET password = '${hashedPassword}', "passwordChanged" = false, "globalUser" = true`
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('enquiries', 'password');
    await queryInterface.removeColumn('enquiries', 'passwordChanged');
    await queryInterface.removeColumn('enquiries', 'globalUser');
  }
};
