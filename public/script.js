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

    if(splashScreen) {
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
    } else {
        initDashboard();
    }

    // ✅ FUNGSI BARU: Update Angka Merah (Badge) Keranjang di Pojok Kanan Atas
    function updateCartBadge() {
        let cart = JSON.parse(localStorage.getItem('belidikita_cart')) || [];
        let total = cart.reduce((sum, item) => sum + item.qty, 0);
        let badge = document.querySelector('.cart-badge');
        if(badge) badge.innerText = total;
    }
    updateCartBadge(); // Langsung jalankan saat web dibuka

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
    if(menuTransaction) menuTransaction.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuTransaction); showToast("Fitur Pesanan sedang dikembangkan", "info"); });

    // ✅ TOMBOL AKUN MENGARAH KE FOLDER REGISTRASI
    if(menuAccount) {
        menuAccount.addEventListener('click', (e) => { 
            e.preventDefault(); setActiveNav(menuAccount); 
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'registrasi/loginpembeli.html';
            } else {
                window.location.href = 'registrasi/profilpembeli.html';
            }
        });
    }

    // ✅ TOMBOL ADMIN TETAP DI LUAR (login.html biasa)
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
                        // ✅ PERBAIKAN: Menambahkan 'product.price' (Harga Angka Asli) agar bisa dihitung di keranjang
                        hCard.addEventListener('click', () => bukaDetailProduk(fotoBarang, product.title, priceRp, deskripsiBarang, product.price));
                        if (product.category === 'laris' && larisList) larisList.appendChild(hCard);
                        if (product.category === 'keranjang' && cartList) cartList.appendChild(hCard);
                    }

                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.innerHTML = `${product.media_url ? mediaTag : '<div class="product-media" style="display:flex; align-items:center; justify-content:center; color:#aaa;">No Media</div>'}<div class="product-info"><div class="product-title">${product.title}</div><div class="product-price">${priceRp}</div><div class="product-seller" style="color:#00AA5B; font-weight:bold;"><i class="fas fa-check-circle"></i> Belidikita Official</div></div>`;
                    // ✅ PERBAIKAN: Menambahkan 'product.price' (Harga Angka Asli) agar bisa dihitung di keranjang
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
    
    // ✅ TAMBAHAN: Variabel memori sementara untuk produk yang sedang dilihat
    let currentProduct = null;
    
    // ✅ PERBAIKAN: Fungsi ini sekarang menangkap 'hargaRaw' (harga angka murni tanpa Rp)
    function bukaDetailProduk(foto, nama, hargaStr, deskripsi, hargaRaw) {
        if(!productModal) return; 
        document.getElementById('detailImage').src = foto;
        document.getElementById('detailTitle').innerText = nama;
        document.getElementById('detailPrice').innerText = hargaStr;
        document.getElementById('detailDesc').innerText = deskripsi;
        
        // Simpan data asli untuk dimasukkan ke keranjang nanti
        currentProduct = { foto: foto, nama: nama, harga: hargaRaw, qty: 1 };

        productModal.style.display = "block"; 
    }

    if(closeDetailBtn) { closeDetailBtn.addEventListener('click', () => { productModal.style.display = "none"; }); }

    const btnAddToCart = document.getElementById('btnAddToCart');
    if(btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            if(!currentProduct) return;

            // ✅ LOGIKA BARU: Simpan ke LocalStorage agar tidak hilang saat direfresh
            let cart = JSON.parse(localStorage.getItem('belidikita_cart')) || [];
            
            // Cek apakah barang yang sama sudah ada di keranjang?
            const existingItem = cart.find(item => item.nama === currentProduct.nama);
            if(existingItem) {
                existingItem.qty += 1; // Jika ada, tambah jumlah barangnya
            } else {
                cart.push(currentProduct); // Jika baru, masukkan daftar
            }

            // Simpan kembali ke memori browser/HP
            localStorage.setItem('belidikita_cart', JSON.stringify(cart));

            // Panggil fungsi perbarui angka badge merah di ikon keranjang
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
            if (!token) {
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
