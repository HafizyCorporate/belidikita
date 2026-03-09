const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); 
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 
const xlsx = require('xlsx'); 
require('dotenv').config();

// ==========================================
// ☁️ KONFIGURASI GUDANG CLOUDINARY
// ==========================================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbct8tltw', 
  api_key: process.env.CLOUDINARY_API_KEY || '419391893671787', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vOzR16hMqiAADm5gBm60-_ntTgU' 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'belidikita_images', 
    allowedFormats: ['jpeg', 'png', 'jpg', 'webp', 'mp4', 'mov', 'avi', 'mkv'], 
    resource_type: 'auto' 
  },
});

const upload = multer({ storage: storage });
const uploadExcel = multer({ storage: multer.memoryStorage() });

const { pool, initDB } = require('./config/db'); 
const { register, verifyOTP, googleLogin, forgotPassword, resetPassword } = require('./controllers/auth/auth');
const { getProfile, updateProfile } = require('./controllers/profile/profile');
const { uploadProduct, getAllProducts, uploadPromo, getPromos } = require('./controllers/product/product');
const { createPost, getPosts } = require('./controllers/forum/forum');
const { askAI } = require('./controllers/ai/ai');
const verifyToken = require('./middleware/auth'); 

const app = express();
const PORT = process.env.PORT || 8080;

initDB();

const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
// ✅ Limitasi diperbesar hingga 50MB agar tidak loading terus saat upload foto profil
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboardutama.html')); });

// ==========================================
// 🔓 API PUBLIK & LOGIN
// ==========================================
app.post('/api/register', register);
app.post('/api/verify-otp', verifyOTP);
app.post('/api/google-login', googleLogin);
app.post('/api/forgot-password', forgotPassword);
app.post('/api/reset-password', resetPassword);

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body; 
    const admins = [{ username: "Versacy", password: "08556645" }, { username: "Farid", password: "11223344" }];
    const validAdmin = admins.find(a => a.username === username && a.password === password);

    if (validAdmin) return res.json({ success: true, message: `Selamat datang, Admin ${validAdmin.username}!`, token: `token-admin-${validAdmin.username}` });

    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [username]);
        if (user.rows.length === 0) return res.status(401).json({ success: false, message: "Email atau password salah!" });

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(401).json({ success: false, message: "Email atau password salah!" });

        const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_belidikita_super_aman';
        const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ success: true, message: "Login berhasil!", token: token });
    } catch (err) { res.status(500).json({ success: false, message: "Server Error saat login." }); }
});

app.post('/api/ai/search', askAI);

// ✅ FASE 2: API PRODUK DENGAN PAGINATION & SERVER-SIDE FILTERING
app.get('/api/products', async (req, res) => {
    try {
        const { search, category, sort = 'terbaru', page = 1, limit = 20 } = req.query;
        const offset = (Math.max(1, page) - 1) * limit;

        let baseQuery = `
            SELECT p.*, COALESCE(ROUND(AVG(r.rating), 1), 0) as avg_rating
            FROM products p LEFT JOIN product_reviews r ON p.id = r.product_id
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;

         // 1. Filter Kategori
        if (category && category !== 'Semua') {
            baseQuery += ` AND p.description ILIKE $${paramIndex}`;
            params.push(`%[Kategori: ${category}%`);
            paramIndex++;
        }


        if (search && search.trim() !== '') {
            baseQuery += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
            params.push(`%${search.trim()}%`);
            paramIndex++;
        }

        baseQuery += ` GROUP BY p.id`;

        if (sort === 'termurah') {
            baseQuery += ` ORDER BY p.price ASC`;
        } else if (sort === 'terlaris') {
            baseQuery += ` ORDER BY p.sold_count DESC NULLS LAST`;
        } else {
            baseQuery += ` ORDER BY p.created_at DESC`;
        }

        baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(baseQuery, params);
        
        res.json({ success: true, data: result.rows });

    } catch (err) { 
        console.error("Error Fetch Products FASE 2:", err);
        res.status(500).json({ success: false, message: "Server error saat mengambil produk" }); 
    }
});

app.get('/api/promos', getPromos); 
app.get('/api/forum', getPosts);          

const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer token-admin-')) { req.user = { id: 1, role: 'admin' }; return next(); }
    verifyToken(req, res, next);
};

// ==========================================
// 🟢 API KOTAK MASUK & LIVE CHAT TOKO
// ==========================================
app.post('/api/chat/save', verifyToken, async (req, res) => {
    const { message, sender, target_user } = req.body; 
    
    // Logika Pintar: Jika yang mengirim adalah 'admin', maka pesannya dilempar ke laci ID pembeli (target_user)
    // Jika yang mengirim adalah 'pembeli', maka pesannya dilempar ke laci ID miliknya sendiri (req.user.id)
    const pemilikChatId = (sender === 'admin' && target_user) ? target_user : req.user.id;

    try { 
        await pool.query(
            "INSERT INTO chats (user_id, sender_role, message) VALUES ($1, $2, $3)", 
            [pemilikChatId, sender, message]
        ); 
        res.json({ success: true }); 
    } catch (err) { 
        console.error("Gagal simpan chat:", err);
        res.status(500).json({ success: false }); 
    }
});


app.get('/api/chat/me', verifyToken, async (req, res) => {
    try { const result = await pool.query("SELECT * FROM chats WHERE user_id = $1 ORDER BY created_at ASC", [req.user.id]); res.json({ success: true, data: result.rows }); } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/chats', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`SELECT c.*, u.name as user_name FROM chats c JOIN users u ON c.user_id = u.id WHERE c.id IN (SELECT MAX(id) FROM chats GROUP BY user_id) ORDER BY c.created_at DESC`);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 🛒 SINKRONISASI API ORDERS & GEMBOK KEAMANAN
// ==========================================
app.post('/api/orders', verifyToken, async (req, res) => {
    const { customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO orders (user_id, customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method, status, is_hidden_buyer, is_hidden_admin) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Menunggu Pembayaran', FALSE, FALSE) RETURNING id`, 
            [req.user.id, customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method]
        );
        res.json({ success: true, order_id: result.rows[0].id });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/me', verifyToken, async (req, res) => {
    try { 
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 AND (is_hidden_buyer = FALSE OR is_hidden_buyer IS NULL) ORDER BY created_at DESC', [req.user.id]); 
        res.json({ success: true, data: result.rows }); 
    } catch(err) { res.status(500).json({ success: false }); }
});

app.get('/api/orders', verifyAdmin, async (req, res) => {
    try { 
        const result = await pool.query('SELECT * FROM orders WHERE (is_hidden_admin = FALSE OR is_hidden_admin IS NULL) ORDER BY created_at DESC'); 
        res.json({ success: true, data: result.rows }); 
    } catch(err) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/archive', verifyAdmin, async (req, res) => {
    try { 
        const result = await pool.query('SELECT * FROM orders WHERE is_hidden_admin = TRUE ORDER BY created_at DESC'); 
        res.json({ success: true, data: result.rows }); 
    } catch(err) { res.status(500).json({ success: false }); }
});

app.put('/api/orders/:id', verifyAdmin, async (req, res) => {
    const { status, resi, reject_reason } = req.body;
    try { 
        if (status === 'Dikirim') {
            await pool.query('UPDATE orders SET status=$1, resi=$2, shipped_at=NOW() WHERE id=$3', [status, resi, req.params.id]);
        } else if (status === 'Terkirim') {
            await pool.query('UPDATE orders SET status=$1, resi=$2, delivered_at=NOW() WHERE id=$3', [status, resi, req.params.id]);
        } else if (status === 'Selesai') {
            await pool.query('UPDATE orders SET status=$1, resi=$2, completed_at=NOW() WHERE id=$3', [status, resi, req.params.id]);
        } else if (status === 'Retur Ditolak') {
            await pool.query('UPDATE orders SET status=$1, return_reject_reason=$2 WHERE id=$3', [status, reject_reason || 'Ditolak Admin', req.params.id]);
        } else {
            await pool.query('UPDATE orders SET status=$1, resi=$2 WHERE id=$3', [status, resi, req.params.id]);
        }
        res.json({ success: true }); 
    } catch(err) { res.status(500).json({ success: false }); }
});

app.put('/api/orders/:id/receive', verifyToken, async (req, res) => {
    try {
        await pool.query("UPDATE orders SET status = 'Selesai', completed_at = NOW() WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
        res.json({ success: true, message: "Terima kasih! Pesanan telah diselesaikan." });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.delete('/api/orders/:id', verifyToken, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const checkQuery = isAdmin 
            ? await pool.query('SELECT status FROM orders WHERE id = $1', [req.params.id])
            : await pool.query('SELECT status FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);

        if (checkQuery.rows.length === 0) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan!" });
        
        const currentStatus = checkQuery.rows[0].status || '';
        
        const statusAman = ['Selesai', 'Dibatalkan', 'Dibatalkan (Expired)', 'Retur Selesai', 'Retur Ditolak'];
        let isAman = statusAman.some(s => currentStatus.includes(s));

        if(!isAman) {
            return res.status(403).json({ success: false, message: `GEMBOK AKTIF! Pesanan masih berstatus "${currentStatus}".` });
        }

        if (isAdmin) {
            await pool.query('UPDATE orders SET is_hidden_admin = TRUE WHERE id = $1', [req.params.id]);
        } else {
            await pool.query('UPDATE orders SET is_hidden_buyer = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        }
        res.json({ success: true, message: "Pesanan berhasil dihapus/diarsipkan." });
    } catch(err) { res.status(500).json({ success: false, message: "Server Error saat menghapus." }); }
});

app.put('/api/orders/:id/return', verifyToken, upload.single('proof'), async (req, res) => {
    const { reason } = req.body; 
    const proof_url = req.file ? req.file.path : null;
    
    if (!proof_url || !reason) return res.status(400).json({ success: false, message: "Bukti dan Alasan wajib diisi!" });
    
    try {
        const checkQuery = await pool.query('SELECT status, delivered_at FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if(checkQuery.rows.length === 0) return res.status(404).json({ success: false });

        const order = checkQuery.rows[0];
        
        if (order.status !== 'Terkirim') {
            return res.status(400).json({ success: false, message: "Hanya pesanan berstatus TERKIRIM (Sampai) yang bisa diajukan retur!" });
        }

        if (order.delivered_at) {
            const hariIni = new Date();
            const tglTerkirim = new Date(order.delivered_at);
            const selisihHari = Math.ceil(Math.abs(hariIni - tglTerkirim) / (1000 * 60 * 60 * 24));
            
            if (selisihHari > 2) { 
                return res.status(403).json({ success: false, message: "Batas waktu pengajuan retur (2x24 Jam) sudah lewat!" });
            }
        }

        await pool.query("UPDATE orders SET status = 'Ajukan Retur', return_reason = $1, return_media = $2 WHERE id = $3", [reason, proof_url, req.params.id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.get('/api/profile', verifyToken, getProfile);
app.put('/api/profile', verifyToken, updateProfile);
app.get('/api/address', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [req.user.id]);
        if (result.rows.length > 0) res.json({ success: true, data: result.rows[0] });
        else res.json({ success: true, data: null });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/products', verifyAdmin, upload.array('media', 5), async (req, res) => {
    const { title, capital_price, price, stock, category, description, weight, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty } = req.body;
    try {
        const mediaUrls = req.files ? req.files.map(f => f.path) : []; const mediaJson = JSON.stringify(mediaUrls);
        await pool.query(
            `INSERT INTO products (title, capital_price, price, stock, category, description, weight, media_url, media_type, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'image', $9, $10, $11, $12, $13)`,
            [title, capital_price || 0, price, stock || 0, category || 'biasa', description, weight || 1000, mediaJson, unit || 'Pcs', variant_title || '', variant_options || '', wholesale_price || 0, wholesale_min_qty || 0]
        ); res.json({ success: true, message: "Produk berhasil diupload!" });
    } catch (err) { res.status(500).json({ success: false, message: "Gagal upload produk." }); }
});
app.post('/api/promos', verifyAdmin, upload.single('media'), uploadPromo); 
app.post('/api/forum', verifyToken, createPost);
app.delete('/api/products/:id', verifyAdmin, async (req, res) => { try { await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch(err) { res.status(500).json({ success: false }); } });
app.delete('/api/promos/:id', verifyAdmin, async (req, res) => { try { await pool.query('DELETE FROM promo_sliders WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch(err) { res.status(500).json({ success: false }); } });
app.put('/api/products/:id', verifyAdmin, async (req, res) => {
    const { title, price, capital_price, stock, category, weight, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty } = req.body;
    try {
        await pool.query(
            `UPDATE products SET title=$1, price=$2, capital_price=$3, stock=$4, category=$5, weight=$6, unit=$7, variant_title=$8, variant_options=$9, wholesale_price=$10, wholesale_min_qty=$11 WHERE id=$12`,
            [title, price, capital_price, stock, category, weight, unit || 'Pcs', variant_title || '', variant_options || '', wholesale_price || 0, wholesale_min_qty || 0, req.params.id]
        ); res.json({ success: true });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.post('/api/coupons/check', async (req, res) => {
    const { code } = req.body;
    try {
        const result = await pool.query('SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE', [code.toUpperCase()]);
        if (result.rows.length > 0) res.json({ success: true, data: result.rows[0] }); else res.json({ success: false, message: "Kupon tidak valid!" });
    } catch(err) { res.status(500).json({ success: false }); }
});
app.get('/api/coupons', verifyAdmin, async (req, res) => { try { const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC'); res.json({ success: true, data: result.rows }); } catch(err) { res.status(500).json({ success: false }); } });
app.post('/api/coupons', verifyAdmin, async (req, res) => { const { code, discount_type, discount_value } = req.body; try { await pool.query('INSERT INTO coupons (code, discount_type, discount_value) VALUES ($1, $2, $3)', [code.toUpperCase(), discount_type, discount_value]); res.json({ success: true }); } catch(err) { res.status(500).json({ success: false }); } });
app.delete('/api/coupons/:id', verifyAdmin, async (req, res) => { try { await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch(err) { res.status(500).json({ success: false }); } });

app.get('/api/reviews/:product_id', async (req, res) => {
    try {
        const reviewQuery = await pool.query(`SELECT r.*, u.name as user_name FROM product_reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC`, [req.params.product_id]);
        const productQuery = await pool.query('SELECT sold_count FROM products WHERE id = $1', [req.params.product_id]);
        const terjual = productQuery.rows.length > 0 ? productQuery.rows[0].sold_count : 0;
        let rataRata = 0; if (reviewQuery.rows.length > 0) { const total = reviewQuery.rows.reduce((s, r) => s + r.rating, 0); rataRata = (total / reviewQuery.rows.length).toFixed(1); }
        res.json({ success: true, rata_rata: rataRata, terjual: terjual, data: reviewQuery.rows });
    } catch (err) { res.status(500).json({ success: false }); }
});
app.post('/api/reviews', verifyToken, async (req, res) => { try { await pool.query('INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)', [req.body.product_id, req.user.id, req.body.rating, req.body.comment]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); } });

app.post('/api/admin/excel/aset', verifyAdmin, uploadExcel.single('file_excel'), async (req, res) => {
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        for (let row of data) { if (row['Nama_Aset']) { await pool.query('INSERT INTO internal_assets (asset_code, asset_name, category, quantity, unit, condition, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)', [row['Kode_Aset']||'-', row['Nama_Aset'], row['Kategori']||'Umum', parseInt(row['Jumlah'])||0, row['Satuan']||'Unit', row['Kondisi']||'Baik', row['Catatan']||'']); } }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});
app.post('/api/admin/excel/draft', verifyAdmin, uploadExcel.single('file_excel'), async (req, res) => {
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        for (let row of data) { if (row['Nama_Barang']) { await pool.query(`INSERT INTO draft_products (title, capital_price, price, stock, category, weight, description, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [row['Nama_Barang'], parseFloat(row['Harga_Modal'])||0, parseFloat(row['Harga_Jual'])||0, parseInt(row['Stok'])||0, row['Kategori']||'biasa', parseInt(row['Berat'])||1000, row['Deskripsi']||'-', row['Satuan_Jual']||'Pcs', row['Judul_Varian']||'', row['Pilihan_Varian']||'', parseFloat(row['Harga_Grosir'])||0, parseInt(row['Min_Grosir'])||0]); } }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});
app.get('/api/admin/excel/aset', verifyAdmin, async (req, res) => { try { const result = await pool.query('SELECT * FROM internal_assets ORDER BY created_at DESC'); res.json({ success: true, data: result.rows }); } catch (err) { res.status(500).json({ success: false }); } });
app.get('/api/admin/excel/draft', verifyAdmin, async (req, res) => { try { const result = await pool.query("SELECT * FROM draft_products WHERE status = 'Pending' ORDER BY created_at DESC"); res.json({ success: true, data: result.rows }); } catch (err) { res.status(500).json({ success: false }); } });
app.post('/api/admin/excel/draft/approve/:id', verifyAdmin, async (req, res) => {
    try {
        const cek = await pool.query('SELECT * FROM draft_products WHERE id = $1', [req.params.id]); if (cek.rows.length === 0) return res.status(404).json({ success: false }); const b = cek.rows[0];
        await pool.query(`INSERT INTO products (title, capital_price, price, stock, category, weight, description, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [b.title, b.capital_price, b.price, b.stock, b.category, b.weight, b.description, b.unit, b.variant_title, b.variant_options, b.wholesale_price, b.wholesale_min_qty]);
        await pool.query("UPDATE draft_products SET status = 'Approved' WHERE id = $1", [req.params.id]); res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/cetak-resi', verifyAdmin, async (req, res) => {
    const { order_id, kurir } = req.body;
    try {
        let p = "JP"; if(kurir.toLowerCase().includes('jne')) p = "JT"; if(kurir.toLowerCase().includes('sicepat')) p = "00"; if(kurir.toLowerCase().includes('ninja')) p = "NL";
        const resi = p + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
        await pool.query('UPDATE orders SET resi = $1, status = $2 WHERE id = $3', [resi, 'Diproses', order_id]);
        res.json({ success: true, resi: resi });
    } catch(err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 🛒 API KERANJANG DATABASE (ANTI-LOCAL STORAGE)
// ==========================================
app.get('/api/cart', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT c.id as cart_id, c.qty, c.variant, p.id as product_id, p.title, p.price, p.media_url, p.weight, p.wholesale_price, p.wholesale_min_qty, p.unit
            FROM carts c JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1 ORDER BY c.created_at DESC
        `;
        const result = await pool.query(query, [req.user.id]);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, message: "Gagal mengambil keranjang" }); }
});

app.post('/api/cart', verifyToken, async (req, res) => {
    const { product_id, variant, qty } = req.body;
    try {
        // Cek apakah barang & varian yang sama sudah ada di keranjang
        const check = await pool.query('SELECT id, qty FROM carts WHERE user_id = $1 AND product_id = $2 AND variant = $3', [req.user.id, product_id, variant || '']);
        
        if (check.rows.length > 0) {
            // Update jumlah (ditambah)
            await pool.query('UPDATE carts SET qty = qty + $1 WHERE id = $2', [qty, check.rows[0].id]);
        } else {
            // Masukkan baru
            await pool.query('INSERT INTO carts (user_id, product_id, variant, qty) VALUES ($1, $2, $3, $4)', [req.user.id, product_id, variant || '', qty]);
        }
        res.json({ success: true, message: "Masuk ke keranjang database!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/cart/:id', verifyToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM carts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/cart/clear/all', verifyToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM carts WHERE user_id = $1', [req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 🛍️ API SESSIONS CHECKOUT 
// ==========================================
app.post('/api/checkout-session', verifyToken, async (req, res) => {
    const { items_json } = req.body;
    try {
        // Hapus session lama jika ada, lalu buat baru (Upsert style)
        await pool.query('DELETE FROM checkout_sessions WHERE user_id = $1', [req.user.id]);
        await pool.query('INSERT INTO checkout_sessions (user_id, items_json) VALUES ($1, $2)', [req.user.id, items_json]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/checkout-session', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT items_json FROM checkout_sessions WHERE user_id = $1', [req.user.id]);
        if(result.rows.length > 0) res.json({ success: true, data: result.rows[0].items_json });
        else res.json({ success: false });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 🔍 API GET 1 PRODUK (UNTUK LINK SHARE URL)
// ==========================================
app.get('/api/products/:id', async (req, res) => {
    try {
        const query = `
            SELECT p.*, COALESCE(ROUND(AVG(r.rating), 1), 0) as avg_rating
            FROM products p LEFT JOIN product_reviews r ON p.id = r.product_id
            WHERE p.id = $1 GROUP BY p.id
        `;
        const result = await pool.query(query, [req.params.id]);
        if(result.rows.length > 0) res.json({ success: true, data: result.rows[0] });
        else res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    } catch (err) { res.status(500).json({ success: false }); }
});


// ==========================================
// ⚙️ API PENGATURAN TOKO (Profil, Auto Reply, dll)
// ==========================================

// ✅ 1. API UNTUK MENGAMBIL SEMUA PENGATURAN (Dibutuhkan oleh Frontend)
app.get('/api/settings/all', async (req, res) => {
    try {
        // Menggunakan alias AS key_name dan value_text agar sesuai dengan yang dicari Frontend
        const result = await pool.query(`SELECT setting_key AS key_name, setting_value AS value_text FROM store_settings`);
        res.json({ success: true, settings: result.rows });
    } catch (err) { 
        res.status(500).json({ success: false }); 
    }
});

// ✅ 2. API UNTUK MENYIMPAN PROFIL TOKO DARI MODAL SETTING
app.post('/api/settings/update_store_profile', verifyAdmin, async (req, res) => {
    const { store_name, store_bio, store_phone, store_city, store_address, store_logo, admin_last_active } = req.body;
    
    try {
        // Kita gunakan teknik UPSERT (Insert jika belum ada, Update jika sudah ada)
        const upsertQuery = `
            INSERT INTO store_settings (setting_key, setting_value) 
            VALUES ($1, $2) 
            ON CONFLICT (setting_key) 
            DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        // Simpan satu per satu ke database jika datanya dikirim dari frontend
        if (store_name !== undefined) await pool.query(upsertQuery, ['store_name', store_name]);
        if (store_bio !== undefined) await pool.query(upsertQuery, ['store_bio', store_bio]);
        if (store_phone !== undefined) await pool.query(upsertQuery, ['store_phone', store_phone]);
        if (store_city !== undefined) await pool.query(upsertQuery, ['store_city', store_city]);
        if (store_address !== undefined) await pool.query(upsertQuery, ['store_address', store_address]);
        if (store_logo !== undefined) await pool.query(upsertQuery, ['store_logo', store_logo]);
        if (admin_last_active !== undefined) await pool.query(upsertQuery, ['admin_last_active', admin_last_active]);

        res.json({ success: true, message: "Profil toko berhasil disimpan!" });
    } catch (err) { 
        console.error("Error Update Profil Toko:", err);
        res.status(500).json({ success: false, message: "Gagal menyimpan ke database." }); 
    }
});

// 3. API Auto Reply (Bawaan asli Anda, biarkan saja)
app.get('/api/settings/autoreply', async (req, res) => {
    try {
        const result = await pool.query(`SELECT setting_value FROM store_settings WHERE setting_key = 'autoreply'`);
        res.json({ success: true, text: result.rows.length > 0 ? result.rows[0].setting_value : "" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/settings/autoreply', verifyAdmin, async (req, res) => {
    try {
        await pool.query(`
            INSERT INTO store_settings (setting_key, setting_value) 
            VALUES ('autoreply', $1) 
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `, [req.body.text]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 🤖 2 ROBOT PEKERJA OTOMATIS (CRON JOBS)
// ==========================================
function jalankanRobotECommerce() {
    
    // ROBOT 1: Auto-Cancel 10 Menit
    setInterval(async () => {
        try {
            const queryCancel = `SELECT id FROM orders WHERE (status = 'Menunggu Pembayaran' OR status = 'Pending') AND created_at < NOW() - INTERVAL '10 minutes'`;
            const hangus = await pool.query(queryCancel);
            if (hangus.rows.length > 0) {
                const idHangus = hangus.rows.map(row => row.id);
                await pool.query(`UPDATE orders SET status = 'Dibatalkan (Expired)' WHERE id = ANY($1::int[])`, [idHangus]);
            }
        } catch (err) { console.error("Robot Cancel Error:", err.message); }
    }, 60000); 

    // ✅ FASE 1: ROBOT 2 (Auto-Selesai 2 Hari dari status Terkirim)
    setInterval(async () => {
        try {
            const querySelesai = `
                UPDATE orders 
                SET status = 'Selesai', completed_at = NOW() 
                WHERE status = 'Terkirim' AND delivered_at < NOW() - INTERVAL '2 days'
                RETURNING id
            `;
            const otomatisSelesai = await pool.query(querySelesai);
            if (otomatisSelesai.rows.length > 0) {
                console.log(`🤖 Robot Auto-Selesai: ${otomatisSelesai.rows.length} pesanan otomatis selesai.`);
            }
        } catch (err) { console.error("Robot Selesai Error:", err.message); }
    }, 3600000); 
}

jalankanRobotECommerce();

app.use((err, req, res, next) => { res.status(500).json({ success: false, message: "Gagal Upload: " + (err.message || "Error Server") }); });
app.listen(PORT, () => { console.log(`🚀 Server belidikita berjalan di port ${PORT}`); });
