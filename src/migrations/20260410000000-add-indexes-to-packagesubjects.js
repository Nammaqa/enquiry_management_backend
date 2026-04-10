'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add indexes to PackageSubjects table for better performance
    await queryInterface.addIndex('PackageSubjects', ['packageId'], {
      name: 'packagesubjects_packageid_index'
    });

    await queryInterface.addIndex('PackageSubjects', ['subjectId'], {
      name: 'packagesubjects_subjectid_index'
    });

    // Add composite index for faster lookups
    await queryInterface.addIndex('PackageSubjects', ['packageId', 'subjectId'], {
      name: 'packagesubjects_packageid_subjectid_index',
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('PackageSubjects', 'packagesubjects_packageid_index');
    await queryInterface.removeIndex('PackageSubjects', 'packagesubjects_subjectid_index');
    await queryInterface.removeIndex('PackageSubjects', 'packagesubjects_packageid_subjectid_index');
  },
};