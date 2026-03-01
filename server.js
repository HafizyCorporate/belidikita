const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import Controllers & Middleware
const { register, verifyOTP } = require('./controllers/auth/register'); // Disesuaikan dengan folder barumu
const { login, googleLogin } = require('./controllers/auth/login');
const { forgotPassword } = require('./controllers/auth/forgot');
const { askAI } = require('./controllers/ai');
const upload = require('./middleware/upload'); 

// Nanti kamu bisa buat controller untuk produk
// const { uploadProduct } = require('./controllers/product'); 

const app = express();
const PORT = process.env.PORT || 8080;

// Konfigurasi Middleware Global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Penting untuk menerima form-data (file upload)

// Menyajikan file statis (HTML, CSS, JS, dan folder Uploads)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- ROUTING API AUTHENTICATION ---
app.post('/api/register', register);
app.post('/api/verify-otp', verifyOTP);
app.post('/api/login', login);
app.post('/api/google-login', googleLogin);
app.post('/api/forgot-password', forgotPassword);

// --- ROUTING API AI ---
app.post('/api/ai/search', askAI);

// --- ROUTING API JUALAN (PRODUCTS) ---
// Rute ini menggunakan middleware 'upload.single("media")' untuk menangkap file dari input ber-name="media"
app.post('/api/products', upload.single('media'), (req, res) => {
    // Ini hanya placeholder, nanti akan diarahkan ke controller product beneran
    if (!req.file) {
        return res.status(400).json({ success: false, message: "File media wajib diunggah!" });
    }
    
    console.log("File berhasil diupload:", req.file.filename);
    console.log("Data barang:", req.body);
    
    res.json({ 
        success: true, 
        message: "Produk berhasil diunggah!", 
        fileUrl: `/uploads/${req.file.filename}` 
    });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`🚀 Server belidikita berjalan di port ${PORT}`);
});
