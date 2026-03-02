document.addEventListener("DOMContentLoaded", () => {
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
            card.innerHTML = `
                <img src="https://via.placeholder.com/150/f1f1f1/888?text=Produk+${i}" class="h-card-img" alt="Barang">
                <div class="h-card-info">
                    <div class="h-card-row">
                        <span class="h-card-title">Produk ${label} ${i}</span>
                        <span class="h-card-price">Rp${i}0K</span>
                    </div>
                </div>
            `;
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
        e.preventDefault();
        setActiveNav(menuHome);
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    });

    menuProduct.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuProduct); alert("Membuka Katalog Produk..."); });
    menuFeed.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuFeed); alert("Fitur Video Feed segera hadir!"); });
    menuTransaction.addEventListener('click', (e) => { e.preventDefault(); setActiveNav(menuTransaction); alert("Silakan masukkan nomor resi pesananmu di menu ini nanti!"); });

    // === 5. PINDAH KE HALAMAN LOGIN ADMIN TERPISAH ===
    const adminLoginIcon = document.getElementById('adminLoginIcon');

    if(adminLoginIcon) {
        adminLoginIcon.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (!token) {
                // ARAHKAN KE HALAMAN LOGIN.HTML
                window.location.href = 'login.html';
            } else {
                // JIKA SUDAH LOGIN
                if(confirm("Admin sudah masuk. Apakah ingin Logout?")) {
                    localStorage.removeItem('token');
                    alert("Berhasil Logout!");
                    location.reload();
                }
            }
        });
    }

    // === 6. AMBIL BARANG UNTUK TOKO PRIBADI (OFFICIAL STORE) ===
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
                    const mediaTag = product.media_type === 'video' ? `<video src="${product.media_url}" class="product-media" controls></video>` : `<img src="${product.media_url}" class="product-media" alt="${product.title}">`;
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
                    productList.appendChild(card);
                });
            } else {
                productList.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Admin belum menambahkan barang.</p>';
            }
        } catch (error) {
            productList.innerHTML = '<p style="color: red; text-align:center;">Gagal memuat barang toko.</p>';
        }
    }
});
