const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Untuk membaca file/folder
const bcrypt = require('bcrypt'); // Untuk cek password pembeli
const jwt = require('jsonwebtoken'); // Untuk bikin tiket masuk pembeli
const xlsx = require('xlsx'); // ✅ ALAT BARU: PEMBACA EXCEL
require('dotenv').config();

// ==========================================
// ☁️ KONFIGURASI GUDANG CLOUDINARY (ANTI HILANG)
// ==========================================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Masukkan Kunci Cloudinary
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

// ✅ ALAT KHUSUS: PENGANGKUT FILE EXCEL (Disimpan di memori sementara, tidak ke Cloudinary)
const uploadExcel = multer({ storage: multer.memoryStorage() });

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

const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("✅ Folder public/uploads berhasil dibuat otomatis!");
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
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

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: "Email atau password salah!" });
        }

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

app.get('/api/address', verifyToken, async (req, res) => {
    try {
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


// ✅ UPLOAD CLOUDINARY: Rute ini menerima DNA Baru (Satuan & Varian)
app.post('/api/products', verifyAdmin, upload.array('media', 5), async (req, res) => {
    const { title, capital_price, price, stock, category, description, weight, unit, variant_title, variant_options } = req.body;
    
    try {
        const mediaUrls = req.files ? req.files.map(f => f.path) : [];
        const mediaJson = JSON.stringify(mediaUrls);
        
        await pool.query(
            `INSERT INTO products (title, capital_price, price, stock, category, description, weight, media_url, media_type, unit, variant_title, variant_options) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'image', $9, $10, $11)`,
            [title, capital_price || 0, price, stock || 0, category || 'biasa', description, weight || 1000, mediaJson, unit || 'Pcs', variant_title || '', variant_options || '']
        );
        res.json({ success: true, message: "Produk berhasil diupload!" });
    } catch (err) {
        console.error("🔥 Error Upload Produk:", err);
        res.status(500).json({ success: false, message: "Gagal upload produk." });
    }
});

app.post('/api/promos', verifyAdmin, upload.single('media'), uploadPromo); 
app.post('/api/forum', verifyToken, createPost);

// ==========================================
// 🔥 API BARU: HAPUS DAN EDIT (KHUSUS ADMIN)
// ==========================================
app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: "Produk berhasil dihapus!" });
    } catch(err) {
        console.error("🔥 Error Hapus Produk:", err);
        res.status(500).json({ success: false, message: "Gagal menghapus produk" });
    }
});

app.delete('/api/promos/:id', verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM promo_sliders WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: "Banner berhasil dihapus!" });
    } catch(err) {
        console.error("🔥 Error Hapus Banner:", err);
        res.status(500).json({ success: false, message: "Gagal menghapus banner" });
    }
});

// ✅ EDIT PRODUK: Rute ini menerima DNA Baru (Satuan & Varian)
app.put('/api/products/:id', verifyAdmin, async (req, res) => {
    const { title, price, capital_price, stock, category, weight, unit, variant_title, variant_options } = req.body;
    try {
        await pool.query(
            `UPDATE products SET 
                title=$1, price=$2, capital_price=$3, stock=$4, category=$5, weight=$6, 
                unit=$7, variant_title=$8, variant_options=$9 
             WHERE id=$10`,
            [title, price, capital_price, stock, category, weight, unit || 'Pcs', variant_title || '', variant_options || '', req.params.id]
        );
        res.json({ success: true, message: "Produk berhasil diubah!" });
    } catch(err) { 
        console.error("🔥 Error Edit Produk:", err);
        res.status(500).json({ success: false, message: "Gagal mengedit produk" }); 
    }
});

// ==========================================
// 🎟️ API KUPON DISKON (UNTUK CHECKOUT)
// ==========================================
app.post('/api/coupons/check', async (req, res) => {
    const { code } = req.body;
    try {
        const result = await pool.query('SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE', [code.toUpperCase()]);
        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.json({ success: false, message: "Kupon tidak valid, kedaluwarsa, atau tidak ditemukan!" });
        }
    } catch(err) {
        console.error("🔥 Error Cek Kupon:", err);
        res.status(500).json({ success: false, message: "Server error saat mengecek kupon." });
    }
});

app.get('/api/coupons', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.post('/api/coupons', verifyAdmin, async (req, res) => {
    const { code, discount_type, discount_value } = req.body;
    try {
        await pool.query(
            'INSERT INTO coupons (code, discount_type, discount_value) VALUES ($1, $2, $3)',
            [code.toUpperCase(), discount_type, discount_value]
        );
        res.json({ success: true, message: "Kupon berhasil dibuat!" });
    } catch(err) { res.status(500).json({ success: false, message: "Kode kupon mungkin sudah ada!" }); }
});

app.delete('/api/coupons/:id', verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: "Kupon dihapus!" });
    } catch(err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 🛒 API PEMESANAN (ORDER & RESI)
// ==========================================
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

app.get('/api/orders/me', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 AND is_hidden_buyer = FALSE ORDER BY created_at DESC', [req.user.id]);
        res.json({ success: true, data: result.rows });
    } catch(err) {
        res.status(500).json({ success: false, message: "Gagal memuat riwayat" });
    }
});

app.get('/api/orders', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE is_hidden_admin = FALSE ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch(err) {
        res.status(500).json({ success: false, message: "Gagal memuat semua pesanan" });
    }
});

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

app.delete('/api/orders/:id', verifyAdmin, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            await pool.query('UPDATE orders SET is_hidden_admin = TRUE WHERE id = $1', [req.params.id]);
            res.json({ success: true, message: "Pesanan berhasil dibersihkan dari layar Admin!" });
        } else {
            await pool.query('UPDATE orders SET is_hidden_buyer = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
            res.json({ success: true, message: "Riwayat pesanan berhasil dibersihkan dari layar Anda!" });
        }
    } catch(err) {
        console.error("🔥 Error Hapus Pesanan:", err);
        res.status(500).json({ success: false, message: "Gagal menghapus pesanan" });
    }
});

app.put('/api/orders/:id/return', verifyToken, upload.single('proof'), async (req, res) => {
    const { reason } = req.body;
    const proof_url = req.file ? req.file.path : null;

    if (!proof_url) return res.status(400).json({ success: false, message: "Bukti video/foto unboxing dari sebelum paket dibuka WAJIB dilampirkan!" });
    if (!reason) return res.status(400).json({ success: false, message: "Alasan retur wajib diisi!" });

    try {
        const cekOrder = await pool.query('SELECT status FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (cekOrder.rows.length === 0) return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan!" });

        await pool.query(
            "UPDATE orders SET status = 'Ajukan Retur', return_reason = $1, return_media = $2 WHERE id = $3",
            [reason, proof_url, req.params.id]
        );
        res.json({ success: true, message: "Pengajuan retur & bukti berhasil dikirim ke Admin!" });
    } catch(err) {
        console.error("🔥 Error Retur:", err);
        res.status(500).json({ success: false, message: "Gagal mengajukan retur" });
    }
});

// ==========================================
// ⭐ API ULASAN & JUMLAH TERJUAL (REAL)
// ==========================================
app.get('/api/reviews/:product_id', async (req, res) => {
    try {
        const productId = req.params.product_id;
        const reviewQuery = await pool.query(`
            SELECT r.*, u.name as user_name 
            FROM product_reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.product_id = $1 
            ORDER BY r.created_at DESC
        `, [productId]);
        
        const productQuery = await pool.query('SELECT sold_count FROM products WHERE id = $1', [productId]);
        const terjual = productQuery.rows.length > 0 ? productQuery.rows[0].sold_count : 0;

        const reviews = reviewQuery.rows;
        let rataRata = 0;
        
        if (reviews.length > 0) {
            const totalBintang = reviews.reduce((sum, rev) => sum + rev.rating, 0);
            rataRata = (totalBintang / reviews.length).toFixed(1); 
        }

        res.json({ success: true, rata_rata: rataRata, terjual: terjual, data: reviews });
    } catch (err) {
        console.error("🔥 Error Get Reviews:", err);
        res.status(500).json({ success: false, message: "Gagal memuat ulasan" });
    }
});

app.post('/api/reviews', verifyToken, async (req, res) => {
    const { product_id, rating, comment } = req.body;
    try {
        await pool.query(
            'INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)',
            [product_id, req.user.id, rating, comment]
        );
        res.json({ success: true, message: "Terima kasih! Ulasan Anda berhasil disimpan." });
    } catch (err) {
        console.error("🔥 Error Post Review:", err);
        res.status(500).json({ success: false, message: "Gagal mengirim ulasan" });
    }
});

// ==========================================
// 🟢 API BARU: RUANG KARANTINA & UPLOAD EXCEL
// ==========================================

// 1. Upload Excel Aset Internal
app.post('/api/admin/excel/aset', verifyAdmin, uploadExcel.single('file_excel'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "File Excel tidak ditemukan!" });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; 
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) return res.status(400).json({ success: false, message: "File Excel kosong!" });

        let berhasil = 0;
        for (let row of data) {
            const kode = row['Kode_Aset'] || '-';
            const nama = row['Nama_Aset'];
            const kategori = row['Kategori'] || 'Umum';
            const qty = parseInt(row['Jumlah']) || 0;
            const kondisi = row['Kondisi'] || 'Baik';
            const notes = row['Catatan'] || '';

            if (nama) {
                await pool.query(
                    'INSERT INTO internal_assets (asset_code, asset_name, category, quantity, condition, notes) VALUES ($1, $2, $3, $4, $5, $6)',
                    [kode, nama, kategori, qty, kondisi, notes]
                );
                berhasil++;
            }
        }

        res.json({ success: true, message: `Berhasil mengimport ${berhasil} data aset internal!` });
    } catch (err) {
        console.error("🔥 Error Import Excel Aset:", err);
        res.status(500).json({ success: false, message: "Gagal memproses file Excel." });
    }
});

// ✅ 2. Upload Excel Draft Persediaan DENGAN DNA BARU
app.post('/api/admin/excel/draft', verifyAdmin, uploadExcel.single('file_excel'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "File Excel tidak ditemukan!" });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) return res.status(400).json({ success: false, message: "File Excel kosong!" });

        let berhasil = 0;
        for (let row of data) {
            // Header Excel BARU: Nama_Barang, Harga_Modal, Harga_Jual, Stok, Kategori, Berat, Deskripsi, Satuan_Jual, Judul_Varian, Pilihan_Varian
            const nama = row['Nama_Barang'];
            const modal = parseFloat(row['Harga_Modal']) || 0;
            const jual = parseFloat(row['Harga_Jual']) || 0;
            const stok = parseInt(row['Stok']) || 0;
            const kategori = row['Kategori'] || 'biasa';
            const berat = parseInt(row['Berat']) || 1000;
            const deskripsi = row['Deskripsi'] || 'Barang baru dari Excel.';
            
            // Tangkap DNA Varian & Satuan dari Excel
            const satuan = row['Satuan_Jual'] || 'Pcs';
            const judulVarian = row['Judul_Varian'] || '';
            const pilihanVarian = row['Pilihan_Varian'] || '';

            if (nama && jual > 0) {
                await pool.query(
                    `INSERT INTO draft_products 
                    (title, capital_price, price, stock, category, weight, description, unit, variant_title, variant_options) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [nama, modal, jual, stok, kategori, berat, deskripsi, satuan, judulVarian, pilihanVarian]
                );
                berhasil++;
            }
        }

        res.json({ success: true, message: `Berhasil menyimpan ${berhasil} barang ke ruang karantina!` });
    } catch (err) {
        console.error("🔥 Error Import Excel Draft:", err);
        res.status(500).json({ success: false, message: "Gagal memproses file Excel." });
    }
});


// 3. Lihat Daftar Aset Internal
app.get('/api/admin/excel/aset', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM internal_assets ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) { 
        res.status(500).json({ success: false, message: "Gagal memuat data aset." }); 
    }
});

// 4. Lihat Daftar Draft Persediaan
app.get('/api/admin/excel/draft', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM draft_products WHERE status = 'Pending' ORDER BY created_at DESC");
        res.json({ success: true, data: result.rows });
    } catch (err) { 
        res.status(500).json({ success: false, message: "Gagal memuat data karantina." }); 
    }
});

// ✅ 5. Super Admin ACC Barang DENGAN DNA BARU
app.post('/api/admin/excel/draft/approve/:id', verifyAdmin, async (req, res) => {
    try {
        const draftId = req.params.id;
        
        const cekDraft = await pool.query('SELECT * FROM draft_products WHERE id = $1', [draftId]);
        if (cekDraft.rows.length === 0) return res.status(404).json({ success: false, message: "Data draft tidak ditemukan!" });
        
        const barang = cekDraft.rows[0];

        // Suntikkan ke tabel products utama (Membawa unit dan variannya)
        await pool.query(
            `INSERT INTO products (title, capital_price, price, stock, category, weight, description, unit, variant_title, variant_options) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [barang.title, barang.capital_price, barang.price, barang.stock, barang.category, barang.weight, barang.description, barang.unit, barang.variant_title, barang.variant_options]
        );

        await pool.query("UPDATE draft_products SET status = 'Approved' WHERE id = $1", [draftId]);

        res.json({ success: true, message: "Barang berhasil dilempar ke Etalase Toko!" });
    } catch (err) {
        console.error("🔥 Error Approve Draft:", err);
        res.status(500).json({ success: false, message: "Gagal memproses ACC barang." });
    }
});


// ==========================================
// 🚨 PENANGKAP ERROR GLOBAL
// ==========================================
app.use((err, req, res, next) => {
    console.error("🔥 ERROR TERDETEKSI DARI MESIN UPLOAD:");
    console.error(JSON.stringify(err, null, 2)); 
    console.error("PESAN ERROR:", err.message);
    
    res.status(500).json({ 
        success: false, 
        message: "Gagal Upload: " + (err.message || "Kesalahan pada Cloudinary") 
    });
});

app.listen(PORT, () => { console.log(`🚀 Server belidikita berjalan di port ${PORT}`); });
