const { pool } = require('../../config/db'); // ✅ Import database sudah diperbaiki
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const sendEmail = require('../../utils/email');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. Register & OTP
const register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.query(
            'INSERT INTO users (name, email, password, otp, is_verified) VALUES ($1, $2, $3, $4, false)',
            [name, email, hashedPassword, otp]
        );

        await sendEmail(email, "Kode OTP belidikita", `Kode OTP Registrasi Anda adalah: ${otp}`);
        res.json({ success: true, message: "Cek email Anda untuk kode OTP!" });
    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1 AND otp = $2', [email, otp]);
        if (user.rows.length === 0) return res.status(400).json({ success: false, message: 'OTP salah atau email tidak ditemukan!' });

        await pool.query('UPDATE users SET is_verified = true, otp = null WHERE email = $1', [email]);
        res.json({ success: true, message: "Akun terverifikasi! Silakan login." });
    } catch (err) {
        console.error("Verify OTP Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 2. Login Reguler & Google (✅ Sudah Aman dari Crash)
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        // Cek apakah email ada
        if (user.rows.length === 0) return res.status(400).json({ success: false, message: 'Email tidak ditemukan!' });
        
        // Cek apakah akun sudah diverifikasi
        if (!user.rows[0].is_verified) return res.status(400).json({ success: false, message: 'Akun belum diverifikasi OTP!' });

        // --- CEGAH CRASH: Cek apakah user mendaftar via Google (tidak punya password) ---
        if (!user.rows[0].password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Akun ini terdaftar via Google. Silakan klik tombol "Sign in with Google".' 
            });
        }

        // Jika aman, baru lakukan komparasi password
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(400).json({ success: false, message: 'Password salah!' });

        const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: "Login berhasil!", token });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const googleLogin = async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
        const { name, email, sub: google_id } = ticket.getPayload();

        let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            user = await pool.query(
                'INSERT INTO users (name, email, google_id, is_verified) VALUES ($1, $2, $3, true) RETURNING *',
                [name, email, google_id]
            );
        }

        const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: "Login Google berhasil!", token });
    } catch (err) {
        console.error("Google Login Error:", err.message);
        res.status(500).json({ success: false, message: "Verifikasi Google Gagal" });
    }
};

// 3. Forgot Password
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(400).json({ success: false, message: 'Email tidak terdaftar.' });
        
        // Generate OTP baru untuk Lupa Password
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Simpan OTP ke database user tersebut
        await pool.query('UPDATE users SET otp = $1 WHERE email = $2', [otp, email]);
        
        // Kirim email sungguhan
        await sendEmail(email, "Reset Password belidikita", `Kode OTP untuk mereset password kamu adalah: ${otp}`);
        
        res.json({ success: true, message: "Cek email! Kode OTP untuk reset password sudah dikirim." });
    } catch (err) {
        console.error("Forgot Password Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 4. Reset Password (Baru)
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        // Cari user yang email dan OTP-nya cocok
        const user = await pool.query('SELECT * FROM users WHERE email = $1 AND otp = $2', [email, otp]);
        
        if (user.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'OTP salah atau email tidak valid!' });
        }

        // Enkripsi (Hash) password yang baru
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Timpa password lama dengan yang baru, lalu kosongkan OTP-nya agar tidak bisa dipakai 2x
        await pool.query('UPDATE users SET password = $1, otp = null WHERE email = $2', [hashedPassword, email]);

        res.json({ success: true, message: "Password berhasil diubah! Silakan login dengan password barumu." });
    } catch (err) {
        console.error("Reset Password Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { register, verifyOTP, login, googleLogin, forgotPassword, resetPassword };
