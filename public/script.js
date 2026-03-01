document.addEventListener("DOMContentLoaded", () => {
    // 1. SPLASH SCREEN LOGIC
    const splashScreen = document.getElementById('splashScreen');
    setTimeout(() => {
        splashScreen.classList.add('hide');
        checkLoginStatus(); // Cek apakah user sudah login sebelumnya
    }, 3500);

    // 2. SLIDING PANEL LOGIC
    const signUpBtn = document.getElementById('signUp');
    const signInBtn = document.getElementById('signIn');
    const authContainer = document.getElementById('authContainer');

    signUpBtn.addEventListener('click', () => authContainer.classList.add("active"));
    signInBtn.addEventListener('click', () => authContainer.classList.remove("active"));

    // 3. UI TOGGLE LOGIC (Menampilkan Dashboard)
    const navbar = document.getElementById('navbar');
    const dashboardContainer = document.getElementById('dashboardContainer');

    function checkLoginStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            authContainer.classList.add('hidden');
            navbar.classList.remove('hidden');
            dashboardContainer.classList.remove('hidden');
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        location.reload(); // Refresh halaman agar kembali ke login
    });

    // 4. REGISTER & OTP LOGIC
    const otpModal = document.getElementById('otpModal');
    const otpEmailInput = document.getElementById('otpEmail');

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        alert(data.message);

        if(data.success) {
            otpEmailInput.value = email;
            otpModal.style.display = "block"; // Tampilkan modal OTP
        }
    });

    document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
        const email = otpEmailInput.value;
        const otp = document.getElementById('otpCode').value;

        const res = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const data = await res.json();
        alert(data.message);

        if(data.success) {
            otpModal.style.display = "none";
            authContainer.classList.remove("active"); // Geser kembali ke panel login
        }
    });

    // 5. LOGIN REGULER
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        alert(data.message);

        if(data.success) {
            localStorage.setItem('token', data.token);
            checkLoginStatus(); // Masuk ke dashboard
        }
    });

    // 6. TOGGLE MENU UPLOAD
    const uploadSection = document.getElementById('uploadSection');
    document.getElementById('navUploadBtn').addEventListener('click', () => {
        uploadSection.classList.toggle('hidden');
    });

    // 7. AI SEARCH LOGIC
    document.getElementById('aiSearchForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const promptText = document.getElementById('aiPrompt').value;
        const aiResponseBox = document.getElementById('aiResponseBox');
        const aiBtn = document.getElementById('aiBtn');
        
        aiResponseBox.innerHTML = "<em>AI sedang berpikir... ⏳</em>";
        aiBtn.disabled = true;

        try {
            const res = await fetch('/api/ai/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText })
            });
            const data = await res.json();
            aiResponseBox.innerHTML = data.success ? data.answer.replace(/\n/g, '<br>') : `<span style="color:red;">Error: ${data.message}</span>`;
        } catch (error) {
            aiResponseBox.innerHTML = "Gagal terhubung ke AI.";
        } finally {
            aiBtn.disabled = false;
        }
    });

    // 8. UPLOAD PRODUCT LOGIC (Kirim File ke Backend)
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Buat objek FormData karena kita mengirim file (gambar/video)
        const formData = new FormData();
        formData.append('title', document.getElementById('prodTitle').value);
        formData.append('price', document.getElementById('prodPrice').value);
        formData.append('description', document.getElementById('prodDesc').value);
        
        const fileInput = document.getElementById('prodMedia');
        if (fileInput.files.length > 0) {
            formData.append('media', fileInput.files[0]);
        }

        const token = localStorage.getItem('token'); // Ambil token untuk dipasang di Header nanti

        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                // Ingat: Jangan set Content-Type secara manual saat menggunakan FormData
                // Browser akan otomatis men-setnya menjadi multipart/form-data
                headers: {
                    'Authorization': `Bearer ${token}` 
                },
                body: formData
            });
            const data = await res.json();
            alert(data.message);
            if(data.success) {
                document.getElementById('uploadForm').reset();
                uploadSection.classList.add('hidden');
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Terjadi kesalahan saat mengunggah barang.");
        }
    });
});

// 9. GOOGLE LOGIN CALLBACK (Fungsi Global)
window.handleCredentialResponse = async function(response) {
    const res = await fetch('/api/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    alert(data.message);
    if(data.success) {
        localStorage.setItem('token', data.token);
        location.reload(); // Refresh untuk memuat dashboard
    }
};
