const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_belidikita_super_aman';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ success: false, message: 'Akses ditolak! Silakan login.' });

    // Ambil token (Menangani format "Bearer token..." atau langsung "token...")
    const token = authHeader.split(' ')[1] || authHeader;

    // ✅ JALUR KHUSUS ADMIN (Bypass)
    if (token && token.startsWith('token-admin-')) {
        req.user = { id: 1, role: 'admin' };
        return next();
    }

    // ✅ JALUR RESMI PEMBELI (Cek JWT Asli)
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Menyimpan data ID pembeli
        next();
    } catch (err) {
        res.status(403).json({ success: false, message: 'Sesi telah habis, silakan login ulang.' });
    }
};

module.exports = verifyToken;
