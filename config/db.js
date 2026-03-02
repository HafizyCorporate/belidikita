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
        category VARCHAR(50) DEFAULT 'biasa',     -- ✅ Laci Kategori Etalase
        capital_price DECIMAL(12,2) DEFAULT 0,    -- ✅ Laci Harga Modal (Untuk Admin)
        stock INT DEFAULT 0,                      -- ✅ Laci Stok Barang (Untuk Admin)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ✅ TRIK AMAN: Menambahkan kolom baru jika tabel sudah telanjur dibuat sebelumnya
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'biasa';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS capital_price DECIMAL(12,2) DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;
    `;

    try {
        await pool.query(queries);
        console.log("✅ Database 'belidikita' sudah nempel dan siap!");
    } catch (err) {
        console.error("❌ Gagal nempel ke database:", err.message);
    }
};

module.exports = { pool, initDB };
