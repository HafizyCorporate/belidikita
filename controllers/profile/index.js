const pool = require('../../config/db');

const getProfile = async (req, res) => {
    try {
        // req.user.id akan didapat dari middleware auth nantinya
        const user = await pool.query('SELECT id, name, email, role, avatar_url, bio FROM users WHERE id = $1', [req.user.id]);
        res.json({ success: true, data: user.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const updateProfile = async (req, res) => {
    const { name, bio } = req.body;
    try {
        await pool.query('UPDATE users SET name = $1, bio = $2 WHERE id = $3', [name, bio, req.user.id]);
        res.json({ success: true, message: "Profil berhasil diperbarui!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { getProfile, updateProfile };
