document.addEventListener("DOMContentLoaded", () => {
    // 1. SPLASH SCREEN LOGIC (Update: Penutup Halus & Mewah)
    const splashScreen = document.getElementById('splashScreen');
    setTimeout(() => {
        // Efek memudar (fade out) selama 1 detik
        splashScreen.style.transition = "opacity 1s ease";
        splashScreen.style.opacity = "0";

        setTimeout(() => {
            splashScreen.classList.add('hide');
            splashScreen.style.display = "none";
            checkLoginStatus(); // Cek apakah user sudah login sebelumnya
        }, 1000); // Tunggu sampai proses memudar selesai
    }, 4500); // Memberi waktu animasi truk & teks megah tampil sempurna

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
    
            // 5B. LUPA PASSWORD LOGIC
    document.getElementById('forgotPasswordBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        
        if (!email) {
            alert("Tulis email kamu dulu di kolom atas, lalu klik Lupa Password.");
            return;
        }

        const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        alert(data.message);

        // Jika email berhasil dikirim, munculkan popup reset password
        if(data.success) {
            document.getElementById('resetEmail').value = email; // Simpan email secara diam-diam
            document.getElementById('resetPasswordModal').style.display = "block";
        }
    });

    // 5C. SIMPAN PASSWORD BARU LOGIC
    document.getElementById('submitResetBtn').addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        const otp = document.getElementById('resetOtpCode').value;
        const newPassword = document.getElementById('resetNewPassword').value;

        if(!otp || !newPassword) {
            alert("Harap isi kode OTP dan Password Baru!");
            return;
        }

        const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });
        const data = await res.json();
        alert(data.message);

        // Jika berhasil ganti password, tutup popup-nya
        if(data.success) {
            document.getElementById('resetPasswordModal').style.display = "none";
            document.getElementById('loginPassword').value = ''; // Kosongkan form password lama
            document.getElementById('resetOtpCode').value = ''; 
            document.getElementById('resetNewPassword').value = '';
        }
    });


    // 6. TOGGLE MENU UPLOAD
    const uploadSection = document.getElementById('uploadSection');
    document.getElementById('navUploadBtn').addEventListener('click', () => {
        uploadSection.classList.toggle('hidden');
    });

        // 6B. NAVIGASI BERANDA & FORUM LOGIC
    const navHome = document.getElementById('navHome');
    const navForum = document.getElementById('navForum');
    const aiSearchSection = document.getElementById('aiSearchSection');
    const forumSection = document.getElementById('forumSection');

    navHome.addEventListener('click', (e) => {
        e.preventDefault();
        aiSearchSection.classList.remove('hidden'); // Munculkan Beranda (AI)
        forumSection.classList.add('hidden');       // Tutup Forum
        uploadSection.classList.add('hidden');      // Tutup Upload
    });

    navForum.addEventListener('click', (e) => {
        e.preventDefault();
        forumSection.classList.remove('hidden');    // Munculkan Forum
        aiSearchSection.classList.add('hidden');    // Tutup Beranda (AI)
        uploadSection.classList.add('hidden');      // Tutup Upload
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
        
        const formData = new FormData();
        formData.append('title', document.getElementById('prodTitle').value);
        formData.append('price', document.getElementById('prodPrice').value);
        formData.append('description', document.getElementById('prodDesc').value);
        
        const fileInput = document.getElementById('prodMedia');
        if (fileInput.files.length > 0) {
            formData.append('media', fileInput.files[0]);
        }

        const token = localStorage.getItem('token'); 

        try {
            const res = await fetch('/api/products', {
                method: 'POST',
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
        location.reload(); 
    }
};

// 10. FUNGSI MEMUAT DAFTAR BARANG
async function loadProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '<p style="color: #666; font-size: 14px;">Memuat barang...</p>';
    
    try {
        const res = await fetch('/api/products');
        const result = await res.json();
        
        if (result.success && result.data.length > 0) {
            productList.innerHTML = ''; // Kosongkan tulisan "Memuat..."
            
            result.data.forEach(product => {
                // Cek apakah uploadnya video atau gambar
                const mediaTag = product.media_type === 'video' 
                    ? `<video src="${product.media_url}" class="product-media" controls></video>`
                    : `<img src="${product.media_url}" class="product-media" alt="${product.title}">`;
                
                // Format angka jadi Rupiah (Rp)
                const priceRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price);

                // Buat kartu produk HTML
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    ${product.media_url ? mediaTag : '<div class="product-media" style="display:flex; align-items:center; justify-content:center; font-size:10px; color:#aaa;">No Media</div>'}
                    <div class="product-info">
                        <div class="product-title">${product.title}</div>
                        <div class="product-price">${priceRp}</div>
                        <div class="product-desc">${product.description || 'Tidak ada deskripsi'}</div>
                        <div class="product-seller">👤 ${product.seller_name}</div>
                    </div>
                `;
                productList.appendChild(card);
            });
        } else {
            productList.innerHTML = '<p style="color: #666; font-size: 14px;">Belum ada barang yang dijual. Jadilah yang pertama!</p>';
        }
    } catch (error) {
        console.error("Error loading products:", error);
        productList.innerHTML = '<p style="color: red; font-size: 14px;">Gagal memuat barang dari server.</p>';
    }
}

    // 11. FUNGSI MEMUAT FORUM DISKUSI
    async function loadForumPosts() {
        const forumList = document.getElementById('forumList');
        forumList.innerHTML = '<p style="color: #666; font-size: 14px;">Memuat diskusi...</p>';
        
        try {
            const res = await fetch('/api/forum');
            const result = await res.json();
            
            if (result.success && result.data.length > 0) {
                forumList.innerHTML = ''; 
                
                result.data.forEach(post => {
                    // Bikin tanggal jadi rapi
                    const date = new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    
                    const card = document.createElement('div');
                    card.className = 'forum-card';
                    card.innerHTML = `
                        <div class="forum-title">${post.title}</div>
                        <div class="forum-author">👤 ${post.author_name} • 🕒 ${date}</div>
                        <div class="forum-content">${post.content.replace(/\n/g, '<br>')}</div>
                    `;
                    forumList.appendChild(card);
                });
            } else {
                forumList.innerHTML = '<p style="color: #666; font-size: 14px;">Belum ada diskusi. Jadilah yang pertama memulai topik!</p>';
            }
        } catch (error) {
            console.error("Error loading forum:", error);
            forumList.innerHTML = '<p style="color: red; font-size: 14px;">Gagal memuat forum dari server.</p>';
        }
    }

    // 12. LOGIC POSTING FORUM BARU
    document.getElementById('forumForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('forumTitle').value;
        const content = document.getElementById('forumContent').value;
        const token = localStorage.getItem('token'); 

        // Satpam pengecek login
        if (!token) {
            alert("Kamu harus login dulu untuk membuat diskusi!");
            return;
        }

        try {
            const res = await fetch('/api/forum', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ title, content })
            });
            const data = await res.json();
            alert(data.message);
            
            if(data.success) {
                document.getElementById('forumForm').reset();
                loadForumPosts(); // Langsung refresh daftar forum tanpa perlu reload web
            }
        } catch (error) {
            console.error("Forum post error:", error);
            alert("Terjadi kesalahan saat memposting diskusi.");
        }
    });

