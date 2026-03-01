const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- INJEKSI AUTO-DB ---
// Pastikan file config/db.js kamu sudah mengekspor { pool, initDB }
const { pool, initDB } = require('./config/db'); 

// --- 1. UPDATE: IMPORT CONTROLLERS DENGAN NAMA FILE BARU ---
const { register, verifyOTP, login, googleLogin, forgotPassword } = require('./controllers/auth/auth');
const { getProfile, updateProfile } = require('./controllers/profile/profile');
const { uploadProduct, getAllProducts } = require('./controllers/product/product');
const { createPost, getPosts } = require('./controllers/forum/forum');
const { askAI } = require('./controllers/ai/ai');

// --- IMPORT MIDDLEWARE ---
const upload = require('./middleware/upload');   
const verifyToken = require('./middleware/auth'); 

const app = express();
const PORT = process.env.PORT || 8080;

// Jalankan auto-migration agar tabel "users" dkk langsung tercipta
initDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis (CSS, JS, & Uploads)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- 2. UPDATE: ROUTING HALAMAN UTAMA KE dashboardutama.html ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboardutama.html'));
});

// ==========================================
// ðŸ”“ API PUBLIK (Siapa saja boleh akses)
// ==========================================
app.post('/api/register', register);
app.post('/api/verify-otp', verifyOTP);
app.post('/api/login', login);
app.post('/api/google-login', googleLogin);
app.post('/api/forgot-password', forgotPassword);

app.post('/api/ai/search', askAI);
app.get('/api/products', getAllProducts); 
app.get('/api/forum', getPosts);          

// ==========================================
// ðŸ”’ API PRIVAT (Wajib Login / Bawa Token JWT)
// ==========================================
app.get('/api/profile', verifyToken, getProfile);
app.put('/api/profile', verifyToken, updateProfile);

app.post('/api/products', verifyToken, upload.single('media'), uploadProduct);

app.post('/api/forum', verifyToken, createPost);

// ==========================================
// Jalankan Server
app.listen(PORT, () => {
    console.log(`ðŸš€ Server belidikita berjalan di port ${PORT}`);
});
