require('dotenv').config();

const sendEmail = async (to, subject, text) => {
    const brevoApiKey = process.env.BREVO_API_KEY; // Pastikan key ini ada di Variables Railway

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'api-key': brevoApiKey
            },
            body: JSON.stringify({
                sender: { email: "azhardax94@gmail.com", name: "belidikita" },
                to: [{ email: to }],
                subject: subject,
                textContent: text
            })
        });

        if (response.ok) {
            console.log("✅ Email API terkirim ke:", to);
        } else {
            const errData = await response.json();
            console.error("❌ Gagal kirim email via Brevo API:", errData);
        }
    } catch (error) {
        console.error("❌ Error jaringan saat kirim email:", error);
    }
};

module.exports = sendEmail;
