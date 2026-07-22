/**
 * Migration: Add description, type, and duration fields to subjects table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'subjects',
        'description',
        {
          type: Sequelize.TEXT,
          allowNull: true,
          after: 'code'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'subjects',
        'type',
        {
          type: Sequelize.STRING,
          allowNull: true,
          after: 'description'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'subjects',
        'duration',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Duration in days or weeks',
          after: 'type'
        },
        { transaction }
      );

      await transaction.commit();
      console.log('Successfully added description, type, and duration columns to subjects table');
    } catch (error) {
      await transaction.rollback();
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('subjects', 'duration', { transaction });
      await queryInterface.removeColumn('subjects', 'type', { transaction });
      await queryInterface.removeColumn('subjects', 'description', { transaction });

      await transaction.commit();
      console.log('Successfully rolled back columns from subjects table');
    } catch (error) {
      await transaction.rollback();
      console.error('Error rolling back migration:', error);
      throw error;
    }
  }
};
