/**
 * Migration: Add description, type, and duration fields to packages table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'packages',
        'description',
        {
          type: Sequelize.TEXT,
          allowNull: true,
          after: 'code'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'packages',
        'type',
        {
          type: Sequelize.STRING,
          allowNull: true,
          after: 'description'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'packages',
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
      console.log('Successfully added description, type, and duration columns to packages table');
    } catch (error) {
      await transaction.rollback();
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('packages', 'duration', { transaction });
      await queryInterface.removeColumn('packages', 'type', { transaction });
      await queryInterface.removeColumn('packages', 'description', { transaction });

      await transaction.commit();
      console.log('Successfully rolled back columns from packages table');
    } catch (error) {
      await transaction.rollback();
      console.error('Error rolling back migration:', error);
      throw error;
    }
  }
};
