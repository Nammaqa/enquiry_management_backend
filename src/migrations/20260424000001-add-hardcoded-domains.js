/**
 * Migration: Add hardcoded domains to packages and subjects tables
 * Adds: Testing, Development, Cybersecurity, Devops, AI/ML, Data Analytics, UI/UX Design
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const domains = [
        {
          name: 'Testing',
          code: 'TST',
          type: 'Domain',
          description: 'Software Testing and Quality Assurance',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Development',
          code: 'DEV',
          type: 'Domain',
          description: 'Web and Application Development',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Cybersecurity',
          code: 'CYB',
          type: 'Domain',
          description: 'Cybersecurity and Information Security',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Devops',
          code: 'DOP',
          type: 'Domain',
          description: 'DevOps and Infrastructure Management',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'AI/ML',
          code: 'AIM',
          type: 'Domain',
          description: 'Artificial Intelligence and Machine Learning',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Data Analytics',
          code: 'DAT',
          type: 'Domain',
          description: 'Data Analytics and Business Intelligence',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'UI/UX Design',
          code: 'UIX',
          type: 'Domain',
          description: 'User Interface and User Experience Design',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Insert into packages table
      await queryInterface.bulkInsert(
        'packages',
        domains,
        { transaction }
      );

      // Insert into subjects table
      await queryInterface.bulkInsert(
        'subjects',
        domains,
        { transaction }
      );

      await transaction.commit();
      console.log('Successfully added hardcoded domains to packages and subjects tables');
    } catch (error) {
      await transaction.rollback();
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const domainNames = ['Testing', 'Development', 'Cybersecurity', 'Devops', 'AI/ML', 'Data Analytics', 'UI/UX Design'];
      
      // Remove from packages table
      await queryInterface.bulkDelete(
        'packages',
        {
          name: {
            [Sequelize.Op.in]: domainNames
          }
        },
        { transaction }
      );

      // Remove from subjects table
      await queryInterface.bulkDelete(
        'subjects',
        {
          name: {
            [Sequelize.Op.in]: domainNames
          }
        },
        { transaction }
      );

      await transaction.commit();
      console.log('Successfully rolled back hardcoded domains from packages and subjects tables');
    } catch (error) {
      await transaction.rollback();
      console.error('Error in rollback:', error);
      throw error;
    }
  }
};
