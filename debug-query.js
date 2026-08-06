

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect();
pool.query('SELECT * FROM users')
  .then(result => {
    console.log(result.rows); // prints rows
  })
  .catch(err => {
    console.error('Error querying users:', err);
  })
  .finally(() => pool.end());