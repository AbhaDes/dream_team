const { Pool } = require('pg');
const pool = new Pool({
  user: "student",
  host: "localhost",
  database: "dream_team",
  password: "password",
  port: 5432,
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