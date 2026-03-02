const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- INJEKSI AUTO-DB ---
const { pool, initDB } = require('./config/db'); 

// --- 1. IMPORT CONTROLLERS ---
// 'login' dihapus dari sini karena kita buat manual di bawah khusus Admin
const { register, verifyOTP, googleLogin, forgotPassword, resetPassword } = require('./controllers/auth/auth');
const { getProfile, updateProfile } = require('./controllers/profile/profile');
// ✅ TAMBAHAN: Import fungsi promo dari product.js
const { uploadProduct, getAllProducts, uploadPromo, getPromos } = require('./controllers/product/product');
const { createPost, getPosts } = require('./controllers/forum/forum');
const { askAI } = require('./controllers/ai/ai');

const upload = require('./middleware/upload');   
const verifyToken = require('./middleware/auth'); 

const app = express();
const PORT = process.env.PORT || 8080;

initDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboardutama.html'));
});

// ==========================================
// 🔓 API PUBLIK
// ==========================================
app.post('/api/register', register);
app.post('/api/verify-otp', verifyOTP);
app.post('/api/google-login', googleLogin);
app.post('/api/forgot-password', forgotPassword);
app.post('/api/reset-password', resetPassword);

// LOGIN KHUSUS 2 ADMIN MENGGUNAKAN USERNAME
app.post('/api/login', (req, res) => {
    const { username, password } = req.body; 

    // Daftar Admin Resmi
    const admins = [
        { username: "Versacy", password: "08556645" },
        { username: "Farid", password: "11223344" }
    ];

    // Cek kecocokan username dan password
    const validAdmin = admins.find(a => a.username === username && a.password === password);

    if (validAdmin) {
        res.json({
            success: true,
            message: `Selamat datang, Admin ${validAdmin.username}!`,
            token: `token-admin-${validAdmin.username}` // Beri token khusus admin
        });
    } else {
        res.status(401).json({
            success: false,
            message: "Username atau password salah!"
        });
    }
});

app.post('/api/ai/search', askAI);
app.get('/api/products', getAllProducts); 
app.get('/api/promos', getPromos); // ✅ TAMBAHAN: Jalur untuk halaman depan mengambil banner promo
app.get('/api/forum', getPosts);          

// ==========================================
// 🔒 API PRIVAT
// ==========================================
app.get('/api/profile', verifyToken, getProfile);
app.put('/api/profile', verifyToken, updateProfile);
app.post('/api/products', verifyToken, upload.single('media'), uploadProduct);
app.post('/api/promos', verifyToken, upload.single('media'), uploadPromo); // ✅ TAMBAHAN: Jalur Admin untuk upload promo
app.post('/api/forum', verifyToken, createPost);

app.listen(PORT, () => {
    console.log(`🚀 Server belidikita berjalan di port ${PORT}`);
});
