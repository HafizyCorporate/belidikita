const { pool } = require('../../config/db');

// ✅ LOGIKA BARU: MENERIMA BERAT BARANG
const uploadProduct = async (req, res) => {
    const { title, description, price, category, capital_price, stock, weight } = req.body; 
    
    let mediaUrls = [];
    let media_type = 'image';
    
    if (req.files && req.files.length > 0) {
        // 🔥 PERUBAHAN CLOUDINARY: Menggunakan file.path untuk mendapatkan URL internet
        mediaUrls = req.files.map(file => file.path);
        
        if (req.files[0].mimetype && req.files[0].mimetype.startsWith('video/')) {
            media_type = 'video';
        }
    }

    const media_url_string = JSON.stringify(mediaUrls);
    const forbiddenWords = ['judi', 'slot', 'gacor', 'porno', 'bokep', '18+', 'togel'];
    const contentCheck = `${title} ${description}`.toLowerCase();
    if (forbiddenWords.some(word => contentCheck.includes(word))) return res.status(403).json({ success: false, message: "Pelanggaran Komunitas!" });

    try {
        const newProduct = await pool.query(
            `INSERT INTO products (user_id, title, description, price, media_url, media_type, category, capital_price, stock, weight) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [req.user ? req.user.id : 1, title, description, price, media_url_string, media_type, category || 'biasa', capital_price || 0, stock || 0, weight || 1000]
        );
        res.json({ success: true, message: "Barang berhasil diposting!", product: newProduct.rows[0] });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" }); 
    }
};

const getAllProducts = async (req, res) => {
    try {
        const products = await pool.query(`SELECT p.*, COALESCE(u.name, 'Admin') as seller_name FROM products p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`);
        res.json({ success: true, data: products.rows });
    } catch (err) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ✅ 1. FUNGSI UPLOAD SLIDER PROMO (CLOUDINARY FIX)
const uploadPromo = async (req, res) => {
    try {
        // 1. Pelebar Kolom Otomatis: Pastikan database kuat menampung URL Cloudinary yang panjang
        await pool.query(`ALTER TABLE promo_sliders ALTER COLUMN media_url TYPE TEXT;`);
        
        // 2. Ambil URL ajaib dari Cloudinary
        const media_url = req.file ? req.file.path : null;
        
        // 3. Cek apakah gambar berhasil diproses
        if (!media_url) {
            return res.status(400).json({ success: false, message: "Foto promo gagal diproses oleh Cloudinary!" });
        }
        
        // 4. Masukkan ke Database
        const newPromo = await pool.query('INSERT INTO promo_sliders (media_url) VALUES ($1) RETURNING *', [media_url]);
        res.json({ success: true, message: "Banner Promo Berhasil Diunggah!", data: newPromo.rows[0] });
        
    } catch (err) { 
        // Logika Pintar: Agar error di Railway kelihatan aslinya, bukan sekadar [object Object]
        console.error("🔥 BONGKAR ERROR BANNER:", err);
        res.status(500).json({ success: false, message: "Gagal menyimpan Banner ke Database." }); 
    }
};


// ✅ 2. FUNGSI BARU AMBIL SLIDER PROMO (Maksimal 5 Promo Terbaru)
const getPromos = async (req, res) => {
    try {
        const promos = await pool.query('SELECT * FROM promo_sliders ORDER BY created_at DESC LIMIT 5');
        res.json({ success: true, data: promos.rows });
    } catch (err) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// Jangan lupa daftarkan fungsi barunya di sini:
module.exports = { uploadProduct, getAllProducts, uploadPromo, getPromos };
