const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- IMPORT CONTROLLERS ---
const { register, verifyOTP, login, googleLogin, forgotPassword } = require('./controllers/auth');
const { getProfile, updateProfile } = require('./controllers/profile');
const { uploadProduct, getAllProducts } = require('./controllers/product');
const { createPost, getPosts } = require('./controllers/forum');
const { askAI } = require('./controllers/ai');

// --- IMPORT MIDDLEWARE ---
const upload = require('./middleware/upload');   // Penjaga File Upload
const verifyToken = require('./middleware/auth'); // Penjaga Pintu Masuk (Satpam)

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis (Frontend & Folder Uploads)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ==========================================
// 🔓 API PUBLIK (Siapa saja boleh akses)
// ==========================================
app.post('/api/register', register);
app.post('/api/verify-otp', verifyOTP);
app.post('/api/login', login);
app.post('/api/google-login', googleLogin);
app.post('/api/forgot-password', forgotPassword);

app.post('/api/ai/search', askAI);
app.get('/api/products', getAllProducts); // Melihat daftar barang tidak perlu login
app.get('/api/forum', getPosts);          // Melihat forum tidak perlu login

// ==========================================
// 🔒 API PRIVAT (Wajib Login / Bawa Token)
// ==========================================
// Rute Profil
app.get('/api/profile', verifyToken, getProfile);
app.put('/api/profile', verifyToken, updateProfile);

// Rute Jualan (Produk) -> Melewati Satpam Tiket (verifyToken) & Pemeriksa File (upload.single)
app.post('/api/products', verifyToken, upload.single('media'), uploadProduct);

// Rute Forum
app.post('/api/forum', verifyToken, createPost);

// ==========================================
// Jalankan Server
app.listen(PORT, () => {
    console.log(`🚀 Server belidikita berjalan di port ${PORT}`);
});
