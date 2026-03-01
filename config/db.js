const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
    if (err) console.error('Koneksi database gagal:', err.stack);
    else console.log('✅ Berhasil terhubung ke PostgreSQL Database');
});

module.exports = pool;
