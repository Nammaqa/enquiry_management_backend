"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename table if needed
    const tableList = await queryInterface.showAllTables();
    if (tableList.includes("placements")) {
      await queryInterface.renameTable("placements", "userplacementdetails");
    }
    // Remove old fields from userplacementdetails (UserPlacementDetail model)
    const userPlacementTable = await queryInterface.describeTable("userplacementdetails");
    if (userPlacementTable.sslc) await queryInterface.removeColumn("userplacementdetails", "sslc");
    if (userPlacementTable.puc) await queryInterface.removeColumn("userplacementdetails", "puc");
    if (userPlacementTable.higherEducation) await queryInterface.removeColumn("userplacementdetails", "higherEducation");
    if (userPlacementTable.workExperience) await queryInterface.removeColumn("userplacementdetails", "workExperience");
    if (userPlacementTable.projects) await queryInterface.removeColumn("userplacementdetails", "projects");
    if (userPlacementTable.certifications) await queryInterface.removeColumn("userplacementdetails", "certifications");

    // Add new sslc fields for UserPlacementDetail
    if (!userPlacementTable.sslcInstitutionName) await queryInterface.addColumn("userplacementdetails", "sslcInstitutionName", { type: Sequelize.STRING });
    if (!userPlacementTable.sslcBoardType) await queryInterface.addColumn("userplacementdetails", "sslcBoardType", { type: Sequelize.ENUM('state board', 'icse board', 'cbsc board') });
    if (!userPlacementTable.sslcYearOfPassing) await queryInterface.addColumn("userplacementdetails", "sslcYearOfPassing", { type: Sequelize.INTEGER });
    if (!userPlacementTable.sslcResultFormat) await queryInterface.addColumn("userplacementdetails", "sslcResultFormat", { type: Sequelize.ENUM('percentage', 'cgpa') });
    if (!userPlacementTable.sslcResult) await queryInterface.addColumn("userplacementdetails", "sslcResult", { type: Sequelize.STRING });

    // Add new puc fields for UserPlacementDetail
    if (!userPlacementTable.pucInstitutionName) await queryInterface.addColumn("userplacementdetails", "pucInstitutionName", { type: Sequelize.STRING });
    if (!userPlacementTable.pucBoardType) await queryInterface.addColumn("userplacementdetails", "pucBoardType", { type: Sequelize.ENUM('state board', 'icse board', 'cbsc board') });
    if (!userPlacementTable.pucSubjectStream) await queryInterface.addColumn("userplacementdetails", "pucSubjectStream", { type: Sequelize.STRING });
    if (!userPlacementTable.pucYearOfPassing) await queryInterface.addColumn("userplacementdetails", "pucYearOfPassing", { type: Sequelize.INTEGER });
    if (!userPlacementTable.pucResultFormat) await queryInterface.addColumn("userplacementdetails", "pucResultFormat", { type: Sequelize.ENUM('percentage', 'cgpa') });
    if (!userPlacementTable.pucResult) await queryInterface.addColumn("userplacementdetails", "pucResult", { type: Sequelize.STRING });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert table name
    const tableList = await queryInterface.showAllTables();
    if (tableList.includes("userplacementdetails")) {
      await queryInterface.renameTable("userplacementdetails", "placements");
    }
    // Re-add removed fields
    const table = await queryInterface.describeTable("placements");
    if (!table.sslc) await queryInterface.addColumn("placements", "sslc", { type: Sequelize.JSON });
    if (!table.puc) await queryInterface.addColumn("placements", "puc", { type: Sequelize.JSON });
    if (!table.higherEducation) await queryInterface.addColumn("placements", "higherEducation", { type: Sequelize.ARRAY(Sequelize.JSON) });
    if (!table.workExperience) await queryInterface.addColumn("placements", "workExperience", { type: Sequelize.ARRAY(Sequelize.JSON) });
    if (!table.projects) await queryInterface.addColumn("placements", "projects", { type: Sequelize.ARRAY(Sequelize.JSON) });
    if (!table.certifications) await queryInterface.addColumn("placements", "certifications", { type: Sequelize.ARRAY(Sequelize.JSON) });

    // Remove new sslc fields
    const sslcFields = ["sslcInstitutionName", "sslcBoardType", "sslcYearOfPassing", "sslcResultFormat", "sslcResult"];
    for (const field of sslcFields) {
      if (table[field]) await queryInterface.removeColumn("placements", field);
    }
    // Remove new puc fields
    const pucFields = ["pucInstitutionName", "pucBoardType", "pucSubjectStream", "pucYearOfPassing", "pucResultFormat", "pucResult"];
    for (const field of pucFields) {
      if (table[field]) await queryInterface.removeColumn("placements", field);
    }
  },
};
