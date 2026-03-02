document.addEventListener("DOMContentLoaded", () => {
    // === 1. LOGIKA SPLASH SCREEN (Membuka Gembok Layar) ===
    const splashScreen = document.getElementById('splashScreen');
    const topHeader = document.getElementById('topHeader');
    const mainContent = document.getElementById('mainContent');
    const bottomNav = document.getElementById('bottomNav');

    setTimeout(() => {
        splashScreen.style.transition = "opacity 1s ease";
        splashScreen.style.opacity = "0";

        setTimeout(() => {
            splashScreen.classList.add('hide');
            splashScreen.style.display = "none";
            document.body.classList.remove('no-scroll'); // Buka gembok scroll layar
            
            topHeader.classList.remove('hidden');
            mainContent.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            
            initDashboard(); // Muat data jendela
        }, 1000); 
    }, 4500); 

    // === 2. LOGIKA SLIDER PROMO (Geser Otomatis) ===
    const sliderWrapper = document.getElementById('promoSlider');
    let slideIndex = 0;
    setInterval(() => {
        slideIndex++;
        if (slideIndex > 2) slideIndex = 0; // Karena ada 3 slide (0,1,2)
        // Geser per 33.33% karena 3 slide dibungkus 300% width
        sliderWrapper.style.transform = `translateX(-${slideIndex * 33.33}%)`;
    }, 3000); // Geser setiap 3 detik


    // === 3. MENGISI 10 JENDELA DATA (SCROLL KESAMPING) ===
    function initDashboard() {
        populateHorizontalCards('topSellingList', '🔥 Laris');
        populateHorizontalCards('topCartList', '🛒 Disimpan');
        populateTopSellers('topSellerList');
        loadRandomProducts(); // Fungsi API lama kamu untuk Grid bawah
    }

    // Fungsi membuat 10 kartu barang (Foto, Nama & Harga satu baris)
    function populateHorizontalCards(containerId, label) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        for(let i=1; i<=10; i++) {
            const card = document.createElement('div');
            card.className = 'h-card';
            card.innerHTML = `
                <img src="https://via.placeholder.com/150/f1f1f1/888?text=Barang+${i}" class="h-card-img" alt="Barang">
                <div class="h-card-info">
                    <div class="h-card-row">
                        <span class="h-card-title">Barang ${label} ${i}</span>
                        <span class="h-card-price">Rp${i}0K</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        }
    }

    // Fungsi membuat 10 kartu profil penjual
    function populateTopSellers(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        for(let i=1; i<=10; i++) {
            const card = document.createElement('div');
            card.className = 'seller-card';
            card.innerHTML = `
                <div class="seller-avatar"><i class="fas fa-user"></i></div>
                <div class="seller-name">Toko ${i}</div>
            `;
            container.appendChild(card);
        }
    }

    // === 4. LOGIKA KLIK BOTTOM NAVBAR (Menu Akun memanggil Popup) ===
    const menuAccount = document.getElementById('menuAccount');
    const authContainer = document.getElementById('authContainer');
    const authBackdrop = document.getElementById('authBackdrop');

    menuAccount.addEventListener('click', (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            // Kalau belum login, munculkan Popup Form
            authContainer.classList.remove('hidden');
            authBackdrop.classList.remove('hidden');
        } else {
            // Kalau sudah login, arahkan ke profil / logout
            if(confirm("Anda sudah masuk. Apakah ingin Logout?")) {
                localStorage.removeItem('token');
                location.reload();
            }
        }
    });

    document.getElementById('closeAuthBtn').addEventListener('click', () => {
        authContainer.classList.add('hidden');
        authBackdrop.classList.add('hidden');
    });

    // === 5. SLIDING PANEL LOGIN/REGISTER LOGIC ===
    const signUpBtn = document.getElementById('signUp');
    const signInBtn = document.getElementById('signIn');
    signUpBtn.addEventListener('click', () => authContainer.classList.add("active"));
    signInBtn.addEventListener('click', () => authContainer.classList.remove("active"));

    // === 6. AUTHENTICATION API LOGIC (Register, OTP, Login) ===
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
            authContainer.classList.add('hidden');
            authBackdrop.classList.add('hidden');
            document.getElementById('loginForm').reset();
            alert("Berhasil Login! Selamat berbelanja.");
        }
    });

    // === 7. AMBIL BARANG ASLI DARI DATABASE UNTUK GRID BAWAH ===
    async function loadRandomProducts() {
        const productList = document.getElementById('randomProductList');
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
                        ${product.media_url ? mediaTag : '<div class="product-media" style="display:flex; align-items:center; justify-content:center; color:#aaa;">No Media</div>'}
                        <div class="product-info">
                            <div class="product-title">${product.title}</div>
                            <div class="product-price">${priceRp}</div>
                            <div class="product-seller"><i class="fas fa-store"></i> ${product.seller_name}</div>
                        </div>
                    `;
                    productList.appendChild(card);
                });
            } else {
                productList.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Belum ada barang, jadilah yang pertama menjual!</p>';
            }
        } catch (error) {
            console.error("Error loading products:", error);
            productList.innerHTML = '<p style="color: red; text-align:center;">Gagal memuat barang.</p>';
        }
    }
});
