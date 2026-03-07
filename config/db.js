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

        CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            discount_type VARCHAR(20) NOT NULL, 
            discount_value DECIMAL(12,2) DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS product_reviews (
            id SERIAL PRIMARY KEY,
            product_id INT REFERENCES products(id) ON DELETE CASCADE,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS internal_assets (
            id SERIAL PRIMARY KEY,
            asset_code VARCHAR(50),
            asset_name VARCHAR(200) NOT NULL,
            category VARCHAR(100),
            quantity INT DEFAULT 0,
            unit VARCHAR(50) DEFAULT 'Unit',
            condition VARCHAR(50) DEFAULT 'Baik',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- ✅ RUANG KARANTINA DENGAN TAMBAHAN DNA GROSIR (RUDAL 2)
        CREATE TABLE IF NOT EXISTS draft_products (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            price DECIMAL(12,2) NOT NULL,
            capital_price DECIMAL(12,2) DEFAULT 0,
            stock INT DEFAULT 0,
            category VARCHAR(50) DEFAULT 'biasa',
            weight INT DEFAULT 1000,
            status VARCHAR(20) DEFAULT 'Pending',
            unit VARCHAR(50) DEFAULT 'Pcs',
            variant_title VARCHAR(100),
            variant_options TEXT,
            wholesale_price DECIMAL(12,2) DEFAULT 0,
            wholesale_min_qty INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- ✅ TABEL BARU UNTUK KOTAK MASUK & LIVE CHAT (BEDIKI/ADMIN/PEMBELI)
        CREATE TABLE IF NOT EXISTS chats (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            sender_role VARCHAR(20) DEFAULT 'pembeli', 
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    // Modifikasi tabel jika ada kolom baru (Tanpa menghapus data lama)
    const alterTables = `
        ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'biasa';
        ALTER TABLE products ADD COLUMN IF NOT EXISTS capital_price DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;
        ALTER TABLE products ALTER COLUMN media_url TYPE TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS weight INT DEFAULT 1000;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INT DEFAULT 0;
        
        ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Pcs';
        ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_title VARCHAR(100);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_options TEXT;
        
        -- ✅ RUDAL 2: SUNTIKAN KOLOM GROSIR DI TABEL UTAMA
        ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_min_qty INT DEFAULT 0;
        
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_hidden_buyer BOOLEAN DEFAULT FALSE; 
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_hidden_admin BOOLEAN DEFAULT FALSE;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_media TEXT;
        
        ALTER TABLE internal_assets ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Unit';

        -- ✅ FASE 2: KOLOM TAMBAHAN UNTUK LOGIKA WAKTU & RETUR
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reject_reason TEXT;
    `;

    // ✅ FASE 2: INDEXING DATABASE AGAR SUPER CEPAT
    const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_title ON products USING GIN (to_tsvector('indonesian', title));
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_userid ON orders(user_id);
    `;

    try {
        console.log("⏳ Sedang mencoba membangun tabel di Database...");
        await pool.query(createTables);
        await pool.query(alterTables);
        await pool.query(createIndexes); // Eksekusi Indexing Fase 2
        console.log("✅ SUKSES! Database 'belidikita' sudah nempel, tabel siap, dan Indexing FASE 2 Aktif! 🚀");
    } catch (err) {
        console.error("❌ GAGAL MEMBANGUN TABEL:", err.message);
    }
};

module.exports = { pool, initDB };
