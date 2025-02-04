import { Pool } from 'pg';
// Database connection
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
  
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
    } else {
        console.log('Connected to the database');
    }
    release();
});