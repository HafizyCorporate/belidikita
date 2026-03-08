document.addEventListener("DOMContentLoaded", () => {
    const toastDiv = document.createElement('div');
    toastDiv.id = 'customToast';
    document.body.appendChild(toastDiv);

    function showToast(msg, type = 'info') {
        const toast = document.getElementById("customToast");
        if(toast) {
            toast.innerText = msg;
            toast.className = type + " show";
            setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
        }
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
            if(topHeader) topHeader.classList.remove('hidden');
            if(mainContent) mainContent.classList.remove('hidden');
            if(bottomNav) bottomNav.classList.remove('hidden');
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
                    if(topHeader) topHeader.classList.remove('hidden');
                    if(mainContent) mainContent.classList.remove('hidden');
                    if(bottomNav) bottomNav.classList.remove('hidden');
                    if(floatingAIBtn) floatingAIBtn.classList.remove('hidden'); 
                    sessionStorage.setItem('hasSeenSplash', 'true'); 
                    initDashboard(); 
                }, 1000); 
            }, 4500); 
        }
    } else {
        initDashboard();
    }

        async function updateCartBadge() {
        const token = localStorage.getItem('token');
        let badge = document.querySelector('.cart-badge');
        if (!badge) return;
        
        // Jika belum login atau login sebagai admin, badge keranjang = 0
        if (!token || token.startsWith('token-admin-')) {
            badge.innerText = "0";
            return;
        }

        try {
            // Minta jumlah keranjang langsung ke Server (Database)
            const res = await fetch('/api/cart', { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();
            if (result.success) {
                // Hitung total barang dari database
                let total = result.data.reduce((sum, item) => sum + item.qty, 0);
                badge.innerText = total;
            }
        } catch (e) {
            console.error("Gagal update badge keranjang");
        }
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
        cekStatusPembeli(); 
        // 🛑 CATATAN: loadRandomProducts() dihapus dari sini karena tugas tersebut
        // sudah di-handle 100% oleh fungsi loadProdukBeranda() di dashboardutama.html (Mencegah BUG Undefined & Bentrokan)
    }

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
        if(typeof window.bukaHalamanPesanan === 'function') window.bukaHalamanPesanan(); 
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
                if(modalConfirmAdmin) modalConfirmAdmin.style.display = 'flex'; 
            } else {
                window.location.href = 'login.html'; 
            }
        });
    }

    if(btnBatalAdmin) { btnBatalAdmin.addEventListener('click', () => { if(modalConfirmAdmin) modalConfirmAdmin.style.display = 'none'; }); }

    if(btnYakinAdmin) {
        btnYakinAdmin.addEventListener('click', () => {
            localStorage.removeItem('token'); 
            if(modalConfirmAdmin) modalConfirmAdmin.style.display = 'none'; 
            showToast("Berhasil Logout dari Admin!", "success");
            setTimeout(() => location.reload(), 1000); 
        });
    }

    // ==========================================
    // KOTAK MASUK TOKO
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
        if(!chatTokoBody) return;
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

    async function kirimChatToko() {
        const teks = chatTokoInput.value.trim();
        if(!teks) return;
        const token = localStorage.getItem('token');

        chatTokoBody.innerHTML += `<div class="chat-msg-user">${teks}</div>`;
        chatTokoInput.value = '';
        chatTokoBody.scrollTop = chatTokoBody.scrollHeight;

        fetch('/api/chat/save', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message: teks, sender: 'pembeli' })
        });

        const loadingId = 'loading-' + Date.now();
        chatTokoBody.innerHTML += `<div class="chat-msg-store" id="${loadingId}"><i class="fas fa-ellipsis-h fa-fade"></i> Admin mengetik...</div>`;
        chatTokoBody.scrollTop = chatTokoBody.scrollHeight;

        try {
            const res = await fetch('/api/ai/search', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: teks }) 
            });
            const data = await res.json();
            if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();

            if(data.success) {
                let jawaban = data.answer.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
                chatTokoBody.innerHTML += `<div class="chat-msg-store">${jawaban}</div>`;
                
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

    // ✅ KUMPULAN FUNGSI PENCARIAN & KATEGORI (DIHUBUNGKAN KE SERVER FASE 2)
    // Fungsi-fungsi ini sekarang diletakkan di global scope (window) agar bisa dipanggil dari HTML

    window.katalogDataSementara = [];

    window.saringProdukLangsung = async function(mainCat, subCat) {
        if (typeof window.tutupSubKategori === 'function') window.tutupSubKategori();
        
        const layarPenuh = document.getElementById('katalogLayarPenuh');
        const judulHalaman = document.getElementById('judulHalamanKategori');
        const containerGrid = document.getElementById('gridHasilKategori');
        const teksPencarian = subCat === 'Semua' ? mainCat : subCat;

        const inputCari = document.getElementById('inputCariKatalog');
        const filterDrop = document.getElementById('filterKatalog');
        if(inputCari) inputCari.value = '';
        if(filterDrop) filterDrop.value = 'terbaru';

        if(layarPenuh) {
            layarPenuh.style.display = 'flex';
            document.body.style.overflow = 'hidden'; 
        }
        if(judulHalaman) judulHalaman.innerText = teksPencarian;
        if(containerGrid) containerGrid.innerHTML = '<p style="text-align:center; width:100%; color:#0D47A1; grid-column:span 2; padding: 50px 20px; font-weight:bold;"><i class="fas fa-spinner fa-spin mr-2"></i> Mengambil data dari server...</p>';

        try {
            // Memanggil API Node.js Fase 2 (Filter by Category)
            let apiUrl = `/api/products?category=${encodeURIComponent(mainCat)}&limit=50`;
            
            if (subCat !== 'Semua') {
                let keyword = subCat.toLowerCase().split(/[,\/ ]/)[0]; 
                if(keyword === "buku" && subCat.includes("sekolah")) keyword = "sekolah";
                apiUrl = `/api/products?category=${encodeURIComponent(mainCat)}&search=${encodeURIComponent(keyword)}&limit=50`;
            }

            const res = await fetch(apiUrl);
            const result = await res.json();

            if (result.success && result.data.length > 0) {
                window.katalogDataSementara = result.data;
                if(typeof window.renderHasilKatalog === 'function') window.renderHasilKatalog();
            } else {
                if(containerGrid) containerGrid.innerHTML = '<p style="text-align:center; width:100%; color:#888; grid-column:span 2; padding: 50px 20px;">Toko belum mengunggah barang di kategori ini.</p>';
            }
        } catch (e) {
            if(containerGrid) containerGrid.innerHTML = '<p style="text-align:center; width:100%; color:red; grid-column:span 2; padding: 50px 20px;">Gagal memuat barang dari server.</p>';
        }
    };

    window.lakukanPencarianPintar = async function(keyword) {
        if(!keyword || keyword.trim() === '') return;
        try {
            // Memanggil API Node.js Fase 2 (Search Text)
            const res = await fetch(`/api/products?search=${encodeURIComponent(keyword)}&limit=50`);
            const result = await res.json();
            
            window.katalogDataSementara = result.success ? result.data : [];
            
            if (window.katalogDataSementara.length === 0) {
                const modalNotFound = document.getElementById('modalNotFound');
                if(modalNotFound) modalNotFound.style.display = 'flex';
            } else {
                if(typeof window.bukaHasilPencarianPintar === 'function') window.bukaHasilPencarianPintar(keyword, window.katalogDataSementara);
            }
        } catch (err) { 
            showToast("Sistem sibuk. Coba lagi.", "error"); 
        }
    };

    window.lakukanPencarianDariKatalog = async function(keyword) {
        if(!keyword || keyword.trim() === '') return;
        const containerGrid = document.getElementById('gridHasilKategori');
        if(containerGrid) containerGrid.innerHTML = '<p style="text-align:center; width:100%; color:#0D47A1; grid-column:span 2; padding: 50px 20px; font-weight:bold;"><i class="fas fa-spinner fa-spin mr-2"></i> Mencari...</p>';
        
        try {
            // Memanggil API Node.js Fase 2 (Search Text)
            const res = await fetch(`/api/products?search=${encodeURIComponent(keyword)}&limit=50`);
            const result = await res.json();
            
            window.katalogDataSementara = result.success ? result.data : [];
            
            if (window.katalogDataSementara.length === 0) {
                if(containerGrid) containerGrid.innerHTML = `<div style="text-align:center; width:100%; grid-column:span 2; padding: 50px 20px;"><i class="fas fa-box-open" style="font-size: 60px; color: #ddd; margin-bottom: 15px;"></i><p style="color:#888; font-weight:600; font-size: 13px;">Ups, "${keyword}" tidak ditemukan.</p></div>`;
            } else {
                const judulHalaman = document.getElementById('judulHalamanKategori');
                if(judulHalaman) judulHalaman.innerText = `Hasil: "${keyword}"`;
                if(typeof window.renderHasilKatalog === 'function') window.renderHasilKatalog();
            }
        } catch(e) {
            if(containerGrid) containerGrid.innerHTML = '<p style="text-align:center; width:100%; color:red; grid-column:span 2; padding: 50px 20px;">Gagal memuat barang dari server.</p>';
        }
    };

});
