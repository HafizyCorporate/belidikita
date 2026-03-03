const { pool } = require('../../config/db');

// ✅ LOGIKA BARU: UPLOAD BANYAK FOTO (Maksimal 5)
const uploadProduct = async (req, res) => {
    const { title, description, price, category, capital_price, stock } = req.body; 
    
    // Tangkap semua file foto yang diupload admin
    let mediaUrls = [];
    let media_type = 'image';
    
    if (req.files && req.files.length > 0) {
        // Buat daftar link fotonya
        mediaUrls = req.files.map(file => `/uploads/${file.filename}`);
        if (req.files[0].mimetype.startsWith('video/')) media_type = 'video';
    }

    // Jadikan format teks JSON agar bisa masuk ke 1 kolom Database
    const media_url_string = JSON.stringify(mediaUrls);

    const forbiddenWords = ['judi', 'slot', 'gacor', 'porno', 'bokep', '18+', 'togel'];
    const contentCheck = `${title} ${description}`.toLowerCase();
    if (forbiddenWords.some(word => contentCheck.includes(word))) return res.status(403).json({ success: false, message: "Pelanggaran Komunitas!" });

    try {
        const newProduct = await pool.query(
            `INSERT INTO products (user_id, title, description, price, media_url, media_type, category, capital_price, stock) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.user ? req.user.id : 1, title, description, price, media_url_string, media_type, category || 'biasa', capital_price || 0, stock || 0]
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

// ✅ 1. FUNGSI BARU UPLOAD SLIDER PROMO
const uploadPromo = async (req, res) => {
    const media_url = req.file ? `/uploads/${req.file.filename}` : null;
    if (!media_url) return res.status(400).json({ success: false, message: "Foto promo wajib ada!" });
    try {
        const newPromo = await pool.query('INSERT INTO promo_sliders (media_url) VALUES ($1) RETURNING *', [media_url]);
        res.json({ success: true, message: "Banner Promo Berhasil Diunggah!", data: newPromo.rows[0] });
    } catch (err) { res.status(500).json({ success: false, message: "Server Error" }); }
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
