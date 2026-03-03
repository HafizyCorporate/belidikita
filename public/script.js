document.addEventListener("DOMContentLoaded", () => {
    const toastDiv = document.createElement('div');
    toastDiv.id = 'customToast';
    document.body.appendChild(toastDiv);

    function showToast(msg, type = 'info') {
        const toast = document.getElementById("customToast");
        toast.innerText = msg;
        toast.className = type + " show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    }

    const splashScreen = document.getElementById('splashScreen');
    const topHeader = document.getElementById('topHeader');
    const mainContent = document.getElementById('mainContent');
    const bottomNav = document.getElementById('bottomNav');

    // ✅ SENSOR JALUR VIP DARI ADMIN PANEL
    const skipSplash = sessionStorage.getItem('skipSplash');

    if(splashScreen) {
        if(skipSplash === 'true') {
            // JIKA BAWA TIKET VIP: Langsung buka toko tanpa animasi
            splashScreen.style.display = "none";
            document.body.classList.remove('no-scroll'); 
            topHeader.classList.remove('hidden');
            mainContent.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            sessionStorage.removeItem('skipSplash'); // Buang tiket setelah dipakai
            initDashboard();
        } else {
            // JIKA PENGUNJUNG BARU BIASA: Putar animasi 4.5 detik
            setTimeout(() => {
                splashScreen.style.transition = "opacity 1s ease";
                splashScreen.style.opacity = "0";
                setTimeout(() => {
                    splashScreen.classList.add('hide');
                    splashScreen.style.display = "none";
                    document.body.classList.remove('no-scroll'); 
                    topHeader.classList.remove('hidden');
                    mainContent.classList.remove('hidden');
                    bottomNav.classList.remove('hidden');
                    initDashboard(); 
                }, 1000); 
            }, 4500); 
        }
    } else {
        initDashboard();
    }

    // FUNGSI UPDATE BADGE KERANJANG
    function updateCartBadge() {
        let cart = JSON.parse(localStorage.getItem('belidikita_cart')) || [];
        let total = cart.reduce((sum, item) => sum + item.qty, 0);
        let badge = document.querySelector('.cart-badge');
        if(badge) badge.innerText = total;
    }
    updateCartBadge(); 

    // ✅ FUNGSI BARU: SENSOR PEMBELI LOGIN (Ubah Teks Menu Akun jadi Nama Pembeli)
    async function cekStatusPembeli() {
        const token = localStorage.getItem('token');
        // Pastikan ada token dan BUKAN token admin
        if (token && !token.startsWith('token-admin-')) {
            try {
                const res = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
                const result = await res.json();
                if (result.success) {
                    const menuAccountSpan = document.querySelector('#menuAccount span');
                    if(menuAccountSpan) {
                        // Ambil kata pertama dari nama (Contoh "Budi Santoso" jadi "Budi")
                        menuAccountSpan.innerText = result.data.name.split(' ')[0];
                    }
                } else {
                    localStorage.removeItem('token'); // Bersihkan jika token kadaluarsa
                }
            } catch (e) { console.error("Gagal cek status pembeli"); }
        }
    }

    async function loadPromoSlider() {
        const sliderWrapper = document.getElementById('promoSlider');
        if(!sliderWrapper) return;
        try {
            const res = await fetch('/api/promos');
            const result = await res.json();
            if (result.success && result.data.length > 0) {
                sliderWrapper.innerHTML = ''; 
                const totalPromos = result.data.length;
                sliderWrapper.style.width = `${totalPromos * 100}%`;
                result.data.forEach(promo => {
                    const slideWidth = 100 / totalPromos; 
                    sliderWrapper.innerHTML += `<div class="slide" style="width: ${slideWidth}%; background: url('${promo.media_url}') center/cover no-repeat; min-height: 140px; border-radius: 15px; margin-right: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);"></div>`;
                });
                if (totalPromos > 1) {
                    let slideIndex = 0;
                    setInterval(() => {
                        slideIndex++;
                        if (slideIndex >= totalPromos) slideIndex = 0; 
                        sliderWrapper.style.transform = `translateX(-${slideIndex * (100 / totalPromos)}%)`;
                    }, 3500); 
                }
            }
        } catch (error) { console.error("Gagal load banner:", error); }
    }

    function initDashboard() {
        loadPromoSlider();   
        loadRandomProducts(); 
        cekStatusPembeli(); // ✅ Panggil sensor saat web selesai dimuat
    }

    const menuHome = document.getElementById('menuHome');
    const menuProduct = document.getElementById('menuProduct');
    const menuFeed = document.getElementById('menuFeed');
    const menuTransaction = document.getElementById('menuTransaction');
    const menuAccount = document.getElementById('menuAccount'); 
    
    function setActiveNav(clickedMenu) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        if(clickedMenu) clickedMenu.classList.add('active');
    }

    if(menuHome) menuHome.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuHome); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    if(menuProduct) menuProduct.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuProduct); showToast("Membuka Katalog Produk...", "info"); });
    if(menuFeed) menuFeed.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuFeed); showToast("Fitur Video Feed segera hadir!", "info"); });
    if(menuTransaction) menuTransaction.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuTransaction); window.location.href = 'registrasi/profilpembeli.html'; }); // ✅ Arahkan ke profil agar bisa lihat pesanan

    // ✅ PERBAIKAN: ANTI NYANGKUT UNTUK TOMBOL AKUN
    if(menuAccount) {
        menuAccount.addEventListener('click', (e) => { 
            e.preventDefault(); setActiveNav(menuAccount); 
            const token = localStorage.getItem('token');
            // Jika token KOSONG atau token itu MILIK ADMIN, arahkan ke Login Pembeli
            if (!token || token.startsWith('token-admin-')) {
                window.location.href = 'registrasi/loginpembeli.html';
            } else {
                window.location.href = 'registrasi/profilpembeli.html';
            }
        });
    }

    // ✅ PERBAIKAN: TOMBOL ADMIN ANTI NYANGKUT
    const adminLoginIcon = document.getElementById('adminLoginIcon');
    if(adminLoginIcon) {
        adminLoginIcon.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (token && token.startsWith('token-admin-')) {
                if(confirm("Admin sudah masuk. Apakah ingin Logout?")) {
                    localStorage.removeItem('token');
                    showToast("Berhasil Logout!", "success");
                    setTimeout(() => location.reload(), 1000);
                }
            } else {
                window.location.href = 'login.html'; 
            }
        });
    }

    async function loadRandomProducts() {
        const productList = document.getElementById('randomProductList');
        const larisList = document.getElementById('topSellingList');
        const cartList = document.getElementById('topCartList');
        if(!productList) return;

        try {
            const res = await fetch('/api/products');
            const result = await res.json();
            if (result.success && result.data.length > 0) {
                productList.innerHTML = ''; 
                if(larisList) larisList.innerHTML = '';
                if(cartList) cartList.innerHTML = '';

                result.data.forEach(product => {
                    const priceRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price);
                    const deskripsiBarang = product.description || "Deskripsi belum tersedia.";
                    const isVideo = product.media_type === 'video';
                    const fotoBarang = isVideo ? 'https://via.placeholder.com/400x300/f4f4f4/888?text=Video+Produk' : (product.media_url || 'https://via.placeholder.com/400x300/f4f4f4/888?text=No+Image');
                    const mediaTag = isVideo ? `<video src="${product.media_url}" class="product-media" style="object-fit:cover;"></video>` : `<img src="${product.media_url}" class="product-media" alt="${product.title}">`;

                    if (product.category === 'laris' || product.category === 'keranjang') {
                        const hCard = document.createElement('div');
                        hCard.className = 'h-card';
                        hCard.innerHTML = `<img src="${fotoBarang}" class="h-card-img" alt="Barang"><div class="h-card-info"><div class="h-card-row"><span class="h-card-title">${product.title}</span><span class="h-card-price" style="font-size:11px;">${priceRp}</span></div></div>`;
                        hCard.addEventListener('click', () => bukaDetailProduk(fotoBarang, product.title, priceRp, deskripsiBarang, product.price));
                        if (product.category === 'laris' && larisList) larisList.appendChild(hCard);
                        if (product.category === 'keranjang' && cartList) cartList.appendChild(hCard);
                    }

                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.innerHTML = `${product.media_url ? mediaTag : '<div class="product-media" style="display:flex; align-items:center; justify-content:center; color:#aaa;">No Media</div>'}<div class="product-info"><div class="product-title">${product.title}</div><div class="product-price">${priceRp}</div><div class="product-seller" style="color:#00AA5B; font-weight:bold;"><i class="fas fa-check-circle"></i> Belidikita Official</div></div>`;
                    card.addEventListener('click', () => bukaDetailProduk(fotoBarang, product.title, priceRp, deskripsiBarang, product.price));
                    productList.appendChild(card);
                });

                if(larisList && larisList.innerHTML === '') larisList.innerHTML = '<p style="padding:15px; font-size:12px; color:#888;">Belum ada barang di etalase ini.</p>';
                if(cartList && cartList.innerHTML === '') cartList.innerHTML = '<p style="padding:15px; font-size:12px; color:#888;">Belum ada barang di etalase ini.</p>';
            } else {
                productList.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Admin belum menambahkan barang.</p>';
                if(larisList) larisList.innerHTML = '<p style="padding:15px; font-size:12px; color:#888;">Belum ada barang.</p>';
                if(cartList) cartList.innerHTML = '<p style="padding:15px; font-size:12px; color:#888;">Belum ada barang.</p>';
            }
        } catch (error) { productList.innerHTML = '<p style="color: red; text-align:center;">Gagal memuat barang toko.</p>'; }
    }

    const productModal = document.getElementById('productDetailModal');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    
    let currentProduct = null;
    
    function bukaDetailProduk(foto, nama, hargaStr, deskripsi, hargaRaw) {
        if(!productModal) return; 
        document.getElementById('detailImage').src = foto;
        document.getElementById('detailTitle').innerText = nama;
        document.getElementById('detailPrice').innerText = hargaStr;
        document.getElementById('detailDesc').innerText = deskripsi;
        
        currentProduct = { foto: foto, nama: nama, harga: hargaRaw, qty: 1 };
        productModal.style.display = "block"; 
    }

    if(closeDetailBtn) { closeDetailBtn.addEventListener('click', () => { productModal.style.display = "none"; }); }

    const btnAddToCart = document.getElementById('btnAddToCart');
    if(btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            if(!currentProduct) return;
            let cart = JSON.parse(localStorage.getItem('belidikita_cart')) || [];
            const existingItem = cart.find(item => item.nama === currentProduct.nama);
            if(existingItem) {
                existingItem.qty += 1; 
            } else {
                cart.push(currentProduct); 
            }
            localStorage.setItem('belidikita_cart', JSON.stringify(cart));
            updateCartBadge();
            showToast("Barang dimasukkan ke keranjang 🛒", "success");
            productModal.style.display = "none"; 
        });
    }

    // ✅ TOMBOL CHECKOUT MENGARAH KE FOLDER REGISTRASI
    const btnCheckout = document.getElementById('btnCheckout');
    if(btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (!token || token.startsWith('token-admin-')) {
                showToast("Silakan Login atau Daftar akun dulu ya!", "error");
                setTimeout(() => window.location.href = 'registrasi/loginpembeli.html', 1500);
                return; 
            }
            const namaBarang = document.getElementById('detailTitle').innerText;
            const hargaBarang = document.getElementById('detailPrice').innerText;
            const pesan = `Halo Admin Belidikita, saya tertarik untuk membeli:\n\n*Nama Barang:* ${namaBarang}\n*Harga:* ${hargaBarang}\n\nApakah stoknya masih tersedia?`;
            const nomorAdmin = "6281234567890"; 
            const linkWA = `https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesan)}`;
            showToast("Mengarahkan ke WhatsApp...", "info");
            setTimeout(() => window.open(linkWA, '_blank'), 1000); 
            productModal.style.display = "none"; 
        });
    }
});
