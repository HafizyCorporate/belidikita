const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- FUNGSI AUTO TEMPEL KE DB ---
const initDB = async () => {
    const queries = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255),
        otp VARCHAR(10),
        is_verified BOOLEAN DEFAULT FALSE,
        google_id VARCHAR(255),
        role VARCHAR(20) DEFAULT 'pembeli',
        avatar_url VARCHAR(255),
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(12,2) NOT NULL,
        media_url VARCHAR(255),
        media_type VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    try {
        await pool.query(queries);
        console.log("✅ Database 'belidikita' sudah nempel dan siap!");
    } catch (err) {
        console.error("❌ Gagal nempel ke database:", err.message);
    }
};

module.exports = { pool, initDB };
