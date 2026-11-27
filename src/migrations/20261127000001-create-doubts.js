'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('doubts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      ticketCode: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      batchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'batches', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'subjects', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      enquiryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'enquiries', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      instructorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      topic: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('open', 'answered', 'resolved'),
        allowNull: false,
        defaultValue: 'open',
      },
      answer: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      answeredBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      answeredAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('doubts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_doubts_status";').catch(() => {});
  },
};
