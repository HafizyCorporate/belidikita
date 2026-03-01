const pool = require('../../config/db');

const createPost = async (req, res) => {
    const { title, content } = req.body;
    try {
        const newPost = await pool.query(
            'INSERT INTO forum_posts (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, title, content]
        );
        res.json({ success: true, message: "Diskusi berhasil dibuat!", post: newPost.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const getPosts = async (req, res) => {
    try {
        const posts = await pool.query(`
            SELECT f.*, u.name as author_name 
            FROM forum_posts f 
            JOIN users u ON f.user_id = u.id 
            ORDER BY f.created_at DESC
        `);
        res.json({ success: true, data: posts.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { createPost, getPosts };
