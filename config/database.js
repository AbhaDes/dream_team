const { Pool } = require('pg');  
require('dotenv').config();

// Hosted Postgres (Render/Neon/etc.) requires SSL; the local docker-compose
// Postgres doesn't support it, so only enable SSL in production.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected!');
  }
});

module.exports = pool;