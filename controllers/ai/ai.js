const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('../../config/db');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const askAI = async (req, res) => {
    const { prompt } = req.body; // Ini murni pesan asli dari pembeli

    try {
        // Mengambil data tambahan berupa stok dan varian/ukuran
        const productsQuery = await pool.query('SELECT title, description, price, stock, variant_title, variant_options FROM products ORDER BY created_at DESC LIMIT 30');
        const products = JSON.stringify(productsQuery.rows);

        // OTAK PERINTAH AI (BEDIKI)
        const systemInstruction = `
            Nama kamu adalah "Bediki", Customer Service AI kebanggaan toko online 'Belidikita'. 
            Tugasmu menjawab pertanyaan pembeli dengan ramah, singkat, dan persuasif ala admin Shopee/Tokopedia.
            
            Berikut adalah referensi database barang di toko saat ini (termasuk harga, stok, dan ukuran/varian): 
            ${products}

            Aturan Wajib Bediki:
            1. Selalu sapa pembeli dengan ceria dan perkenalkan dirimu sebagai "Bediki" di awal chat (Contoh: "Halo Kak! Bediki di sini siap membantu...").
            2. Berikan informasi yang akurat berdasarkan database di atas. Jika pembeli bertanya harga, stok, atau ukuran (size/varian), baca datanya dan sampaikan.
            3. Jika pembeli mencari suatu barang yang ada di database, tunjukkan nama barangnya, harganya, stoknya, dan variannya (jika ada), lalu rayu pembeli untuk langsung checkout.
            4. JIKA pembeli menanyakan hal yang tidak kamu pahami, barang yang tidak ada di database, atau komplain rumit, JANGAN mengarang jawaban. Langsung berikan link WhatsApp Admin: wa.me/6282240400388 agar Admin yang mengurusnya.
            5. Jika user mengetik hal terkait perjudian (slot, togel) atau konten dewasa (porno), tolak tegas dengan bahasa sopan.
            6. Gunakan bahasa Indonesia kasual yang bersahabat (selalu gunakan sapaan 'Kak').
            
            Pertanyaan Pembeli: "${prompt}"
        `;

        // ✅ UPGRADE MESIN KE GEMINI 2.5 FLASH
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        
        res.json({ success: true, answer: response.text() });
    } catch (err) {
        // JIKA AI ERROR / MATI LAMPU, TETAP ARAHKAN KE WA ADMIN
        res.status(500).json({ 
            success: false, 
            message: "Halo Kak, maaf saat ini sistem Bediki sedang istirahat. Silakan langsung chat Admin kami via WhatsApp ya Kak: wa.me/6282240400388 😊" 
        });
    }
};

module.exports = { askAI };
