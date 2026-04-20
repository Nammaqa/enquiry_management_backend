'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if columns already exist before adding
      const tableInfo = await queryInterface.describeTable('billings', { transaction });
      
      if (!tableInfo.gst) {
        await queryInterface.addColumn('billings', 'gst', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        }, { transaction });
      }

      if (!tableInfo.gstAmount) {
        await queryInterface.addColumn('billings', 'gstAmount', {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        }, { transaction });
      }

      if (!tableInfo.packageType) {
        // Create type if needed for PostgreSQL
        if (queryInterface.sequelize.options.dialect === 'postgres') {
          await queryInterface.sequelize.query(
            `CREATE TYPE enum_billings_packagetype AS ENUM('package', 'individual');`,
            { transaction }
          ).catch(() => {}); // Ignore if type already exists
        }

        await queryInterface.addColumn('billings', 'packageType', {
          type: Sequelize.ENUM('package', 'individual'),
          allowNull: false,
          defaultValue: 'package',
        }, { transaction });
      }

      if (!tableInfo.subjectIds) {
        await queryInterface.addColumn('billings', 'subjectIds', {
          type: Sequelize.JSON,
          allowNull: true,
        }, { transaction });
      }

      if (!tableInfo.subjectWiseBreakdown) {
        await queryInterface.addColumn('billings', 'subjectWiseBreakdown', {
          type: Sequelize.JSON,
          allowNull: true,
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableInfo = await queryInterface.describeTable('billings', { transaction });
      
      if (tableInfo.gst) {
        await queryInterface.removeColumn('billings', 'gst', { transaction });
      }
      if (tableInfo.gstAmount) {
        await queryInterface.removeColumn('billings', 'gstAmount', { transaction });
      }
      if (tableInfo.packageType) {
        await queryInterface.removeColumn('billings', 'packageType', { transaction });
      }
      if (tableInfo.subjectIds) {
        await queryInterface.removeColumn('billings', 'subjectIds', { transaction });
      }
      if (tableInfo.subjectWiseBreakdown) {
        await queryInterface.removeColumn('billings', 'subjectWiseBreakdown', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
