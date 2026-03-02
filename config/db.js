const { Pool } = require('pg');
require('dotenv').config();

// 🚨 ALARM DETEKSI KABEL DATABASE
if (!process.env.DATABASE_URL) {
    console.error("🔥 BAHAYA: DATABASE_URL tidak ditemukan! Pastikan sudah ditambahkan di tab Variables Railway!");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Wajib untuk Railway
});

const initDB = async () => {
    // Kita jalankan query secara berurutan agar jika 1 gagal, kita tahu yang mana.
    const createTables = `
        CREATE TABLE IF NOT EXISTS users ( id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(255), otp VARCHAR(10), is_verified BOOLEAN DEFAULT FALSE, google_id VARCHAR(255), role VARCHAR(20) DEFAULT 'pembeli', avatar_url VARCHAR(255), bio TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );

        CREATE TABLE IF NOT EXISTS products ( id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(200) NOT NULL, description TEXT, price DECIMAL(12,2) NOT NULL, media_url VARCHAR(255), media_type VARCHAR(10), category VARCHAR(50) DEFAULT 'biasa', capital_price DECIMAL(12,2) DEFAULT 0, stock INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );

        CREATE TABLE IF NOT EXISTS forum_posts ( id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(200) NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );

        CREATE TABLE IF NOT EXISTS promo_sliders ( id SERIAL PRIMARY KEY, media_url VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
    `;

    const alterTables = `
        ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'biasa';
        ALTER TABLE products ADD COLUMN IF NOT EXISTS capital_price DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;
    `;

    try {
        console.log("⏳ Sedang mencoba membangun tabel di Database...");
        await pool.query(createTables);
        await pool.query(alterTables);
        console.log("✅ SUKSES! Database 'belidikita' sudah nempel dan semua tabel berhasil dibangun!");
    } catch (err) {
        console.error("❌ GAGAL MEMBANGUN TABEL:", err.message);
    }
};

module.exports = { pool, initDB };
