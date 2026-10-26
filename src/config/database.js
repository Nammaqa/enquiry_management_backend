require('dotenv').config({ override: true });
const pg = require('pg');

const DEFAULT_TEST_DB_URL =
  'postgresql://neondb_owner:npg_HMWhT3YdBq4U@ep-purple-king-b38t8fsk-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const DEFAULT_PROD_DB_URL =
  'postgresql://neondb_owner:npg_5VC7NOxvRdQa@ep-lucky-brook-azrtseca-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function sanitizeUrl(str) {
  if (!str) return null;
  return String(str).trim().replace(/^["']+|["']+$/g, '');
}

function parseConfigFromUrl(rawUrl, isDev = false) {
  const cleanUrl = sanitizeUrl(rawUrl);
  if (!cleanUrl) return null;

  try {
    const url = new URL(cleanUrl);
    return {
      dialect: 'postgres',
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: parseInt(url.port || 5432, 10),
      database: url.pathname.substring(1),
      dialectModule: pg,
      dialectOptions: {
        ssl: {
          rejectUnauthorized: false,
        },
        keepAlive: true,
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 15000,
        idle: 5000,
        evict: 5000,
      },
      logging: isDev ? console.log : false,
    };
  } catch (err) {
    console.error('Failed to parse database URL:', err.message);
    return null;
  }
}

function parseLocalConfig(isDev = false) {
  return {
    dialect: 'postgres',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || 5432, 10),
    database: process.env.DB_NAME || 'enquiry_form',
    dialectModule: pg,
    dialectOptions: {},
    pool: {
      max: 5,
      min: 0,
      acquire: 15000,
      idle: 5000,
      evict: 5000,
    },
    logging: isDev ? console.log : false,
  };
}

// Development / Testing DB URL resolution:
// Priority: DEV_DATABASE_URL -> TEST_DATABASE_URL -> DATABASE_URL (if in dev) -> DEFAULT_TEST_DB_URL
const devUrl =
  sanitizeUrl(process.env.DEV_DATABASE_URL) ||
  sanitizeUrl(process.env.TEST_DATABASE_URL) ||
  (process.env.NODE_ENV !== 'production' ? sanitizeUrl(process.env.DATABASE_URL) : null) ||
  DEFAULT_TEST_DB_URL;

// Production DB URL resolution:
// Priority: PROD_DATABASE_URL -> DATABASE_URL_PRODUCTION -> DATABASE_URL (if in prod) -> DEFAULT_PROD_DB_URL
const prodUrl =
  sanitizeUrl(process.env.PROD_DATABASE_URL) ||
  sanitizeUrl(process.env.DATABASE_URL_PRODUCTION) ||
  (process.env.NODE_ENV === 'production' ? sanitizeUrl(process.env.DATABASE_URL) : null) ||
  DEFAULT_PROD_DB_URL;

const developmentConfig = parseConfigFromUrl(devUrl, false) || parseLocalConfig(false);
const testConfig = parseConfigFromUrl(devUrl, false) || parseLocalConfig(false);
const productionConfig = parseConfigFromUrl(prodUrl, false) || parseLocalConfig(false);

module.exports = {
  development: developmentConfig,
  test: testConfig,
  production: productionConfig,
};