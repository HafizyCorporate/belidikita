const { pool } = require('../../config/db');

const uploadProduct = async (req, res) => {
    // ✅ Tambahkan 'category' di sini untuk ditangkap dari form Admin
    const { title, description, price, category } = req.body; 
    
    const media_url = req.file ? `/uploads/${req.file.filename}` : null;
    const media_type = req.file && req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    // Filter Konten Ketat
    const forbiddenWords = ['judi', 'slot', 'gacor', 'porno', 'bokep', '18+', 'togel'];
    const contentCheck = `${title} ${description}`.toLowerCase();
    
    if (forbiddenWords.some(word => contentCheck.includes(word))) {
        return res.status(403).json({ 
            success: false, 
            message: "Pelanggaran Komunitas: Konten dilarang." 
        });
    }

    try {
        // ✅ Tambahkan 'category' ke dalam perintah INSERT database
        // Jika category kosong, otomatis diisi 'biasa'
        const newProduct = await pool.query(
            'INSERT INTO products (user_id, title, description, price, media_url, media_type, category) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [req.user ? req.user.id : 1, title, description, price, media_url, media_type, category || 'biasa']
        );
        res.json({ success: true, message: "Jualan berhasil diposting!", product: newProduct.rows[0] });
    } catch (err) {
        console.error("Error upload:", err);
        res.status(500).json({ success: false, message: "Server Error. Pastikan kolom 'category' sudah ada di database." });
    }
};

const getAllProducts = async (req, res) => {
    try {
        // ✅ Ambil semua produk beserta kategorinya (LEFT JOIN agar tidak error kalau user admin tidak ada di tabel users)
        const products = await pool.query(`
            SELECT p.*, COALESCE(u.name, 'Admin') as seller_name 
            FROM products p 
            LEFT JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC
        `);
        res.json({ success: true, data: products.rows });
    } catch (err) {
        console.error("Error get products:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { uploadProduct, getAllProducts };
