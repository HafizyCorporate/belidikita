const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Untuk membaca file/folder
const bcrypt = require('bcrypt'); // Untuk cek password pembeli
const jwt = require('jsonwebtoken'); // Untuk bikin tiket masuk pembeli
require('dotenv').config();

// ==========================================
// ☁️ KONFIGURASI GUDANG CLOUDINARY (ANTI HILANG)
// ==========================================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Masukkan Kunci Cloudinary (Disarankan menggunakan Variables di Railway, tapi ini disematkan sebagai cadangan)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbct8tltw', 
  api_key: process.env.CLOUDINARY_API_KEY || '419391893671787', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vOzR16hMqiAADm5gBm60-_ntTgU' 
});

// Atur Gudang Penyimpanan ke Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'belidikita_images', // Folder otomatis di Cloudinary
    allowedFormats: ['jpeg', 'png', 'jpg', 'webp'], 
  },
});

// Jadikan 'upload' sebagai alat pengangkut (MENGGANTIKAN multer/upload lokal sebelumnya)
const upload = multer({ storage: storage });
// ==========================================

// --- INJEKSI AUTO-DB ---
const { pool, initDB } = require('./config/db'); 

// --- IMPORT CONTROLLERS ---
const { register, verifyOTP, googleLogin, forgotPassword, resetPassword } = require('./controllers/auth/auth');
const { getProfile, updateProfile } = require('./controllers/profile/profile');
const { uploadProduct, getAllProducts, uploadPromo, getPromos } = require('./controllers/product/product');
const { createPost, getPosts } = require('./controllers/forum/forum');
const { askAI } = require('./controllers/ai/ai');

// Middleware Token
const verifyToken = require('./middleware/auth'); 

const app = express();
const PORT = process.env.PORT || 8080;

initDB();

// ✅ PENGAMANAN: Folder uploads lokal tetap dibiarkan untuk berjaga-jaga (meski sekarang pakai Cloudinary)
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("✅ Folder public/uploads berhasil dibuat otomatis!");
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
// Jika ada file lama di folder lokal, tetap bisa diakses lewat /uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboardutama.html')); });

// ==========================================
// 🔓 API PUBLIK
// ==========================================
app.post('/api/register', register);
app.post('/api/verify-otp', verifyOTP);
app.post('/api/google-login', googleLogin);
app.post('/api/forgot-password', forgotPassword);
app.post('/api/reset-password', resetPassword);

// ✅ GABUNGAN LOGIN ADMIN & LOGIN PEMBELI
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body; 
    
    // 1. CEK JALUR KHUSUS ADMIN DULU
    const admins = [
        { username: "Versacy", password: "08556645" },
        { username: "Farid", password: "11223344" }
    ];
    const validAdmin = admins.find(a => a.username === username && a.password === password);

    if (validAdmin) {
        return res.json({ success: true, message: `Selamat datang, Admin ${validAdmin.username}!`, token: `token-admin-${validAdmin.username}` });
    }

    // 2. JIKA BUKAN ADMIN, CARI KE DATABASE UNTUK PEMBELI
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [username]);
        if (user.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Email atau password salah!" });
        }

        // Cek kecocokan sandi pembeli
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: "Email atau password salah!" });
        }

        // Bikin tiket JWT untuk pembeli
        const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_belidikita_super_aman';
        const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ success: true, message: "Login berhasil!", token: token });
    } catch (err) {
        console.error("🔥 Error Login Pembeli:", err);
        res.status(500).json({ success: false, message: "Server Error saat login." });
    }
});

app.post('/api/ai/search', askAI);
app.get('/api/products', getAllProducts); 
app.get('/api/promos', getPromos); 
app.get('/api/forum', getPosts);          

// ==========================================
// 🔒 API PRIVAT (DENGAN JALUR KHUSUS ADMIN)
// ==========================================
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer token-admin-')) {
        req.user = { id: 1, role: 'admin' }; // Kunci master Admin
        return next();
    }
    verifyToken(req, res, next);
};

app.get('/api/profile', verifyToken, getProfile);
app.put('/api/profile', verifyToken, updateProfile);

// ✅ TAMBAHAN: API UNTUK SIMPAN DAN AMBIL ALAMAT PEMBELI
app.get('/api/address', verifyToken, async (req, res) => {
    try {
        // Otomatis bikin tabel alamat kalau belum ada
        await pool.query(`CREATE TABLE IF NOT EXISTS user_addresses (
            user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            nama_penerima VARCHAR(100),
            nomor_wa VARCHAR(20),
            alamat_lengkap TEXT
        )`);

        const result = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [req.user.id]);
        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.json({ success: true, data: null });
        }
    } catch (err) {
        console.error("🔥 Error Ambil Alamat:", err);
        res.status(500).json({ success: false, message: "Gagal mengambil alamat." });
    }
});

app.post('/api/address', verifyToken, async (req, res) => {
    const { nama, wa, detail } = req.body;
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS user_addresses (
            user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            nama_penerima VARCHAR(100),
            nomor_wa VARCHAR(20),
            alamat_lengkap TEXT
        )`);

        // Logika menimpa data jika alamat sudah pernah diisi (UPSERT)
        const query = `
            INSERT INTO user_addresses (user_id, nama_penerima, nomor_wa, alamat_lengkap)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE 
            SET nama_penerima = EXCLUDED.nama_penerima,
                nomor_wa = EXCLUDED.nomor_wa,
                alamat_lengkap = EXCLUDED.alamat_lengkap
            RETURNING *;
        `;
        const result = await pool.query(query, [req.user.id, nama, wa, detail]);
        res.json({ success: true, message: "Alamat berhasil disimpan permanen!", data: result.rows[0] });
    } catch (err) {
        console.error("🔥 Error Simpan Alamat:", err);
        res.status(500).json({ success: false, message: "Gagal menyimpan alamat di server." });
    }
});

// ✅ UPLOAD CLOUDINARY: Rute ini sekarang menggunakan multer "upload" versi awan
app.post('/api/products', verifyAdmin, upload.array('media', 5), uploadProduct);
app.post('/api/promos', verifyAdmin, upload.single('media'), uploadPromo); 
app.post('/api/forum', verifyToken, createPost);

// ==========================================
// 🔥 API BARU: HAPUS DAN EDIT (KHUSUS ADMIN)
// ==========================================

// 1. Hapus Produk
app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: "Produk berhasil dihapus!" });
    } catch(err) {
        console.error("🔥 Error Hapus Produk:", err);
        res.status(500).json({ success: false, message: "Gagal menghapus produk" });
    }
});

// 2. Hapus Banner Promo
app.delete('/api/promos/:id', verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM promo_sliders WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: "Banner berhasil dihapus!" });
    } catch(err) {
        console.error("🔥 Error Hapus Banner:", err);
        res.status(500).json({ success: false, message: "Gagal menghapus banner" });
    }
});

// 3. Edit Produk (Menerima Berat)
app.put('/api/products/:id', verifyAdmin, async (req, res) => {
    const { title, price, capital_price, stock, category, weight } = req.body;
    try {
        await pool.query(
            'UPDATE products SET title=$1, price=$2, capital_price=$3, stock=$4, category=$5, weight=$6 WHERE id=$7',
            [title, price, capital_price, stock, category, weight, req.params.id]
        );
        res.json({ success: true, message: "Produk berhasil diubah!" });
    } catch(err) { 
        console.error("🔥 Error Edit Produk:", err);
        res.status(500).json({ success: false, message: "Gagal mengedit produk" }); 
    }
});

// ==========================================
// 🛒 API PEMESANAN (ORDER & RESI)
// ==========================================

// 1. Pembeli Membuat Pesanan Baru (Checkout)
app.post('/api/orders', verifyToken, async (req, res) => {
    const { customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO orders (user_id, customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [req.user.id, customer_name, customer_wa, shipping_address, items, total_price, shipping_courier, shipping_cost, payment_method]
        );
        res.json({ success: true, message: "Pesanan berhasil masuk ke database!", order_id: result.rows[0].id });
    } catch(err) {
        console.error("🔥 Error Buat Pesanan:", err);
        res.status(500).json({ success: false, message: "Gagal menyimpan pesanan" });
    }
});

// ✅ 2. Pembeli Melihat Riwayat Pesanannya Sendiri (Tembok: is_hidden_buyer)
app.get('/api/orders/me', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 AND is_hidden_buyer = FALSE ORDER BY created_at DESC', [req.user.id]);
        res.json({ success: true, data: result.rows });
    } catch(err) {
        res.status(500).json({ success: false, message: "Gagal memuat riwayat" });
    }
});

// ✅ 3. Admin Melihat Semua Pesanan (Tembok: is_hidden_admin)
app.get('/api/orders', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE is_hidden_admin = FALSE ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch(err) {
        res.status(500).json({ success: false, message: "Gagal memuat semua pesanan" });
    }
});

// 4. Admin Update Status & Resi Pesanan
app.put('/api/orders/:id', verifyAdmin, async (req, res) => {
    const { status, resi } = req.body;
    try {
        await pool.query(
            'UPDATE orders SET status=$1, resi=$2 WHERE id=$3',
            [status, resi, req.params.id]
        );
        res.json({ success: true, message: "Pesanan berhasil diupdate!" });
    } catch(err) {
        console.error("🔥 Error Update Pesanan:", err);
        res.status(500).json({ success: false, message: "Gagal mengupdate pesanan" });
    }
});

// ✅ 5. Hapus Pesanan (BENAR-BENAR TERPISAH: Soft Delete)
app.delete('/api/orders/:id', verifyAdmin, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // ADMIN HAPUS: Cuma sembunyikan dari layar Admin, di HP pembeli tetap ada.
            await pool.query('UPDATE orders SET is_hidden_admin = TRUE WHERE id = $1', [req.params.id]);
            res.json({ success: true, message: "Pesanan berhasil dibersihkan dari layar Admin!" });
        } else {
            // PEMBELI HAPUS: Cuma sembunyikan dari layar Pembeli, di layar Admin tetap ada.
            await pool.query('UPDATE orders SET is_hidden_buyer = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
            res.json({ success: true, message: "Riwayat pesanan berhasil dibersihkan dari layar Anda!" });
        }
    } catch(err) {
        console.error("🔥 Error Hapus Pesanan:", err);
        res.status(500).json({ success: false, message: "Gagal menghapus pesanan" });
    }
});

app.listen(PORT, () => { console.log(`🚀 Server belidikita berjalan di port ${PORT}`); });
