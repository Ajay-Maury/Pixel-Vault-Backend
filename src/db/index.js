const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('[DB ERROR] DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
  min: 2,
});

pool.on('error', (err) => {
  console.error('[DB POOL ERROR]', {
    message: err.message,
    code: err.code,
    timestamp: new Date().toISOString()
  });
});

pool.on('connect', () => {
  console.log('[DB INFO] New connection established to database');
});

pool.on('remove', () => {
  console.log('[DB INFO] Connection removed from pool');
});


// Run schema.sql to create tables if not exists
const runMigrations = async () => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('[DB MIGRATION] schema.sql applied (tables ensured)');
  } catch (err) {
    console.error('[DB MIGRATION ERROR]', err.message);
    throw err;
  }
};

// Test connection and run migrations
const testConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('[DB SUCCESS] Connected to PostgreSQL');
    await runMigrations();
    return true;
  } catch (err) {
    console.error('[DB CONNECTION ERROR]', {
      message: err.message,
      code: err.code,
      detail: err.detail || 'Check DATABASE_URL and ensure PostgreSQL is running'
    });
    process.exit(1);
  }
};

module.exports = pool;
module.exports.testConnection = testConnection;
