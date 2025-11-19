const { Pool } = require('pg');  
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// require('dotenv').config();
// const { Pool } = require('pg');
// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASS,
//   port: process.env.DB_PORT,
// });

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected!');
  }
});

module.exports = pool;