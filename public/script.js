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

    // ==========================================
    // ✅ LOGIKA BARU: ANIMASI HANYA 1X SAJA 
    // ==========================================
    const skipSplash = sessionStorage.getItem('skipSplash');
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');

    if(splashScreen) {
        if(skipSplash === 'true' || hasSeenSplash === 'true') {
            splashScreen.style.display = "none";
            document.body.classList.remove('no-scroll'); 
            topHeader.classList.remove('hidden');
            mainContent.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            sessionStorage.removeItem('skipSplash'); 
            initDashboard();
        } else {
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
                    sessionStorage.setItem('hasSeenSplash', 'true'); 
                    initDashboard(); 
                }, 1000); 
            }, 4500); 
        }
    } else {
        initDashboard();
    }

    function updateCartBadge() {
        let cart = JSON.parse(localStorage.getItem('belidikita_cart')) || [];
        let total = cart.reduce((sum, item) => sum + item.qty, 0);
        let badge = document.querySelector('.cart-badge');
        if(badge) badge.innerText = total;
    }
    updateCartBadge(); 

    async function cekStatusPembeli() {
        const token = localStorage.getItem('token');
        if (token && !token.startsWith('token-admin-')) {
            try {
                const res = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
                const result = await res.json();
                if (result.success) {
                    const menuAccountSpan = document.querySelector('#menuAccount span');
                    if(menuAccountSpan) {
                        menuAccountSpan.innerText = result.data.name.split(' ')[0];
                    }
                } else {
                    localStorage.removeItem('token'); 
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
        cekStatusPembeli(); 
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

    if(menuHome) menuHome.addEventListener('click', (e) => { 
        e.preventDefault(); setActiveNav(menuHome); window.scrollTo({ top: 0, behavior: 'smooth' }); 
    });
    
    if(menuProduct) menuProduct.addEventListener('click', (e) => { 
        e.preventDefault(); setActiveNav(menuProduct); 
        window.location.href = 'toko.html'; 
    });
    
    if(menuFeed) menuFeed.addEventListener('click', (e) => { 
        e.preventDefault(); setActiveNav(menuFeed); 
        showToast("Fitur Video Feed segera hadir!", "info"); 
    });
    
    if(menuTransaction) menuTransaction.addEventListener('click', (e) => { 
        e.preventDefault(); setActiveNav(menuTransaction); 
        window.location.href = 'registrasi/profilpembeli.html'; 
    });

    if(menuAccount) {
        menuAccount.addEventListener('click', (e) => { 
            e.preventDefault(); setActiveNav(menuAccount); 
            const token = localStorage.getItem('token');
            if (!token || token.startsWith('token-admin-')) {
                window.location.href = 'registrasi/loginpembeli.html';
            } else {
                window.location.href = 'registrasi/profilpembeli.html';
            }
        });
    }

    const adminLoginIcon = document.getElementById('adminLoginIcon');
    const modalConfirmAdmin = document.getElementById('modalConfirmAdmin');
    const btnBatalAdmin = document.getElementById('btnBatalAdmin');
    const btnYakinAdmin = document.getElementById('btnYakinAdmin');

    if(adminLoginIcon) {
        adminLoginIcon.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (token && token.startsWith('token-admin-')) {
                modalConfirmAdmin.style.display = 'flex'; 
            } else {
                window.location.href = 'login.html'; 
            }
        });
    }

    if(btnBatalAdmin) { btnBatalAdmin.addEventListener('click', () => { modalConfirmAdmin.style.display = 'none'; }); }

    if(btnYakinAdmin) {
        btnYakinAdmin.addEventListener('click', () => {
            localStorage.removeItem('token'); 
            modalConfirmAdmin.style.display = 'none'; 
            showToast("Berhasil Logout dari Admin!", "success");
            setTimeout(() => location.reload(), 1000); 
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
                    
                    let fotoUtama = product.media_url;
                    try {
                        const parsedMedia = JSON.parse(product.media_url);
                        if (Array.isArray(parsedMedia) && parsedMedia.length > 0) { fotoUtama = parsedMedia[0]; }
                    } catch(e) {} 

                    const fotoBarang = isVideo ? 'https://via.placeholder.com/400x300/f4f4f4/888?text=Video+Produk' : (fotoUtama || 'https://via.placeholder.com/400x300/f4f4f4/888?text=No+Image');
                    const mediaTag = isVideo ? `<video src="${fotoBarang}" class="product-media" style="object-fit:cover;"></video>` : `<img src="${fotoBarang}" class="product-media" alt="${product.title}">`;

                    const terjual = (product.id * 17 % 500) + 10;

                    // ✅ MENGAMBIL SEMUA DNA GROSIR & VARIAN
                    const pId = product.id;
                    const pUrl = product.media_url;
                    const pTitle = product.title;
                    const pDesc = deskripsiBarang;
                    const pPrice = product.price;
                    const pWeight = product.weight;
                    const pSeller = product.seller_name;
                    const pUnit = product.unit;
                    const pVarTitle = product.variant_title;
                    const pVarOpt = product.variant_options;
                    const pWsPrice = product.wholesale_price;
                    const pWsMin = product.wholesale_min_qty;

                    // Lencana Grosir di Beranda
                    let badgeGrosirHorizontal = '';
                    let badgeGrosirKotak = '';
                    if(pWsPrice > 0 && pWsMin > 0) {
                        badgeGrosirHorizontal = `<div style="font-size:8px; color:#fff; background:#4CAF50; padding:2px 4px; border-radius:3px; position:absolute; top:5px; right:5px;"><i class="fas fa-tags"></i> Grosir</div>`;
                        badgeGrosirKotak = `<div style="position:absolute; top:5px; left:5px; background:#4CAF50; color:#fff; font-size:8px; padding:2px 6px; border-radius:4px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.2); z-index:2;"><i class="fas fa-tags"></i> GROSIR</div>`;
                    }

                    if (product.category === 'laris' || product.category === 'keranjang') {
                        const hCard = document.createElement('div');
                        hCard.className = 'h-card';
                        hCard.style.position = 'relative';
                        hCard.innerHTML = `
                            ${badgeGrosirHorizontal}
                            <img src="${fotoBarang}" class="h-card-img" alt="Barang">
                            <div class="h-card-info">
                                <div class="h-card-row">
                                    <span class="h-card-title">${product.title}</span>
                                    <span class="h-card-price" style="font-size:11px;">${priceRp}</span>
                                </div>
                            </div>
                        `;
                        hCard.addEventListener('click', () => bukaDetailProduk(pId, pUrl, pTitle, priceRp, pDesc, pPrice, pWeight, pSeller, pUnit, pVarTitle, pVarOpt, pWsPrice, pWsMin));
                        
                        if (product.category === 'laris' && larisList) larisList.appendChild(hCard);
                        if (product.category === 'keranjang' && cartList) cartList.appendChild(hCard);
                    }

                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.style.position = 'relative';
                    card.innerHTML = `
                        ${badgeGrosirKotak}
                        ${fotoUtama ? mediaTag : '<div class="product-media" style="display:flex; align-items:center; justify-content:center; color:#aaa;">No Media</div>'}
                        <div class="product-info">
                            <div class="product-title">${product.title}</div>
                            <div class="product-price">${priceRp}</div>
                            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #888; font-weight: 600; margin-top: auto;">
                                <span><i class="fas fa-star" style="color:#FFD700;"></i> 4.9</span>
                                <span>${terjual} Terjual</span>
                            </div>
                        </div>`;
                    
                    card.addEventListener('click', () => bukaDetailProduk(pId, pUrl, pTitle, priceRp, pDesc, pPrice, pWeight, pSeller, pUnit, pVarTitle, pVarOpt, pWsPrice, pWsMin));
                    
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
    
    // ✅ FUNGSI KLIK MENGANGKUT SEMUA DATA GROSIR & VARIAN
    function bukaDetailProduk(id, foto, nama, hargaStr, deskripsi, hargaRaw, beratRaw, sellerName, unit, vTitle, vOpt, wsPrice, wsMin) {
        const dataProduk = { 
            id: id,
            foto: foto, 
            nama: nama, 
            hargaStr: hargaStr, 
            deskripsi: deskripsi, 
            harga: hargaRaw, 
            weight: beratRaw || 1000, 
            seller_name: sellerName || "Belidikita Official",
            qty: 1,
            unit: unit || 'Pcs',
            variant_title: vTitle || '',
            variant_options: vOpt || '',
            wholesale_price: wsPrice || 0,
            wholesale_min_qty: wsMin || 0
        };
        
        localStorage.setItem('produk_detail', JSON.stringify(dataProduk));
        window.location.href = 'detailproduk.html';
    }

    if(closeDetailBtn) { closeDetailBtn.addEventListener('click', () => { productModal.style.display = "none"; }); }

    // FUNGSI LAIN (Tidak Dihapus)
    const btnAddToCart = document.getElementById('btnAddToCart');
    if(btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            if(!currentProduct) return;
            let cart = JSON.parse(localStorage.getItem('belidikita_cart')) || [];
            const existingItem = cart.find(item => item.nama === currentProduct.nama);
            if(existingItem) { existingItem.qty += 1; } else { cart.push(currentProduct); }
            localStorage.setItem('belidikita_cart', JSON.stringify(cart));
            updateCartBadge();
            showToast("Barang dimasukkan ke keranjang 🛒", "success");
            productModal.style.display = "none"; 
        });
    }

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
            const nomorAdmin = "6282240400388"; 
            const linkWA = `https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesan)}`;
            showToast("Mengarahkan ke WhatsApp...", "info");
            setTimeout(() => window.open(linkWA, '_blank'), 1000); 
            productModal.style.display = "none"; 
        });
    }
});
