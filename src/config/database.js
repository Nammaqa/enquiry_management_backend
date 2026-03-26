require('dotenv').config();
const pg = require('pg');

let config;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL (for Neon or other hosted Postgres)
  const url = new URL(process.env.DATABASE_URL);
  config = {
    dialect: 'postgres',
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: parseInt(url.port || 5432),
    database: url.pathname.substring(1),
    dialectModule: pg,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
  };
} else {
  // Fallback to individual variables (for Local Postgres)
  config = {
    dialect: 'postgres',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'enquiry_form',
    dialectModule: pg,
    dialectOptions: {}, // Local connection usually doesn't need SSL
  };
}

config.pool = {
  max: 10,
  min: 0,
  acquire: 60000,
  idle: 10000,
};

config.logging = process.env.NODE_ENV === 'development' ? console.log : false;

module.exports = {
  production: config,
  development: config,
};