const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // ✅ TAMBAHAN: Untuk membaca file/folder
const bcrypt = require('bcrypt'); // ✅ TAMBAHAN: Untuk cek password pembeli
const jwt = require('jsonwebtoken'); // ✅ TAMBAHAN: Untuk bikin tiket masuk pembeli
require('dotenv').config();

// --- INJEKSI AUTO-DB ---
const { pool, initDB } = require('./config/db'); 

// --- IMPORT CONTROLLERS ---
const { register, verifyOTP, googleLogin, forgotPassword, resetPassword } = require('./controllers/auth/auth');
const { getProfile, updateProfile } = require('./controllers/profile/profile');
const { uploadProduct, getAllProducts, uploadPromo, getPromos } = require('./controllers/product/product');
const { createPost, getPosts } = require('./controllers/forum/forum');
const { askAI } = require('./controllers/ai/ai');

const upload = require('./middleware/upload');   
const verifyToken = require('./middleware/auth'); 

const app = express();
const PORT = process.env.PORT || 8080;

initDB();

// ✅ FIX ERROR 500 MULTER: Buat folder uploads otomatis jika di Railway belum ada
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

// ✅ PAKAI verifyAdmin AGAR TIDAK DITOLAK
app.post('/api/products', verifyAdmin, upload.single('media'), uploadProduct);
app.post('/api/promos', verifyAdmin, upload.single('media'), uploadPromo); 
app.post('/api/forum', verifyToken, createPost);

app.listen(PORT, () => { console.log(`🚀 Server belidikita berjalan di port ${PORT}`); });
