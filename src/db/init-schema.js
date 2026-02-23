const fs = require('fs');
const path = require('path');
const db = require('./index');

/**
 * Initialize database schema if tables don't exist.
 * This can be called on startup to ensure schema is always present.
 */
const initializeSchema = async () => {
  try {
    // Check if users table exists
    const tableCheck = await db.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )`
    );

    if (tableCheck.rows[0].exists) {
      console.log('[DB] Schema already initialized');
      return true;
    }

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    console.log('[DB] Initializing schema...');
    await db.query(schema);
    console.log('[DB] Schema initialized successfully');
    return true;
  } catch (err) {
    console.error('[DB INIT ERROR]', {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    return false;
  }
};

module.exports = initializeSchema;
