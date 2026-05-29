/*
DATABASE CONNECTION 

* This file creates a connection pool to PostgreSQL.
 *
 * What is a pool?
 * Instead of creating a new connection every time you query,
 * a pool keeps several connections open and reuses them.
 * Creating a connection is expensive (takes time).
 * Reusing existing ones is much faster.
 *
 * Think of it like a taxi service:
 * Without pool: call a new taxi for every trip
 * With pool: keep 10 taxis on standby, assign them as needed
 *
 * pg.Pool handles all of this automatically.
*/
require('dotenv').config();

const{Pool}=require('pg');

const pool=new Pool({
    host: process.env.DB_HOST,
    port:     process.env.DB_PORT,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Failed to connect to PostgreSQL:');
    console.error(err.message);
    return;
  }
  console.log('✅ Connected to PostgreSQL successfully');
  release(); // return the connection back to the pool
});

module.exports = pool;