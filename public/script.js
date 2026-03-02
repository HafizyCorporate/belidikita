document.addEventListener("DOMContentLoaded", () => {
    // === MEMBUAT DIV TOAST NOTIFIKASI SECARA OTOMATIS ===
    const toastDiv = document.createElement('div');
    toastDiv.id = 'customToast';
    document.body.appendChild(toastDiv);

    // FUNGSI MEMUNCULKAN NOTIFIKASI CANTIK
    function showToast(msg, type = 'info') {
        const toast = document.getElementById("customToast");
        toast.innerText = msg;
        toast.className = type + " show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    }

    // === 1. LOGIKA SPLASH SCREEN ===
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
            document.body.classList.remove('no-scroll'); 
            
            topHeader.classList.remove('hidden');
            mainContent.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            
            initDashboard(); 
        }, 1000); 
    }, 4500); 

    // === 2. SLIDER PROMO ===
    const sliderWrapper = document.getElementById('promoSlider');
    let slideIndex = 0;
    if(sliderWrapper) {
        setInterval(() => {
            slideIndex++;
            if (slideIndex > 2) slideIndex = 0; 
            sliderWrapper.style.transform = `translateX(-${slideIndex * 33.33}%)`;
        }, 3000); 
    }

    // === 3. MENGISI JENDELA HORIZONTAL ===
    function initDashboard() {
        populateHorizontalCards('topSellingList', '🔥 Hot');
        populateHorizontalCards('topCartList', '🛒 List');
        loadRandomProducts(); 
    }

    function populateHorizontalCards(containerId, label) {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = '';
        
        for(let i=1; i<=10; i++) {
            const card = document.createElement('div');
            card.className = 'h-card';
            
            const foto = `https://via.placeholder.com/150/f1f1f1/888?text=Produk+${i}`;
            const nama = `Produk ${label} ${i}`;
            const harga = `Rp${i}0.000`;
            const deskripsi = `Ini adalah detail lengkap untuk ${nama}. Barang dijamin 100% original dari Belidikita Official. Silakan langsung checkout sebelum kehabisan stok!`;

            card.innerHTML = `
                <img src="${foto}" class="h-card-img" alt="Barang">
                <div class="h-card-info">
                    <div class="h-card-row">
                        <span class="h-card-title">${nama}</span>
                        <span class="h-card-price">${harga}</span>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => bukaDetailProduk(foto, nama, harga, deskripsi));
            container.appendChild(card);
        }
    }

    // === 4. LOGIKA BOTTOM NAVBAR ===
    const menuHome = document.getElementById('menuHome');
    const menuProduct = document.getElementById('menuProduct');
    const menuFeed = document.getElementById('menuFeed');
    const menuTransaction = document.getElementById('menuTransaction');
    
    function setActiveNav(clickedMenu) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        clickedMenu.classList.add('active');
    }

    menuHome.addEventListener('click', (e) => {
        e.preventDefault(); setActiveNav(menuHome);
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    });

    menuProduct.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuProduct); showToast("Membuka Katalog Produk...", "info"); });
    menuFeed.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuFeed); showToast("Fitur Video Feed segera hadir!", "info"); });
    menuTransaction.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuTransaction); showToast("Silakan login untuk cek pesanan!", "info"); });

    // === 5. PINDAH KE HALAMAN LOGIN ADMIN TERPISAH ===
    const adminLoginIcon = document.getElementById('adminLoginIcon');

    if(adminLoginIcon) {
        adminLoginIcon.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
            } else {
                if(confirm("Admin sudah masuk. Apakah ingin Logout?")) {
                    localStorage.removeItem('token');
                    showToast("Berhasil Logout!", "success");
                    setTimeout(() => location.reload(), 1000);
                }
            }
        });
    }

    // === 6. AMBIL BARANG DARI DATABASE ===
    async function loadRandomProducts() {
        const productList = document.getElementById('randomProductList');
        if(!productList) return;
        try {
            const res = await fetch('/api/products');
            const result = await res.json();
            
            if (result.success && result.data.length > 0) {
                productList.innerHTML = ''; 
                result.data.forEach(product => {
                    const priceRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price);
                    
                    const isVideo = product.media_type === 'video';
                    const mediaTag = isVideo 
                        ? `<video src="${product.media_url}" class="product-media" style="object-fit:cover;"></video>` 
                        : `<img src="${product.media_url}" class="product-media" alt="${product.title}">`;
                    
                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.innerHTML = `
                        ${product.media_url ? mediaTag : '<div class="product-media" style="display:flex; align-items:center; justify-content:center; color:#aaa;">No Media</div>'}
                        <div class="product-info">
                            <div class="product-title">${product.title}</div>
                            <div class="product-price">${priceRp}</div>
                            <div class="product-seller" style="color:#00AA5B; font-weight:bold;">
                                <i class="fas fa-check-circle"></i> Belidikita Official
                            </div>
                        </div>
                    `;

                    const deskripsiBarang = product.description || "Deskripsi belum tersedia untuk produk ini.";
                    const fotoBarang = isVideo ? 'https://via.placeholder.com/400x300/f4f4f4/888?text=Video+Produk' : (product.media_url || 'https://via.placeholder.com/400x300/f4f4f4/888?text=No+Image');

                    card.addEventListener('click', () => {
                        bukaDetailProduk(fotoBarang, product.title, priceRp, deskripsiBarang);
                    });

                    productList.appendChild(card);
                });
            } else {
                productList.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Admin belum menambahkan barang.</p>';
            }
        } catch (error) {
            productList.innerHTML = '<p style="color: red; text-align:center;">Gagal memuat barang toko.</p>';
        }
    }

    // === 7. LOGIKA JENDELA POP-UP DETAIL PRODUK ===
    const productModal = document.getElementById('productDetailModal');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    
    function bukaDetailProduk(foto, nama, harga, deskripsi) {
        if(!productModal) return; 
        document.getElementById('detailImage').src = foto;
        document.getElementById('detailTitle').innerText = nama;
        document.getElementById('detailPrice').innerText = harga;
        document.getElementById('detailDesc').innerText = deskripsi;
        productModal.style.display = "block"; 
    }

    if(closeDetailBtn) {
        closeDetailBtn.addEventListener('click', () => { productModal.style.display = "none"; });
    }

    const btnAddToCart = document.getElementById('btnAddToCart');
    if(btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            let badge = document.querySelector('.cart-badge');
            if(badge) {
                let currentTotal = parseInt(badge.innerText) || 0;
                badge.innerText = currentTotal + 1; 
            }
            showToast("Barang dimasukkan ke keranjang 🛒", "success");
            productModal.style.display = "none"; 
        });
    }

    const btnCheckout = document.getElementById('btnCheckout');
    if(btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            const namaBarang = document.getElementById('detailTitle').innerText;
            const hargaBarang = document.getElementById('detailPrice').innerText;
            const pesan = `Halo Admin Belidikita, saya tertarik untuk membeli:\n\n*Nama Barang:* ${namaBarang}\n*Harga:* ${hargaBarang}\n\nApakah stoknya masih tersedia?`;
            
            const nomorAdmin = "6281234567890"; // Ganti Nomor WA
            const linkWA = `https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesan)}`;
            
            showToast("Mengarahkan ke WhatsApp...", "info");
            setTimeout(() => window.open(linkWA, '_blank'), 1000); 
            productModal.style.display = "none"; 
        });
    }
});
