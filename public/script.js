document.addEventListener("DOMContentLoaded", () => {
    const splashScreen = document.getElementById('splashScreen');
    const navbar = document.getElementById('navbar');
    const dashboardContainer = document.getElementById('dashboardContainer');
    
    const navUploadBtn = document.getElementById('navUploadBtn');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const authContainer = document.getElementById('authContainer');
    const authBackdrop = document.getElementById('authBackdrop');

    // 1. FUNGSI INISIALISASI (LANGSUNG TAMPIL DASHBOARD)
    function initApp() {
        navbar.classList.remove('hidden');
        dashboardContainer.classList.remove('hidden');
        
        // Cek tiket login untuk mengatur tombol navbar
        const token = localStorage.getItem('token');
        if (token) {
            navLoginBtn.classList.add('hidden'); // Sembunyikan tombol login
            logoutBtn.classList.remove('hidden'); // Munculkan tombol logout
            navUploadBtn.classList.remove('hidden'); // Munculkan tombol upload
        } else {
            navLoginBtn.classList.remove('hidden'); 
            logoutBtn.classList.add('hidden');
            navUploadBtn.classList.add('hidden');
        }
        
        // Memuat barang secara otomatis tanpa harus login
        loadProducts(); 
    }

    // 2. SPLASH SCREEN LOGIC
    setTimeout(() => {
        splashScreen.style.transition = "opacity 1s ease";
        splashScreen.style.opacity = "0";

        setTimeout(() => {
            splashScreen.classList.add('hide');
            splashScreen.style.display = "none";
            initApp(); // Panggil fungsi inisialisasi untuk menampilkan dashboard
        }, 1000); 
    }, 4500); 

    // 3. FUNGSI POPUP LOGIN (MODAL AUTH)
    navLoginBtn.addEventListener('click', () => {
        authContainer.classList.remove('hidden');
        authBackdrop.classList.remove('hidden');
    });

    document.getElementById('closeAuthBtn').addEventListener('click', () => {
        authContainer.classList.add('hidden');
        authBackdrop.classList.add('hidden');
    });

    // 4. SLIDING PANEL LOGIC
    const signUpBtn = document.getElementById('signUp');
    const signInBtn = document.getElementById('signIn');

    signUpBtn.addEventListener('click', () => authContainer.classList.add("active"));
    signInBtn.addEventListener('click', () => authContainer.classList.remove("active"));

    // 5. LOGOUT LOGIC
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        location.reload(); 
    });

    // 6. REGISTER & OTP LOGIC
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
            otpModal.style.display = "block";
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
            authContainer.classList.remove("active"); 
        }
    });

    // 7. LOGIN REGULER LOGIC
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
            // Tutup form dan segarkan dashboard
            authContainer.classList.add('hidden');
            authBackdrop.classList.add('hidden');
            document.getElementById('loginForm').reset();
            initApp(); 
        }
    });
    
    // 8. LUPA PASSWORD LOGIC
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

        if(data.success) {
            document.getElementById('resetEmail').value = email; 
            document.getElementById('resetPasswordModal').style.display = "block";
        }
    });

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

        if(data.success) {
            document.getElementById('resetPasswordModal').style.display = "none";
            document.getElementById('loginPassword').value = ''; 
            document.getElementById('resetOtpCode').value = ''; 
            document.getElementById('resetNewPassword').value = '';
        }
    });


    // 9. MENU UPLOAD & NAVIGASI
    const uploadSection = document.getElementById('uploadSection');
    navUploadBtn.addEventListener('click', () => {
        uploadSection.classList.toggle('hidden');
    });

    const navHome = document.getElementById('navHome');
    const navForum = document.getElementById('navForum');
    const aiSearchSection = document.getElementById('aiSearchSection');
    const forumSection = document.getElementById('forumSection');

    navHome.addEventListener('click', (e) => {
        e.preventDefault();
        aiSearchSection.classList.remove('hidden'); 
        forumSection.classList.add('hidden');       
        uploadSection.classList.add('hidden');      
    });

    navForum.addEventListener('click', (e) => {
        e.preventDefault();
        forumSection.classList.remove('hidden');    
        aiSearchSection.classList.add('hidden');    
        uploadSection.classList.add('hidden');      
        loadForumPosts(); // Panggil data forum saat menu forum diklik
    });


    // 10. AI SEARCH
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

    // 11. UPLOAD PRODUCT 
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
                loadProducts(); // Update daftar setelah upload
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Terjadi kesalahan saat mengunggah barang.");
        }
    });
});

// 12. GOOGLE LOGIN CALLBACK
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
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('authBackdrop').classList.add('hidden');
        location.reload(); // Refresh menyeluruh jika pakai google login
    }
};

// 13. FUNGSI MEMUAT DAFTAR BARANG
async function loadProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '<p style="color: #666; font-size: 14px;">Memuat barang...</p>';
    
    try {
        const res = await fetch('/api/products');
        const result = await res.json();
        
        if (result.success && result.data.length > 0) {
            productList.innerHTML = ''; 
            
            result.data.forEach(product => {
                const mediaTag = product.media_type === 'video' 
                    ? `<video src="${product.media_url}" class="product-media" controls></video>`
                    : `<img src="${product.media_url}" class="product-media" alt="${product.title}">`;
                
                const priceRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price);

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

// 14. FUNGSI MEMUAT FORUM DISKUSI
async function loadForumPosts() {
    const forumList = document.getElementById('forumList');
    forumList.innerHTML = '<p style="color: #666; font-size: 14px;">Memuat diskusi...</p>';
    
    try {
        const res = await fetch('/api/forum');
        const result = await res.json();
        
        if (result.success && result.data.length > 0) {
            forumList.innerHTML = ''; 
            
            result.data.forEach(post => {
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

// 15. LOGIC POSTING FORUM BARU
document.getElementById('forumForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('forumTitle').value;
    const content = document.getElementById('forumContent').value;
    const token = localStorage.getItem('token'); 

    // ✅ FITUR PINTAR: Jika belum login, form login otomatis melayang muncul!
    if (!token) {
        alert("Kamu harus login dulu untuk membuat diskusi!");
        document.getElementById('authContainer').classList.remove('hidden');
        document.getElementById('authBackdrop').classList.remove('hidden');
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
            loadForumPosts(); 
        }
    } catch (error) {
        console.error("Forum post error:", error);
        alert("Terjadi kesalahan saat memposting diskusi.");
    }
});
