const { Pool } = require('pg');

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

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[DB CONNECTION ERROR]', {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
  } else {
    console.log('[DB SUCCESS] Connected to PostgreSQL', res.rows[0]);
  }
});

module.exports = pool;
