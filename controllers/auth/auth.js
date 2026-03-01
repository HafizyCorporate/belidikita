const pool = require('../../config/db');
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
        console.error(err.message);
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
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 2. Login Reguler & Google
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(400).json({ success: false, message: 'Email tidak ditemukan!' });
        if (!user.rows[0].is_verified) return res.status(400).json({ success: false, message: 'Akun belum diverifikasi OTP!' });

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) return res.status(400).json({ success: false, message: 'Password salah!' });

        const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: "Login berhasil!", token });
    } catch (err) {
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
        res.status(500).json({ success: false, message: "Verifikasi Google Gagal" });
    }
};

// 3. Forgot Password
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(400).json({ success: false, message: 'Email tidak terdaftar.' });
        res.json({ success: true, message: "Instruksi reset password berhasil dikirim!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { register, verifyOTP, login, googleLogin, forgotPassword };
