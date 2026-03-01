const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    // 1. Tangkap header Authorization dari request frontend
    const authHeader = req.headers['authorization'];
    
    // 2. Format token biasanya "Bearer <token_panjang>", kita ambil tokennya saja
    const token = authHeader && authHeader.split(' ')[1];

    // 3. Jika tidak ada token (user belum login / tidak bawa tiket)
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: "Akses Ditolak! Kamu harus login terlebih dahulu." 
        });
    }

    // 4. Verifikasi keaslian token menggunakan Kunci Rahasia
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 5. Jika asli, simpan data user (seperti ID dan Role) ke dalam req.user
        req.user = decoded;
        
        // 6. Persilakan masuk ke proses selanjutnya (Controller)
        next();
    } catch (err) {
        console.error("Token Error:", err.message);
        return res.status(403).json({ 
            success: false, 
            message: "Sesi telah habis atau token tidak valid. Silakan login ulang." 
        });
    }
};

module.exports = verifyToken;
