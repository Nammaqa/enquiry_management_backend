require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
const pg=require('pg');

if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Parse URL for Neon DB
const url = new URL(dbUrl);

const config = {
  dialect: 'postgres',
  username: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  host: url.hostname,
  port: parseInt(url.port || 5432),
  database: url.pathname.substring(1),
  dialectModule:pg,
  dialectOptions: {
    ssl:{
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 10, // Increased from 2 to handle concurrent requests
    min: 0,
    acquire: 60000, // Increased to 60s
    idle: 10000,
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
};

module.exports = {
  production: config,
  development: config,
};