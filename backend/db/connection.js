// db/connection.js — PostgreSQL connection pool
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'hotel_reservation',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => console.log('PostgreSQL pool connected'));
pool.on('error',   (err) => console.error('Unexpected PG error', err));

module.exports = {
  query:   (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
