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
// (getAllProducts kita override di bawah, jadi abaikan yang di import ini)
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ✅ PERBAIKAN: MENGAMBIL RATA-RATA BINTANG REAL DARI DATABASE
app.get('/api/products', async (req, res) => {
    try {
        const query = `
            SELECT p.*, 
                   COALESCE(ROUND(AVG(r.rating), 1), 0) as avg_rating
            FROM products p
            LEFT JOIN product_reviews r ON p.id = r.product_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("🔥 Error Get Products:", err);
        res.status(500).json({ success: false, message: "Server error" });
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
    const { message, sender } = req.body; 
    try {
        await pool.query("INSERT INTO chats (user_id, sender_role, message) VALUES ($1, $2, $3)", [req.user.id, sender, message]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/chat/me', verifyToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM chats WHERE user_id = $1 ORDER BY created_at ASC", [req.user.id]);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/chats', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, u.name as user_name 
            FROM chats c JOIN users u ON c.user_id = u.id 
            WHERE c.id IN (SELECT MAX(id) FROM chats GROUP BY user_id) 
            ORDER BY c.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 🚚 API RAJAONGKIR (HITUNG ONGKIR REAL-TIME)
// ==========================================
app.post('/api/ongkir/hitung', verifyToken, async (req, res) => {
    const { kota_asal, kota_tujuan, berat, kurir } = req.body;
    
    // 🚨 Wajib masukkan API Key RajaOngkir di Railway/env nanti
    const apiKey = process.env.RAJAONGKIR_KEY; 

    // Jika belum ada API Key, pakai harga fallback (cadangan) aman
    if (!apiKey) {
        return res.json({ success: true, ongkir: 15000 * Math.ceil(berat/1000) });
    }

    try {
        // 1. Ambil list kota dari RajaOngkir
        const cityRes = await fetch('https://api.rajaongkir.com/starter/city', { headers: { 'key': apiKey } });
        const cityData = await cityRes.json();
        const cities = cityData.rajaongkir.results;

        // 2. Fungsi Cerdas: Cocokkan teks alamat dengan ID Kota RajaOngkir
        const findCityId = (teksAlamat) => {
            if (!teksAlamat) return null;
            const alamatLower = teksAlamat.toLowerCase();
            const found = cities.find(c => alamatLower.includes(c.city_name.toLowerCase()));
            return found ? found.city_id : null;
        };

        const originId = findCityId(kota_asal) || "22"; // 22 = Default ID Bandung
        const destId = findCityId(kota_tujuan) || "114"; // 114 = Default ID Denpasar

        // 3. Paksa kurir ke JNE/POS/TIKI (Karena RajaOngkir Starter hanya dukung 3 ini)
        let realKurir = kurir.toLowerCase();
        if(realKurir === 'jnt' || realKurir === 'sicepat') realKurir = 'jne';

        // 4. Tembak API Cost RajaOngkir
        const costRes = await fetch('https://api.rajaongkir.com/starter/cost', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'key': apiKey },
            body: new URLSearchParams({ origin: originId, destination: destId, weight: berat, courier: realKurir })
        });
        const costData = await costRes.json();

        // 5. Kirim balasan harga asli ke layar Checkout
        if (costData.rajaongkir.status.code === 200 && costData.rajaongkir.results[0].costs.length > 0) {
            const realOngkir = costData.rajaongkir.results[0].costs[0].cost[0].value;
            res.json({ success: true, ongkir: realOngkir });
        } else {
            res.json({ success: true, ongkir: 15000 * Math.ceil(berat/1000) }); // Fallback
        }
    } catch (e) {
        res.json({ success: true, ongkir: 15000 * Math.ceil(berat/1000) }); // Fallback Error
    }
});
// ==========================================

app.get('/api/profile', verifyToken, getProfile);
app.put('/api/profile', verifyToken, updateProfile);

app.get('/api/address', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [req.user.id]);
        if (result.rows.length > 0) res.json({ success: true, data: result.rows[0] });
        else res.json({ success: true, data: null });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/address', verifyToken, async (req, res) => {
    const { nama, wa, detail } = req.body;
    try {
        const query = `
            INSERT INTO user_addresses (user_id, nama_penerima, nomor_wa, alamat_lengkap) VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE SET nama_penerima = EXCLUDED.nama_penerima, nomor_wa = EXCLUDED.nomor_wa, alamat_lengkap = EXCLUDED.alamat_lengkap RETURNING *;
        `;
        const result = await pool.query(query, [req.user.id, nama, wa, detail]);
        res.json({ success: true, message: "Alamat berhasil disimpan permanen!", data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/products', verifyAdmin, upload.array('media', 5), async (req, res) => {
    const { title, capital_price, price, stock, category, description, weight, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty } = req.body;
    try {
        const mediaUrls = req.files ? req.files.map(f => f.path) : [];
        const mediaJson = JSON.stringify(mediaUrls);
        
        await pool.query(
            `INSERT INTO products (title, capital_price, price, stock, category, description, weight, media_url, media_type, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'image', $9, $10, $11, $12, $13)`,
            [title, capital_price || 0, price, stock || 0, category || 'biasa', description, weight || 1000, mediaJson, unit || 'Pcs', variant_title || '', variant_options || '', wholesale_price || 0, wholesale_min_qty || 0]
        );
        res.json({ success: true, message: "Produk berhasil diupload!" });
    } catch (err) { res.status(500).json({ success: false, message: "Gagal upload produk." }); }
});

app.post('/api/promos', verifyAdmin, upload.single('media'), uploadPromo); 
app.post('/api/forum', verifyToken, createPost);

app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
    try { await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]); res.json({ success: true, message: "Produk berhasil dihapus!" });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.delete('/api/promos/:id', verifyAdmin, async (req, res) => {
    try { await pool.query('DELETE FROM promo_sliders WHERE id = $1', [req.params.id]); res.json({ success: true, message: "Banner dihapus!" });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.put('/api/products/:id', verifyAdmin, async (req, res) => {
    const { title, price, capital_price, stock, category, weight, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty } = req.body;
    try {
        await pool.query(
            `UPDATE products SET 
                title=$1, price=$2, capital_price=$3, stock=$4, category=$5, weight=$6, 
                unit=$7, variant_title=$8, variant_options=$9, wholesale_price=$10, wholesale_min_qty=$11 
             WHERE id=$12`,
            [title, price, capital_price, stock, category, weight, unit || 'Pcs', variant_title || '', variant_options || '', wholesale_price || 0, wholesale_min_qty || 0, req.params.id]
        );
        res.json({ success: true, message: "Produk berhasil diubah!" });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.post('/api/coupons/check', async (req, res) => {
    const { code } = req.body;
    try {
        const result = await pool.query('SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE', [code.toUpperCase()]);
        if (result.rows.length > 0) res.json({ success: true, data: result.rows[0] });
        else res.json({ success: false, message: "Kupon tidak valid!" });
    } catch(err) { res.status(500).json({ success: false }); }
});
app.get('/api/coupons', verifyAdmin, async (req, res) => {
    try { const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC'); res.json({ success: true, data: result.rows }); } catch(err) { res.status(500).json({ success: false }); }
});
app.post('/api/coupons', verifyAdmin, async (req, res) => {
    const { code, discount_type, discount_value } = req.body;
    try { await pool.query('INSERT INTO coupons (code, discount_type, discount_value) VALUES ($1, $2, $3)', [code.toUpperCase(), discount_type, discount_value]); res.json({ success: true, message: "Kupon dibuat!" }); } catch(err) { res.status(500).json({ success: false }); }
});
app.delete('/api/coupons/:id', verifyAdmin, async (req, res) => {
    try { await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch(err) { res.status(500).json({ success: false }); }
});

app.post('/api/orders', verifyToken, async (req, res) => {
    const { customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method } = req.body;
    try {
        const result = await pool.query(`INSERT INTO orders (user_id, customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`, [req.user.id, customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method]);
        res.json({ success: true, order_id: result.rows[0].id });
    } catch(err) { res.status(500).json({ success: false }); }
});
app.get('/api/orders/me', verifyToken, async (req, res) => {
    try { const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 AND is_hidden_buyer = FALSE ORDER BY created_at DESC', [req.user.id]); res.json({ success: true, data: result.rows }); } catch(err) { res.status(500).json({ success: false }); }
});
app.get('/api/orders', verifyAdmin, async (req, res) => {
    try { const result = await pool.query('SELECT * FROM orders WHERE is_hidden_admin = FALSE ORDER BY created_at DESC'); res.json({ success: true, data: result.rows }); } catch(err) { res.status(500).json({ success: false }); }
});
app.put('/api/orders/:id', verifyAdmin, async (req, res) => {
    const { status, resi } = req.body;
    try { await pool.query('UPDATE orders SET status=$1, resi=$2 WHERE id=$3', [status, resi, req.params.id]); res.json({ success: true }); } catch(err) { res.status(500).json({ success: false }); }
});
app.delete('/api/orders/:id', verifyAdmin, async (req, res) => {
    try {
        if (req.user.role === 'admin') await pool.query('UPDATE orders SET is_hidden_admin = TRUE WHERE id = $1', [req.params.id]);
        else await pool.query('UPDATE orders SET is_hidden_buyer = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ success: false }); }
});
app.put('/api/orders/:id/return', verifyToken, upload.single('proof'), async (req, res) => {
    const { reason } = req.body; const proof_url = req.file ? req.file.path : null;
    if (!proof_url || !reason) return res.status(400).json({ success: false, message: "Bukti/Alasan wajib diisi!" });
    try {
        await pool.query("UPDATE orders SET status = 'Ajukan Retur', return_reason = $1, return_media = $2 WHERE id = $3", [reason, proof_url, req.params.id]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.get('/api/reviews/:product_id', async (req, res) => {
    try {
        const productId = req.params.product_id;
        const reviewQuery = await pool.query(`SELECT r.*, u.name as user_name FROM product_reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC`, [productId]);
        const productQuery = await pool.query('SELECT sold_count FROM products WHERE id = $1', [productId]);
        const terjual = productQuery.rows.length > 0 ? productQuery.rows[0].sold_count : 0;
        const reviews = reviewQuery.rows; let rataRata = 0;
        if (reviews.length > 0) { const totalBintang = reviews.reduce((sum, rev) => sum + rev.rating, 0); rataRata = (totalBintang / reviews.length).toFixed(1); }
        res.json({ success: true, rata_rata: rataRata, terjual: terjual, data: reviews });
    } catch (err) { res.status(500).json({ success: false }); }
});
app.post('/api/reviews', verifyToken, async (req, res) => {
    try { await pool.query('INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)', [req.body.product_id, req.user.id, req.body.rating, req.body.comment]); res.json({ success: true }); } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/excel/aset', verifyAdmin, uploadExcel.single('file_excel'), async (req, res) => {
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let berhasil = 0;
        for (let row of data) {
            const nama = row['Nama_Aset'];
            if (nama) {
                await pool.query('INSERT INTO internal_assets (asset_code, asset_name, category, quantity, unit, condition, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)', [row['Kode_Aset']||'-', nama, row['Kategori']||'Umum', parseInt(row['Jumlah'])||0, row['Satuan']||'Unit', row['Kondisi']||'Baik', row['Catatan']||'']);
                berhasil++;
            }
        }
        res.json({ success: true, message: `Berhasil mengimport ${berhasil} data aset!` });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/excel/draft', verifyAdmin, uploadExcel.single('file_excel'), async (req, res) => {
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let berhasil = 0;
        for (let row of data) {
            const nama = row['Nama_Barang']; const jual = parseFloat(row['Harga_Jual']) || 0;
            const grosirHarga = parseFloat(row['Harga_Grosir']) || 0;
            const grosirMin = parseInt(row['Min_Grosir']) || 0;

            if (nama && jual > 0) {
                await pool.query(
                    `INSERT INTO draft_products 
                    (title, capital_price, price, stock, category, weight, description, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [nama, parseFloat(row['Harga_Modal'])||0, jual, parseInt(row['Stok'])||0, row['Kategori']||'biasa', parseInt(row['Berat'])||1000, row['Deskripsi']||'-', row['Satuan_Jual']||'Pcs', row['Judul_Varian']||'', row['Pilihan_Varian']||'', grosirHarga, grosirMin]
                );
                berhasil++;
            }
        }
        res.json({ success: true, message: `Berhasil menyimpan ${berhasil} barang ke ruang karantina!` });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/excel/aset', verifyAdmin, async (req, res) => {
    try { const result = await pool.query('SELECT * FROM internal_assets ORDER BY created_at DESC'); res.json({ success: true, data: result.rows }); } catch (err) { res.status(500).json({ success: false }); }
});
app.get('/api/admin/excel/draft', verifyAdmin, async (req, res) => {
    try { const result = await pool.query("SELECT * FROM draft_products WHERE status = 'Pending' ORDER BY created_at DESC"); res.json({ success: true, data: result.rows }); } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/excel/draft/approve/:id', verifyAdmin, async (req, res) => {
    try {
        const cekDraft = await pool.query('SELECT * FROM draft_products WHERE id = $1', [req.params.id]);
        if (cekDraft.rows.length === 0) return res.status(404).json({ success: false });
        const b = cekDraft.rows[0];

        await pool.query(
            `INSERT INTO products (title, capital_price, price, stock, category, weight, description, unit, variant_title, variant_options, wholesale_price, wholesale_min_qty) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [b.title, b.capital_price, b.price, b.stock, b.category, b.weight, b.description, b.unit, b.variant_title, b.variant_options, b.wholesale_price, b.wholesale_min_qty]
        );
        await pool.query("UPDATE draft_products SET status = 'Approved' WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "Barang berhasil dilempar ke Etalase Toko!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.use((err, req, res, next) => { res.status(500).json({ success: false, message: "Gagal Upload: " + (err.message || "Error Server") }); });
app.listen(PORT, () => { console.log(`🚀 Server belidikita berjalan di port ${PORT}`); });
