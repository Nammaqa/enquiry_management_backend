require('dotenv').config();
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

function isTestEnvironment() {
  if (process.env.USE_TEST_DB === 'true') return true;
  if (process.env.USE_PROD_DB === 'true') return false;

  const vercelEnvironment = (process.env.VERCEL_ENV || '').toLowerCase();
  if (vercelEnvironment === 'production') return false;
  if (['preview', 'development'].includes(vercelEnvironment)) return true;

  const appEnv = (process.env.APP_ENV || '').toLowerCase();
  if (['development', 'test', 'testing', 'staging', 'dev'].includes(appEnv)) return true;
  if (['production', 'prod'].includes(appEnv)) return false;

  const gitBranch = (process.env.VERCEL_GIT_COMMIT_REF || '').toLowerCase();
  if (['dev', 'enhancement', 'develop', 'staging', 'test'].includes(gitBranch)) return true;
  if (['main', 'master', 'production', 'prod'].includes(gitBranch)) return false;

  const vercelUrl = (process.env.VERCEL_URL || '').toLowerCase();
  if (vercelUrl.includes('devenquiry') || vercelUrl.includes('-dev') || vercelUrl.includes('-enhancement')) return true;

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') return true;

  return false;
}

// Testing Database URL:
let devUrl = sanitizeUrl(process.env.DEV_DATABASE_URL) || sanitizeUrl(process.env.TEST_DATABASE_URL);
if (!devUrl && process.env.DATABASE_URL && process.env.DATABASE_URL.includes('purple-king')) {
  devUrl = sanitizeUrl(process.env.DATABASE_URL);
}
if (!devUrl) {
  devUrl = DEFAULT_TEST_DB_URL;
}

// Production Database URL:
let prodUrl = sanitizeUrl(process.env.PROD_DATABASE_URL) || sanitizeUrl(process.env.DATABASE_URL_PRODUCTION);
if (!prodUrl && process.env.DATABASE_URL && process.env.DATABASE_URL.includes('lucky-brook')) {
  prodUrl = sanitizeUrl(process.env.DATABASE_URL);
}
if (!prodUrl) {
  prodUrl = DEFAULT_PROD_DB_URL;
}

const isTest = isTestEnvironment();
const activeUrl = isTest ? devUrl : prodUrl;

const developmentConfig = parseConfigFromUrl(devUrl, false);
const testConfig = parseConfigFromUrl(devUrl, false);
const productionConfig = parseConfigFromUrl(prodUrl, false);
const activeConfig = parseConfigFromUrl(activeUrl, false);

module.exports = {
  development: developmentConfig,
  test: testConfig,
  production: productionConfig,
  active: activeConfig,
  isTestEnvironment: isTest,
  activeHost: activeConfig ? activeConfig.host : null,
};