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

        -- ✅ TABEL BARU: UNTUK MENYIMPAN RIWAYAT PESANAN DAN RESI
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            customer_name VARCHAR(100),
            customer_wa VARCHAR(20),
            shipping_address TEXT,
            items TEXT, 
            total_price DECIMAL(12,2),
            shipping_courier VARCHAR(50),
            shipping_cost DECIMAL(12,2),
            payment_method VARCHAR(50),
            status VARCHAR(50) DEFAULT 'Menunggu Pembayaran',
            resi VARCHAR(100) DEFAULT '-',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;


        
    // 3. Modifikasi tabel jika ada kolom baru (Tanpa menghapus data lama)
        const alterTables = `
        ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'biasa';
        ALTER TABLE products ADD COLUMN IF NOT EXISTS capital_price DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;
        ALTER TABLE products ALTER COLUMN media_url TYPE TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS weight INT DEFAULT 1000;
        
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_hidden_buyer BOOLEAN DEFAULT FALSE; 
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_hidden_admin BOOLEAN DEFAULT FALSE;
        
        -- ✅ TAMBAHAN: Kolom Retur dan Link Video/Foto Bukti Unboxing
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_media TEXT;
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
