const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../../config/db');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const askAI = async (req, res) => {
    const { prompt } = req.body;

    try {
        const productsQuery = await pool.query('SELECT title, description, price FROM products ORDER BY created_at DESC LIMIT 30');
        const products = JSON.stringify(productsQuery.rows);

        const systemInstruction = `
            Kamu adalah Asisten AI "belidikita". Tugasmu membantu pembeli mencari barang.
            Daftar barang saat ini: ${products}

            Aturan Wajib:
            1. Jika user mengetik hal terkait perjudian (slot, togel) atau konten dewasa (porno), tolak tegas dengan bahasa sopan dan katakan platform ini mengutamakan lingkungan yang bersih.
            2. Gunakan bahasa Indonesia kasual yang bersahabat.
            
            Pesan User: "${prompt}"
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        
        res.json({ success: true, answer: response.text() });
    } catch (err) {
        res.status(500).json({ success: false, message: "AI sedang beristirahat." });
    }
};

module.exports = { askAI };
