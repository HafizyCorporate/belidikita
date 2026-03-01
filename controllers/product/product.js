const pool = require('../../config/db');

const uploadProduct = async (req, res) => {
    const { title, description, price } = req.body;
    const media_url = req.file ? `/uploads/${req.file.filename}` : null;
    const media_type = req.file && req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    // Filter Konten Ketat: Tolak indikasi perjudian atau pornografi
    const forbiddenWords = ['judi', 'slot', 'gacor', 'porno', 'bokep', '18+', 'togel'];
    const contentCheck = `${title} ${description}`.toLowerCase();
    
    if (forbiddenWords.some(word => contentCheck.includes(word))) {
        return res.status(403).json({ 
            success: false, 
            message: "Pelanggaran Komunitas: Konten ini dilarang tayang di platform kami." 
        });
    }

    try {
        const newProduct = await pool.query(
            'INSERT INTO products (user_id, title, description, price, media_url, media_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, title, description, price, media_url, media_type]
        );
        res.json({ success: true, message: "Jualan berhasil diposting!", product: newProduct.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getAllProducts = async (req, res) => {
    try {
        const products = await pool.query(`
            SELECT p.*, u.name as seller_name, u.avatar_url 
            FROM products p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC
        `);
        res.json({ success: true, data: products.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { uploadProduct, getAllProducts };
