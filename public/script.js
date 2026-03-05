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
    const floatingAIBtn = document.getElementById('floatingAIBtn'); 

    const skipSplash = sessionStorage.getItem('skipSplash');
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');

    if(splashScreen) {
        if(skipSplash === 'true' || hasSeenSplash === 'true') {
            splashScreen.style.display = "none";
            document.body.classList.remove('no-scroll'); 
            topHeader.classList.remove('hidden');
            mainContent.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            if(floatingAIBtn) floatingAIBtn.classList.remove('hidden'); 
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
                    if(floatingAIBtn) floatingAIBtn.classList.remove('hidden'); 
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

    // ==========================================
    // KABEL TOMBOL MENU & HEADER
    // ==========================================
    const menuHome = document.getElementById('menuHome');
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
    
    if(menuFeed) menuFeed.addEventListener('click', (e) => { 
        e.preventDefault(); setActiveNav(menuFeed); 
        showToast("Fitur Video Feed segera hadir!", "info"); 
    });
    
    if(menuTransaction) menuTransaction.addEventListener('click', (e) => { 
        e.preventDefault(); 
        setActiveNav(menuTransaction); 
        bukaHalamanPesanan(); 
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

    const btnChatAdminWA = document.getElementById('btnChatAdminWA');
    if(btnChatAdminWA) {
        btnChatAdminWA.addEventListener('click', () => {
            const nomorAdmin = "6282240400388"; 
            const pesan = "Halo Admin Belidikita, saya ingin bertanya...";
            const linkWA = `https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesan)}`;
            window.open(linkWA, '_blank');
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

    // ==========================================
    // ✅ LOGIKA KOTAK MASUK TOKO (SHOPEE STYLE + AI AUTO-REPLY)
    // ==========================================
    const btnChatToko = document.getElementById('btnChatToko');
    const modalChatToko = document.getElementById('modalChatToko');
    const closeChatToko = document.getElementById('closeChatToko');
    const chatTokoBody = document.getElementById('chatTokoBody');
    const chatTokoInput = document.getElementById('chatTokoInput');
    const btnKirimChat = document.getElementById('btnKirimChat');

    if(btnChatToko) {
        btnChatToko.addEventListener('click', () => {
            const token = localStorage.getItem('token');
            if (!token || token.startsWith('token-admin-')) {
                showToast("Silakan login dulu untuk mengirim pesan ke toko!", "error");
                setTimeout(() => window.location.href = 'registrasi/loginpembeli.html', 1500);
                return;
            }
            if(modalChatToko) modalChatToko.style.display = 'flex';
            muatRiwayatChatToko();
        });
    }

    if(closeChatToko) closeChatToko.addEventListener('click', () => {
        if(modalChatToko) modalChatToko.style.display = 'none';
    });

    async function muatRiwayatChatToko() {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/chat/me', { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();
            
            if(result.success && result.data.length > 0) {
                chatTokoBody.innerHTML = '';
                result.data.forEach(msg => {
                    let isUser = msg.sender_role === 'pembeli';
                    let cssClass = isUser ? 'chat-msg-user' : 'chat-msg-store';
                    let labelToko = msg.sender_role === 'admin' ? '<br><small style="color:#00AA5B; font-weight:bold;">- Admin -</small>' : '';
                    
                    chatTokoBody.innerHTML += `<div class="${cssClass}">${msg.message} ${labelToko}</div>`;
                });
            } else {
                chatTokoBody.innerHTML = `<div class="chat-msg-store">Halo kak! Selamat datang di Belidikita. Ada yang bisa kami bantu? 😊</div>`;
            }
            chatTokoBody.scrollTop = chatTokoBody.scrollHeight;
        } catch(e) {}
    }

    // ✅ FUNGSI KIRIM CHAT (Hanya Kirim Pesan Asli, Otak AI diatur murni dari Server)
    async function kirimChatToko() {
        const teks = chatTokoInput.value.trim();
        if(!teks) return;
        const token = localStorage.getItem('token');

        // 1. Munculkan Chat Pembeli di layar
        chatTokoBody.innerHTML += `<div class="chat-msg-user">${teks}</div>`;
        chatTokoInput.value = '';
        chatTokoBody.scrollTop = chatTokoBody.scrollHeight;

        // 2. Simpan Chat Pembeli ke Database Admin
        fetch('/api/chat/save', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message: teks, sender: 'pembeli' })
        });

        // 3. Tampilkan Loading Toko Mengetik
        const loadingId = 'loading-' + Date.now();
        chatTokoBody.innerHTML += `<div class="chat-msg-store" id="${loadingId}"><i class="fas fa-ellipsis-h fa-fade"></i> Admin mengetik...</div>`;
        chatTokoBody.scrollTop = chatTokoBody.scrollHeight;

        // 4. Kirim teks ASLI pembeli ke Server (Server yang akan memproses persona AI)
        try {
            const res = await fetch('/api/ai/search', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: teks }) 
            });
            const data = await res.json();
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();

            if(data.success) {
                // 5. Tampilkan Balasan AI di layar
                let jawaban = data.answer.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
                chatTokoBody.innerHTML += `<div class="chat-msg-store">${jawaban}</div>`;
                
                // 6. Simpan Balasan AI ke Database Admin
                fetch('/api/chat/save', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ message: jawaban, sender: 'bot' })
                });
            } else {
                 chatTokoBody.innerHTML += `<div class="chat-msg-store">Mohon tunggu sebentar ya kak, Admin kami sedang memproses pesan kakak.</div>`;
            }
        } catch(e) {
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            chatTokoBody.innerHTML += `<div class="chat-msg-store">Pesan kakak sudah kami terima. Admin akan membalas secepatnya.</div>`;
        }
        chatTokoBody.scrollTop = chatTokoBody.scrollHeight;
    }

    if(btnKirimChat) btnKirimChat.addEventListener('click', kirimChatToko);
    if(chatTokoInput) chatTokoInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') kirimChatToko(); });


    // ==========================================
    // BOT AI CHAT (Sisa kode lama Floating AI)
    // ==========================================
    const aiChatModal = document.getElementById('aiChatModal');
    const closeAIBtn = document.getElementById('closeAIBtn');
    const aiSendBtn = document.getElementById('aiSendBtn');
    const aiInput = document.getElementById('aiInput');
    const aiBody = document.getElementById('aiBody');

    if(floatingAIBtn) {
        floatingAIBtn.addEventListener('click', () => {
            aiChatModal.style.display = 'flex';
        });
    }

    if(closeAIBtn) {
        closeAIBtn.addEventListener('click', () => {
            aiChatModal.style.display = 'none';
        });
    }

    // ✅ Di fungsi lama ini juga murni dikirim ke server langsung
    async function kirimPesanAI() {
        const teks = aiInput.value.trim();
        if(!teks) return;

        aiBody.innerHTML += `<div class="ai-msg user">${teks}</div>`;
        aiInput.value = '';
        aiBody.scrollTop = aiBody.scrollHeight;

        const loadingId = 'loading-' + Date.now();
        aiBody.innerHTML += `<div class="ai-msg bot" id="${loadingId}"><i class="fas fa-ellipsis-h fa-fade"></i> Berpikir...</div>`;
        aiBody.scrollTop = aiBody.scrollHeight;

        try {
            const res = await fetch('/api/ai/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: teks })
            });
            const data = await res.json();
            
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            
            if(data.success) {
                let jawaban = data.answer.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
                aiBody.innerHTML += `<div class="ai-msg bot">${jawaban}</div>`;
            } else {
                aiBody.innerHTML += `<div class="ai-msg bot" style="color:#ff3b30;">Maaf, otak AI saya sedang gangguan. Coba lagi nanti ya.</div>`;
            }
        } catch(e) {
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            aiBody.innerHTML += `<div class="ai-msg bot" style="color:#ff3b30;">Koneksi internetmu sepertinya terputus.</div>`;
        }
        aiBody.scrollTop = aiBody.scrollHeight;
    }

    if(aiSendBtn) { aiSendBtn.addEventListener('click', kirimPesanAI); }
    if(aiInput) { aiInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') kirimPesanAI(); }); }

    // ==========================================
    // FUNGSI PENGATUR PRODUK BERANDA UTAMA
    // ==========================================
    async function loadRandomProducts() {
        const productList = document.getElementById('randomProductList');
        const larisList = document.getElementById('topSellingList');
        const cartList = document.getElementById('topCartList');
        
        const sectionLaris = document.getElementById('sectionLaris');
        const sectionKeranjang = document.getElementById('sectionKeranjang');
        const sectionProdukUtama = document.getElementById('bagianProdukUtama');

        if(!productList) return;

        try {
            const res = await fetch('/api/products');
            const result = await res.json();
            
            let countLaris = 0;
            let countKeranjang = 0;
            let countBiasa = 0;

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

                    const terjual = product.sold_count || 0;
                    const avgRating = parseFloat(product.avg_rating) || 0;
                    const ratingHtml = avgRating > 0 ? `<i class="fas fa-star" style="color:#FFD700;"></i> ${avgRating}` : `<i class="fas fa-star" style="color:#ccc;"></i> 0.0`;

                    const pId = product.id; const pUrl = product.media_url; const pTitle = product.title;
                    const pDesc = deskripsiBarang; const pPrice = product.price; const pWeight = product.weight;
                    const pSeller = product.seller_name; const pUnit = product.unit; const pVarTitle = product.variant_title;
                    const pVarOpt = product.variant_options; const pWsPrice = product.wholesale_price; const pWsMin = product.wholesale_min_qty;

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
                                <div class="h-card-title">${product.title}</div>
                                <div class="h-card-price">${priceRp}</div>
                                <div class="h-card-stats">
                                    <span>${ratingHtml}</span>
                                    <span>${terjual} Terjual</span>
                                </div>
                            </div>
                        `;
                        hCard.addEventListener('click', () => window.bukaDetailGlobal(pId, pUrl, pTitle, priceRp, pDesc, pPrice, pWeight, pSeller, pUnit, pVarTitle, pVarOpt, pWsPrice, pWsMin));
                        
                        if (product.category === 'laris' && larisList) { larisList.appendChild(hCard); countLaris++; }
                        if (product.category === 'keranjang' && cartList) { cartList.appendChild(hCard); countKeranjang++; }
                    }

                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.innerHTML = `
                        ${badgeGrosirKotak}
                        ${fotoUtama ? mediaTag : '<div class="product-media" style="display:flex; align-items:center; justify-content:center; color:#aaa;">No Media</div>'}
                        <div class="product-info">
                            <div class="product-title">${product.title}</div>
                            <div class="product-price">${priceRp}</div>
                            <div class="product-stats">
                                <span>${ratingHtml}</span>
                                <span>${terjual} Terjual</span>
                            </div>
                        </div>`;
                    
                    card.addEventListener('click', () => window.bukaDetailGlobal(pId, pUrl, pTitle, priceRp, pDesc, pPrice, pWeight, pSeller, pUnit, pVarTitle, pVarOpt, pWsPrice, pWsMin));
                    
                    productList.appendChild(card);
                    countBiasa++;
                });

                if(countLaris > 0) { sectionLaris.style.display = 'block'; } else { sectionLaris.style.display = 'none'; }
                if(countKeranjang > 0) { sectionKeranjang.style.display = 'block'; } else { sectionKeranjang.style.display = 'none'; }
                if(countBiasa > 0) { sectionProdukUtama.style.display = 'block'; } else { sectionProdukUtama.style.display = 'none'; }

            } else {
                sectionLaris.style.display = 'none';
                sectionKeranjang.style.display = 'none';
                sectionProdukUtama.style.display = 'block';
                productList.innerHTML = '<p style="text-align:center; width:100%; color:#888; grid-column:span 2; padding:30px;">Toko masih dalam tahap persiapan barang.</p>';
            }
        } catch (error) { 
            sectionProdukUtama.style.display = 'block';
            productList.innerHTML = '<p style="color: red; text-align:center; grid-column:span 2; padding:30px;">Gagal memuat barang toko.</p>'; 
        }
    }


    // ==========================================
    // ✅ KUMPULAN FUNGSI GLOBAL (DI-ATTACH KE WINDOW) 
    // ==========================================
    
    window.bukaDetailGlobal = function(id, foto, nama, hargaStr, deskripsi, hargaRaw, beratRaw, sellerName, unit, vTitle, vOpt, wsPrice, wsMin) {
        if(typeof id === 'string' && id.includes('%7B')) {
            const decodedObj = decodeURIComponent(id);
            localStorage.setItem('produk_detail', decodedObj);
            window.location.href = 'detailproduk.html';
            return;
        }

        const dataProduk = { 
            id: id, foto: foto, nama: nama, hargaStr: hargaStr, deskripsi: deskripsi, 
            harga: hargaRaw, weight: beratRaw || 1000, seller_name: sellerName || "Belidikita Official", qty: 1,
            unit: unit || 'Pcs', variant_title: vTitle || '', variant_options: vOpt || '',
            wholesale_price: wsPrice || 0, wholesale_min_qty: wsMin || 0
        };
        localStorage.setItem('produk_detail', JSON.stringify(dataProduk));
        window.location.href = 'detailproduk.html';
    }

    const kamusKategori = {
        'Sembako': ['Beras, minyak, gula', 'Mie instan', 'Telur', 'Air galon', 'Gas LPG'],
        'Fashion': ['Baju pria / wanita / anak', 'Celana', 'Jaket', 'Hijab', 'Sepatu', 'Tas'],
        'Elektronik': ['HP & aksesoris', 'Charger', 'Headset', 'Powerbank', 'Smartwatch'],
        'Rumah Tangga': ['Alat dapur', 'Dispenser', 'Rice cooker', 'Blender', 'Peralatan kebersihan'],
        'Beauty': ['Skincare', 'Makeup', 'Parfum', 'Bodycare', 'Haircare'],
        'Ibu & Bayi': ['Popok', 'Susu', 'Baju bayi', 'Perlengkapan makan bayi'],
        'Komputer': ['Keyboard', 'Mouse', 'Laptop', 'Flashdisk', 'Harddisk'],
        'Otomotif': ['Oli', 'Aksesoris motor', 'Helm', 'Ban', 'Lampu kendaraan'],
        'Olahraga': ['Sepatu olahraga', 'Alat gym', 'Jersey', 'Tenda', 'Botol minum'],
        'Makanan': ['Snack', 'Frozen food', 'Kopi', 'Minuman kekinian'],
        'Buku': ['Buku sekolah', 'Novel', 'ATK', 'Perlengkapan kantor'],
        'Mainan': ['Mainan anak', 'Action figure', 'Puzzle', 'Alat musik'],
        'Ibadah': ['Sajadah', 'Mukena', 'Sarung', 'Al-Qur’an']
    };

    window.bukaSubKategori = function(mainCat) {
        document.getElementById('judulSubKategori').innerHTML = `<i class="fas fa-tags" style="color:#FF9800;"></i> Etalase ${mainCat}`;
        const container = document.getElementById('listSubKategori');
        container.innerHTML = '';
        const subs = kamusKategori[mainCat] || [];
        
        container.innerHTML += `<div class="sub-cat-item" style="background:#E1F5FE; border-color:#81D4FA; color:#0D47A1;" onclick="window.saringProdukLangsung('${mainCat}', 'Semua')"><span>Semua Produk ${mainCat}</span><i class="fas fa-chevron-right" style="color:#0D47A1;"></i></div>`;
        subs.forEach(sub => { container.innerHTML += `<div class="sub-cat-item" onclick="window.saringProdukLangsung('${mainCat}', '${sub}')"><span>${sub}</span><i class="fas fa-chevron-right"></i></div>`; });

        document.getElementById('modalSubKategori').style.display = 'flex';
        document.body.style.overflow = 'hidden'; 
    }

    window.tutupSubKategori = function() {
        document.getElementById('modalSubKategori').style.display = 'none';
        document.body.style.overflow = 'auto'; 
    }

    window.tutupHalamanKategori = function() {
        document.getElementById('katalogLayarPenuh').style.display = 'none';
        document.body.style.overflow = 'auto'; 
    }

    window.katalogDataSementara = []; 

    window.saringProdukLangsung = async function(mainCat, subCat) {
        window.tutupSubKategori();
        
        const layarPenuh = document.getElementById('katalogLayarPenuh');
        const judulHalaman = document.getElementById('judulHalamanKategori');
        const containerGrid = document.getElementById('gridHasilKategori');
        const teksPencarian = subCat === 'Semua' ? mainCat : subCat;

        const inputCari = document.getElementById('inputCariKatalog');
        const filterDrop = document.getElementById('filterKatalog');
        if(inputCari) inputCari.value = '';
        if(filterDrop) filterDrop.value = 'terbaru';

        layarPenuh.style.display = 'flex';
        document.body.style.overflow = 'hidden'; 
        judulHalaman.innerText = teksPencarian;
        containerGrid.innerHTML = '<p style="text-align:center; width:100%; color:#0D47A1; grid-column:span 2; padding: 50px 20px; font-weight:bold;"><i class="fas fa-spinner fa-spin mr-2"></i> Mengambil data dari server...</p>';

        try {
            const res = await fetch('/api/products');
            const result = await res.json();

            if (result.success && result.data.length > 0) {
                let keyword = teksPencarian.toLowerCase().split(/[,\/ ]/)[0]; 
                if(keyword === "buku" && subCat.includes("sekolah")) keyword = "sekolah";

                window.katalogDataSementara = result.data.filter(p => {
                    const title = (p.title || '').toLowerCase();
                    const desc = (p.description || '').toLowerCase();
                    return title.includes(keyword) || desc.includes(keyword);
                });

                window.renderHasilKatalog();
            } else {
                containerGrid.innerHTML = '<p style="text-align:center; width:100%; color:#888; grid-column:span 2; padding: 50px 20px;">Toko belum mengunggah barang.</p>';
            }
        } catch (e) {
            containerGrid.innerHTML = '<p style="text-align:center; width:100%; color:red; grid-column:span 2; padding: 50px 20px;">Gagal memuat barang dari server.</p>';
        }
    }

    window.renderHasilKatalog = function() {
        const containerGrid = document.getElementById('gridHasilKategori');
        const inputCari = document.getElementById('inputCariKatalog');
        const filterDrop = document.getElementById('filterKatalog');
        
        let finalData = [...window.katalogDataSementara]; 

        if(inputCari && inputCari.value.trim() !== '') {
            const searchTxt = inputCari.value.toLowerCase().trim();
            finalData = finalData.filter(p => {
                const title = (p.title || '').toLowerCase();
                const desc = (p.description || '').toLowerCase();
                return title.includes(searchTxt) || desc.includes(searchTxt);
            });
        }

        if(filterDrop) {
            if(filterDrop.value === 'termurah') {
                finalData.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            } else if (filterDrop.value === 'terlaris') {
                finalData.sort((a, b) => (parseInt(b.sold_count) || 0) - (parseInt(a.sold_count) || 0));
            } else {
                finalData.sort((a, b) => parseInt(b.id) - parseInt(a.id));
            }
        }

        if (finalData.length > 0) {
            containerGrid.innerHTML = '';
            finalData.forEach(product => {
                const priceRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price);
                const deskripsiBarang = product.description || "Deskripsi belum tersedia.";
                
                let fotoUtama = product.media_url;
                try {
                    const parsedMedia = JSON.parse(product.media_url);
                    if (Array.isArray(parsedMedia) && parsedMedia.length > 0) fotoUtama = parsedMedia[0];
                } catch(e) {} 

                const isVideo = product.media_type === 'video';
                const fotoBarang = isVideo ? 'https://via.placeholder.com/400x300/f4f4f4/888?text=Video' : (fotoUtama || 'https://via.placeholder.com/400x300/f4f4f4/888?text=No+Image');
                const mediaTag = isVideo ? `<video src="${fotoBarang}" class="product-media"></video>` : `<img src="${fotoBarang}" class="product-media" alt="${product.title}">`;
                
                const terjual = product.sold_count || 0; 
                const avgRating = parseFloat(product.avg_rating) || 0;
                const ratingHtml = avgRating > 0 ? `<i class="fas fa-star" style="color:#FFD700;"></i> ${avgRating}` : `<i class="fas fa-star" style="color:#ccc;"></i> 0.0`;

                const prodObj = {
                    id: product.id, foto: fotoUtama, nama: product.title, 
                    hargaStr: priceRp, deskripsi: deskripsiBarang, 
                    harga: product.price, weight: product.weight || 1000, 
                    seller_name: product.seller_name || "Belidikita Official", qty: 1,
                    unit: product.unit || 'Pcs', variant_title: product.variant_title || '',
                    variant_options: product.variant_options || '', wholesale_price: product.wholesale_price || 0,
                    wholesale_min_qty: product.wholesale_min_qty || 0
                };
                const strObj = encodeURIComponent(JSON.stringify(prodObj));

                let labelGrosir = '';
                if(product.wholesale_price > 0 && product.wholesale_min_qty > 0) {
                    labelGrosir = `<div style="position:absolute; top:5px; left:5px; background:#4CAF50; color:#fff; font-size:8px; padding:2px 6px; border-radius:4px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.2); z-index:2;"><i class="fas fa-tags"></i> GROSIR</div>`;
                }

                containerGrid.innerHTML += `
                    <div class="product-card" onclick="window.bukaDetailGlobal('${strObj}')" style="position:relative;">
                        ${labelGrosir}
                        ${mediaTag}
                        <div class="product-info">
                            <div class="product-title">${product.title}</div>
                            <div class="product-price">${priceRp}</div>
                            <div class="product-stats">
                                <span>${ratingHtml}</span>
                                <span>${terjual} Terjual</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            containerGrid.innerHTML = `
                <div style="text-align:center; width:100%; grid-column:span 2; padding: 50px 20px;">
                    <i class="fas fa-box-open" style="font-size: 60px; color: #ddd; margin-bottom: 15px;"></i>
                    <p style="color:#888; font-weight:600; font-size: 13px;">Ups, barang yang kamu ketik tidak ditemukan di kategori ini.</p>
                </div>`;
        }
    }

    window.tutupHalamanPesanan = function() {
        document.getElementById('pesananLayarPenuh').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    window.bukaHalamanPesanan = async function() {
        const layarPesanan = document.getElementById('pesananLayarPenuh');
        const kontenPesanan = document.getElementById('kontenPesananLayar');
        
        layarPesanan.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const token = localStorage.getItem('token');

        if (!token || token.startsWith('token-admin-')) {
            kontenPesanan.innerHTML = `
                <div style="text-align:center; padding: 50px 20px; margin-top:20px;">
                    <i class="fas fa-heart" style="font-size: 60px; color: #ff4757; margin-bottom: 20px; animation: pulse 1.5s infinite;"></i>
                    <h3 style="color:#0D47A1; font-weight:800; margin-bottom:10px;">Halo Orang Baik! ✨</h3>
                    <p style="color:#666; font-size:13px; line-height:1.6; margin-bottom:25px;">Halaman ini masih sepi nih, sesepi hati yang belum disinggahi. Yuk, login sekarang dan temukan barang-barang murah spesial Ramadhan buat nemenin hari-harimu!</p>
                    <button onclick="window.location.href='registrasi/loginpembeli.html'" style="background:linear-gradient(135deg, #0D47A1, #1976D2); color:white; border:none; padding:14px 30px; border-radius:25px; font-weight:800; box-shadow:0 4px 15px rgba(13,71,161,0.3); cursor:pointer; width:100%;">Login & Mulai Belanja <i class="fas fa-arrow-right ml-2"></i></button>
                </div>
            `;
            return;
        }

        kontenPesanan.innerHTML = '<p style="text-align:center; padding:50px; font-weight:bold; color:#0D47A1;"><i class="fas fa-spinner fa-spin mr-2"></i> Mengecek data pesananmu dari Admin...</p>';

        try {
            const res = await fetch('/api/orders/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();

            if (result.success && result.data.length > 0) {
                kontenPesanan.innerHTML = '';
                
                result.data.forEach(order => {
                    let statusColor = "#ff9800"; let iconStatus = "fa-clock";
                    if(order.status === 'Diproses') { statusColor = "#0D47A1"; iconStatus = "fa-box-open"; }
                    if(order.status === 'Dikirim') { statusColor = "#9c27b0"; iconStatus = "fa-truck-fast"; }
                    if(order.status === 'Selesai') { statusColor = "#00AA5B"; iconStatus = "fa-check-circle"; }
                    if(order.status.includes('Retur')) { statusColor = "#ff3b30"; iconStatus = "fa-exclamation-circle"; }

                    const formatRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.total_price);

                    let resiHtml = order.resi && order.resi !== '-'
                        ? `<div style="margin-top:10px; padding:10px; background:#f4f9ff; border:1px dashed #81D4FA; border-radius:8px; font-size:11px; font-weight:700;"><span style="color:#888;">No. Resi:</span> <span style="color:#0D47A1; user-select:all;">${order.resi}</span></div>`
                        : `<div style="margin-top:10px; font-size:10px; color:#888; font-style:italic;">*Nomor Resi akan muncul setelah dikirim Admin</div>`;

                    kontenPesanan.innerHTML += `
                        <div style="background:#fff; border-radius:15px; padding:15px; margin-bottom:15px; box-shadow:0 4px 10px rgba(0,0,0,0.05); border:1px solid #f0f4f8;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px dashed #eee; padding-bottom:10px;">
                                <span style="font-size:11px; color:#888; font-weight:700;">#ORD-${order.id}</span>
                                <span style="font-size:10px; font-weight:800; color:${statusColor}; background:${statusColor}15; padding:4px 8px; border-radius:6px;"><i class="fas ${iconStatus}"></i> ${order.status}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <p style="font-size:10px; color:#666; margin-bottom:2px;">Total Tagihan</p>
                                    <h4 style="font-size:15px; color:#ff5722; font-weight:800;">${formatRp}</h4>
                                </div>
                                <div style="text-align:right;">
                                    <p style="font-size:10px; color:#666; margin-bottom:2px;">Pengiriman via</p>
                                    <span style="font-size:12px; font-weight:800; color:#333;"><i class="fas fa-shipping-fast" style="color:#0D47A1;"></i> ${order.shipping_courier}</span>
                                </div>
                            </div>
                            ${resiHtml}
                        </div>
                    `;
                });
            } else {
                kontenPesanan.innerHTML = `
                    <div style="text-align:center; padding: 50px 20px;">
                        <i class="fas fa-shopping-bag" style="font-size: 60px; color: #ddd; margin-bottom: 15px;"></i>
                        <h3 style="color:#333; font-weight:800; margin-bottom:10px;">Belum ada pesanan nih</h3>
                        <p style="color:#888; font-size:12px; line-height:1.5;">Pilih barang favoritmu dan checkout sekarang. Banyak promo menarik menanti lho!</p>
                        <button onclick="window.tutupHalamanPesanan()" style="margin-top:20px; background:#0D47A1; color:white; border:none; padding:12px 25px; border-radius:20px; font-weight:bold; cursor:pointer;">Mulai Belanja Sekarang</button>
                    </div>
                `;
            }

        } catch (error) {
            kontenPesanan.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Gagal mengambil data pesanan. Periksa koneksi internet Anda.</p>';
        }
    }
});
