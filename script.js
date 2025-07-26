// Global variables
let currentUser = null;
let currentChatPartner = null;
let chatSubscription = null;
let pesananSubscription = null;

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('d-none');
        setTimeout(() => {
            errorElement.classList.add('d-none');
        }, 5000);
    }
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.remove('d-none');
        setTimeout(() => {
            successElement.classList.add('d-none');
        }, 3000);
    }
}

function setLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

// Authentication functions
async function handleRegister(event) {
    event.preventDefault();
    setLoading('registerBtn', true);

    const namaLengkap = document.getElementById('namaLengkap').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    // Validation
    if (password !== confirmPassword) {
        showError('registerError', 'Password tidak cocok!');
        setLoading('registerBtn', false);
        return;
    }

    if (password.length < 6) {
        showError('registerError', 'Password minimal 6 karakter!');
        setLoading('registerBtn', false);
        return;
    }

    try {
        // Check if email already exists
        const { data: existingUser } = await DatabaseService.getUserByEmail(email);
        if (existingUser) {
            showError('registerError', 'Email sudah terdaftar!');
            setLoading('registerBtn', false);
            return;
        }

        // Create new user
        const { data, error } = await DatabaseService.createUser({
            nama_lengkap: namaLengkap,
            email: email,
            password: password, // Note: In production, hash this password
            role: role
        });

        if (error) {
            showError('registerError', 'Gagal mendaftar. Silakan coba lagi.');
            console.error('Registration error:', error);
        } else {
            showSuccess('registerSuccess', 'Pendaftaran berhasil! Silakan login.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    } catch (error) {
        showError('registerError', 'Terjadi kesalahan. Silakan coba lagi.');
        console.error('Registration error:', error);
    }

    setLoading('registerBtn', false);
}

async function handleLogin(event) {
    event.preventDefault();
    setLoading('loginBtn', true);

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data: user, error } = await DatabaseService.loginUser(email, password);
        
        if (error || !user) {
            showError('loginError', error || 'Email atau password salah!');
            setLoading('loginBtn', false);
            return;
        }

        // Store user session
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        showSuccess('loginSuccess', 'Login berhasil! Mengalihkan...');

        // Redirect based on role
        setTimeout(() => {
            if (user.role === 'user') {
                window.location.href = 'dashboard-user.html';
            } else if (user.role === 'mitra') {
                window.location.href = 'dashboard-mitra.html';
            } else if (user.role === 'admin') {
                window.location.href = 'dashboard-admin.html';
            }
        }, 1000);

    } catch (error) {
        showError('loginError', 'Terjadi kesalahan. Silakan coba lagi.');
        console.error('Login error:', error);
    }

    setLoading('loginBtn', false);
}

async function getCurrentUser() {
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        return currentUser;
    }
    return null;
}

function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('adminAccess');
    
    // Unsubscribe from real-time updates
    if (chatSubscription) {
        chatSubscription.unsubscribe();
    }
    if (pesananSubscription) {
        pesananSubscription.unsubscribe();
    }
    
    window.location.href = 'index.html';
}

async function checkAuthStatus() {
    const user = await getCurrentUser();
    const adminAccess = sessionStorage.getItem('adminAccess');
    
    // If on index page and user/admin is logged in, redirect to dashboard
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        if (adminAccess === 'true') {
            window.location.href = 'dashboard-admin.html';
            return;
        } else if (user) {
            if (user.role === 'user') {
                window.location.href = 'dashboard-user.html';
            } else if (user.role === 'mitra') {
                window.location.href = 'dashboard-mitra.html';
            } else if (user.role === 'admin') {
                window.location.href = 'dashboard-admin.html';
            }
            return;
        }
    }
    
    // If on dashboard pages and not logged in, redirect to login
    const currentPage = window.location.pathname;
    if (currentPage.includes('dashboard-')) {
        if (currentPage.includes('dashboard-admin')) {
            if (!adminAccess && (!user || user.role !== 'admin')) {
                window.location.href = 'index.html';
                return;
            }
        } else if (!user) {
            window.location.href = 'login.html';
            return;
        }
    }
}

// Admin Dashboard Functions
async function initAdminDashboard() {
    await loadAdminStats();
    await loadVerificationRequests();
    await loadPendingTopups();
    await loadAllPesanan();
    await loadAllUsers();
    await loadUsersList();
}

async function loadAdminStats() {
    try {
        const { data: users } = await DatabaseService.getAllUsers();
        
        if (users) {
            const totalUsers = users.filter(u => u.role === 'user').length;
            const totalMitra = users.filter(u => u.role === 'mitra').length;
            const pendingVerifikasi = users.filter(u => u.role === 'mitra' && u.status_verifikasi === 'menunggu_verifikasi').length;
            
            const totalUsersEl = document.getElementById('totalUsers');
            const totalMitraEl = document.getElementById('totalMitra');
            const pendingVerifikasiEl = document.getElementById('pendingVerifikasi');
            
            if (totalUsersEl) totalUsersEl.textContent = totalUsers;
            if (totalMitraEl) totalMitraEl.textContent = totalMitra;
            if (pendingVerifikasiEl) pendingVerifikasiEl.textContent = pendingVerifikasi;
        }

        const { data: pesanan } = await DatabaseService.getAllPesanan();
        if (pesanan) {
            const totalPesananEl = document.getElementById('totalPesanan');
            if (totalPesananEl) totalPesananEl.textContent = pesanan.length;
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadVerificationRequests() {
    try {
        const { data: mitra } = await DatabaseService.getUnverifiedMitra();
        const tbody = document.getElementById('mitraVerifikasiTable');
        
        if (!tbody) return; // Exit if element doesn't exist
        
        if (!mitra || mitra.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i data-feather="user-x" class="mb-2"></i>
                        <p>Belum ada mitra yang perlu diverifikasi</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = mitra.map(m => `
                <tr>
                    <td>${m.nama_lengkap}</td>
                    <td>${m.email}</td>
                    <td>${formatDate(m.created_at)}</td>
                    <td><span class="status-badge status-menunggu">Menunggu</span></td>
                    <td>
                        <button class="btn btn-success btn-sm me-2" onclick="verifyMitra(${m.id})">
                            <i data-feather="check" class="me-1"></i>Verifikasi
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectMitra(${m.id})">
                            <i data-feather="x" class="me-1"></i>Tolak
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading verification requests:', error);
    }
}

async function verifyMitra(mitraId) {
    try {
        const { error } = await DatabaseService.updateUserVerification(mitraId, 'terverifikasi');
        if (error) {
            alert('Gagal verifikasi mitra');
        } else {
            alert('Mitra berhasil diverifikasi!');
            await loadVerificationRequests();
            await loadAdminStats();
        }
    } catch (error) {
        console.error('Error verifying mitra:', error);
        alert('Terjadi kesalahan');
    }
}

async function rejectMitra(mitraId) {
    if (confirm('Yakin ingin menolak verifikasi mitra ini?')) {
        try {
            const { error } = await DatabaseService.updateUserVerification(mitraId, 'ditolak');
            if (error) {
                alert('Gagal menolak mitra');
            } else {
                alert('Mitra ditolak!');
                await loadVerificationRequests();
                await loadAdminStats();
            }
        } catch (error) {
            console.error('Error rejecting mitra:', error);
            alert('Terjadi kesalahan');
        }
    }
}

async function loadPendingTopups() {
    try {
        const { data: topups } = await DatabaseService.getPendingTopups();
        const tbody = document.getElementById('topupTable');
        
        if (!topups || topups.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i data-feather="credit-card" class="mb-2"></i>
                        <p>Belum ada permintaan top up</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = topups.map(t => `
                <tr>
                    <td>${t.user.nama_lengkap}</td>
                    <td>${t.user.email}</td>
                    <td>${formatCurrency(t.jumlah)}</td>
                    <td>${formatDate(t.waktu)}</td>
                    <td><span class="status-badge status-menunggu">Pending</span></td>
                    <td>
                        <button class="btn btn-success btn-sm me-2" onclick="confirmTopup(${t.id})">
                            <i data-feather="check" class="me-1"></i>Konfirmasi
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectTopup(${t.id})">
                            <i data-feather="x" class="me-1"></i>Tolak
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading pending topups:', error);
    }
}

async function confirmTopup(topupId) {
    try {
        const { error } = await DatabaseService.updateSaldoStatus(topupId, 'confirmed');
        if (error) {
            alert('Gagal konfirmasi top up');
        } else {
            alert('Top up berhasil dikonfirmasi!');
            await loadPendingTopups();
        }
    } catch (error) {
        console.error('Error confirming topup:', error);
        alert('Terjadi kesalahan');
    }
}

async function rejectTopup(topupId) {
    if (confirm('Yakin ingin menolak top up ini?')) {
        try {
            const { error } = await DatabaseService.updateSaldoStatus(topupId, 'rejected');
            if (error) {
                alert('Gagal menolak top up');
            } else {
                alert('Top up ditolak!');
                await loadPendingTopups();
            }
        } catch (error) {
            console.error('Error rejecting topup:', error);
            alert('Terjadi kesalahan');
        }
    }
}

async function loadAllPesanan() {
    try {
        const { data: pesanan } = await DatabaseService.getAllPesanan();
        const tbody = document.getElementById('pesananTable');
        
        if (!pesanan || pesanan.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i data-feather="package" class="mb-2"></i>
                        <p>Belum ada pesanan</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = pesanan.map(p => `
                <tr>
                    <td>#${p.id}</td>
                    <td>${p.user.nama_lengkap}</td>
                    <td>${p.mitra.nama_lengkap}</td>
                    <td>${p.deskripsi.substring(0, 50)}...</td>
                    <td><span class="status-badge status-${p.status.replace('_', '-')}">${p.status.replace('_', ' ')}</span></td>
                    <td>${formatDate(p.waktu_pesan)}</td>
                    <td>
                        <button class="btn btn-info btn-sm" onclick="viewPesananDetail(${p.id})">
                            <i data-feather="eye" class="me-1"></i>Detail
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading pesanan:', error);
    }
}

async function loadAllUsers() {
    try {
        const { data: users } = await DatabaseService.getAllUsers();
        const tbody = document.getElementById('usersTable');
        
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i data-feather="users" class="mb-2"></i>
                        <p>Belum ada pengguna</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = users.map(u => `
                <tr>
                    <td>#${u.id}</td>
                    <td>${u.nama_lengkap}</td>
                    <td>${u.email}</td>
                    <td><span class="badge bg-${u.role === 'user' ? 'primary' : 'success'}">${u.role}</span></td>
                    <td>
                        ${u.role === 'mitra' ? 
                            `<span class="status-badge status-${u.status_verifikasi ? u.status_verifikasi.replace('_', '-') : 'menunggu'}">${u.status_verifikasi || 'menunggu'}</span>` : 
                            '<span class="badge bg-success">Aktif</span>'
                        }
                    </td>
                    <td>${formatDate(u.created_at)}</td>
                    <td>
                        <button class="btn btn-info btn-sm" onclick="viewUserDetail(${u.id})">
                            <i data-feather="eye" class="me-1"></i>Detail
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadUsersList() {
    try {
        const { data: users } = await DatabaseService.getAllUsers();
        const select = document.getElementById('targetUser');
        
        if (select && users) {
            select.innerHTML = '<option value="">Pilih pengguna...</option>' + 
                users.map(u => `<option value="${u.id}">${u.nama_lengkap} (${u.role})</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading users list:', error);
    }
}

// User Dashboard Functions
async function initUserDashboard(user) {
    document.getElementById('userName').textContent = user.nama_lengkap;
    document.getElementById('namaLengkap').value = user.nama_lengkap;
    document.getElementById('email').value = user.email;
    
    await loadUserStats(user.id);
    await loadUserPesanan(user.id);
    await loadUserSaldo(user.id);
    await loadVerifiedMitra();
    
    // Setup real-time subscriptions
    setupUserSubscriptions(user.id);
    
    // Setup form handlers
    setupUserFormHandlers(user.id);
}

async function loadUserStats(userId) {
    try {
        const { data: pesanan } = await DatabaseService.getPesananByUser(userId);
        
        if (pesanan) {
            const totalPesanan = pesanan.length;
            const pesananProses = pesanan.filter(p => p.status === 'dalam_proses').length;
            const pesananSelesai = pesanan.filter(p => p.status === 'selesai').length;
            
            document.getElementById('totalPesanan').textContent = totalPesanan;
            document.getElementById('pesananProses').textContent = pesananProses;
            document.getElementById('pesananSelesai').textContent = pesananSelesai;
        }

        const { data: saldoData } = await DatabaseService.getSaldoByUser(userId);
        if (saldoData) {
            const formattedBalance = formatCurrency(saldoData.balance);
            document.getElementById('saldoUser').textContent = formattedBalance;
            document.getElementById('currentBalance').textContent = formattedBalance;
            document.getElementById('saldoAmount').textContent = formattedBalance;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadUserPesanan(userId) {
    try {
        const { data: pesanan } = await DatabaseService.getPesananByUser(userId);
        
        // Load recent orders for dashboard
        const recentTable = document.getElementById('pesananTerbaruTable');
        if (recentTable) {
            if (!pesanan || pesanan.length === 0) {
                recentTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            <i data-feather="package" class="mb-2"></i>
                            <p>Belum ada pesanan</p>
                        </td>
                    </tr>
                `;
            } else {
                const recentOrders = pesanan.slice(0, 5);
                recentTable.innerHTML = recentOrders.map(p => `
                    <tr>
                        <td>#${p.id}</td>
                        <td>${p.mitra ? p.mitra.nama_lengkap : 'Tidak ada'}</td>
                        <td>${p.deskripsi.substring(0, 30)}...</td>
                        <td><span class="status-badge status-${p.status.replace('_', '-')}">${p.status.replace('_', ' ')}</span></td>
                        <td>${formatDate(p.waktu_pesan)}</td>
                    </tr>
                `).join('');
            }
        }

        // Load all orders for status page
        const statusTable = document.getElementById('statusPesananTable');
        if (statusTable) {
            if (!pesanan || pesanan.length === 0) {
                statusTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted py-4">
                            <i data-feather="package" class="mb-2"></i>
                            <p>Belum ada pesanan</p>
                        </td>
                    </tr>
                `;
            } else {
                statusTable.innerHTML = pesanan.map(p => `
                    <tr>
                        <td>#${p.id}</td>
                        <td>${p.mitra ? p.mitra.nama_lengkap : 'Tidak ada'}</td>
                        <td>${p.jenis_layanan || 'Tidak disebutkan'}</td>
                        <td><span class="status-badge status-${p.status.replace('_', '-')}">${p.status.replace('_', ' ')}</span></td>
                        <td>${formatDate(p.waktu_pesan)}</td>
                        <td>
                            <button class="btn btn-info btn-sm" onclick="viewPesananDetail(${p.id})">
                                <i data-feather="eye" class="me-1"></i>Detail
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading user pesanan:', error);
    }
}

async function loadUserSaldo(userId) {
    try {
        const { data: saldoData } = await DatabaseService.getSaldoByUser(userId);
        const tbody = document.getElementById('transaksiTable');
        
        if (!saldoData || !saldoData.transactions || saldoData.transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i data-feather="credit-card" class="mb-2"></i>
                        <p>Belum ada transaksi</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = saldoData.transactions.map(t => `
                <tr>
                    <td>${formatDate(t.waktu)}</td>
                    <td>
                        <span class="badge bg-${t.jenis_transaksi === 'topup' ? 'success' : t.jenis_transaksi === 'income' ? 'info' : 'warning'}">
                            ${t.jenis_transaksi}
                        </span>
                    </td>
                    <td class="${t.jenis_transaksi === 'expense' ? 'text-danger' : 'text-success'}">
                        ${t.jenis_transaksi === 'expense' ? '-' : '+'}${formatCurrency(t.jumlah)}
                    </td>
                    <td>${t.keterangan || '-'}</td>
                </tr>
            `).join('');
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading user saldo:', error);
    }
}

async function loadVerifiedMitra() {
    try {
        const { data: mitra } = await DatabaseService.getVerifiedMitra();
        
        // For pesanan form
        const mitraSelect = document.getElementById('pilihMitra');
        if (mitraSelect && mitra) {
            mitraSelect.innerHTML = '<option value="">Pilih mitra...</option>' + 
                mitra.map(m => `<option value="${m.id}">${m.nama_lengkap}</option>`).join('');
        }

        // For dashboard widget
        const mitraList = document.getElementById('mitraList');
        if (mitraList && mitra) {
            if (mitra.length === 0) {
                mitraList.innerHTML = `
                    <div class="text-center text-muted py-3">
                        <i data-feather="user-x" class="mb-2"></i>
                        <p>Belum ada mitra tersedia</p>
                    </div>
                `;
            } else {
                mitraList.innerHTML = mitra.slice(0, 3).map(m => `
                    <div class="d-flex align-items-center mb-2">
                        <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
                            <i data-feather="user" class="text-white" style="width: 16px; height: 16px;"></i>
                        </div>
                        <div>
                            <small class="fw-semibold">${m.nama_lengkap}</small>
                            <br>
                            <small class="text-muted">${m.email}</small>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading verified mitra:', error);
    }
}

function setupUserFormHandlers(userId) {
    // Pesanan form
    const pesananForm = document.getElementById('pesananForm');
    if (pesananForm) {
        pesananForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                id_user: userId,
                id_mitra: document.getElementById('pilihMitra').value,
                jenis_layanan: document.getElementById('jenisLayanan').value,
                deskripsi: document.getElementById('deskripsiPesanan').value,
                alamat: document.getElementById('alamat').value,
                waktu_diinginkan: document.getElementById('waktuPesanan').value,
                estimasi_budget: parseInt(document.getElementById('estimasiBudget').value) || null
            };

            try {
                const { data, error } = await DatabaseService.createPesanan(formData);
                if (error) {
                    alert('Gagal membuat pesanan. Silakan coba lagi.');
                } else {
                    alert('Pesanan berhasil dibuat!');
                    pesananForm.reset();
                    await loadUserPesanan(userId);
                    await loadUserStats(userId);
                }
            } catch (error) {
                console.error('Error creating pesanan:', error);
                alert('Terjadi kesalahan. Silakan coba lagi.');
            }
        });
    }

    // Top up form
    const submitTopup = document.getElementById('submitTopup');
    if (submitTopup) {
        submitTopup.addEventListener('click', async () => {
            const amount = parseInt(document.getElementById('topupAmount').value);
            const note = document.getElementById('topupNote').value;

            if (!amount || amount < 10000) {
                alert('Minimal top up Rp 10.000');
                return;
            }

            try {
                const { data, error } = await DatabaseService.createSaldoTransaction({
                    id_user: userId,
                    jumlah: amount,
                    jenis_transaksi: 'topup',
                    keterangan: note || 'Top up saldo',
                    status: 'pending'
                });

                if (error) {
                    alert('Gagal request top up. Silakan coba lagi.');
                } else {
                    alert('Request top up berhasil! Menunggu konfirmasi admin.');
                    bootstrap.Modal.getInstance(document.getElementById('topupModal')).hide();
                    document.getElementById('topupForm').reset();
                }
            } catch (error) {
                console.error('Error requesting topup:', error);
                alert('Terjadi kesalahan. Silakan coba lagi.');
            }
        });
    }
}

function setupUserSubscriptions(userId) {
    // Subscribe to pesanan updates
    pesananSubscription = DatabaseService.subscribeToUserPesanan(userId, () => {
        loadUserPesanan(userId);
        loadUserStats(userId);
    });

    // Subscribe to chat messages
    chatSubscription = DatabaseService.subscribeToChats(userId, (payload) => {
        // Refresh chat if currently viewing
        if (currentChatPartner) {
            loadChatHistory(userId, currentChatPartner);
        }
        loadChatList(userId);
    });
}

// Mitra Dashboard Functions
async function initMitraDashboard(user) {
    document.getElementById('mitraName').textContent = user.nama_lengkap;
    document.getElementById('namaLengkap').value = user.nama_lengkap;
    document.getElementById('email').value = user.email;
    document.getElementById('statusVerifikasi').value = user.status_verifikasi;
    
    await loadMitraStats(user.id);
    await loadMitraPesanan(user.id);
    await loadMitraSaldo(user.id);
    
    // Update verification status display
    updateVerificationStatus(user.status_verifikasi);
    
    // Setup real-time subscriptions
    setupMitraSubscriptions(user.id);
    
    // Setup form handlers
    setupMitraFormHandlers(user.id);
}

async function loadMitraStats(mitraId) {
    try {
        const { data: pesanan } = await DatabaseService.getPesananByMitra(mitraId);
        
        if (pesanan) {
            const totalPesananMasuk = pesanan.filter(p => p.status === 'menunggu_konfirmasi').length;
            const pesananSelesai = pesanan.filter(p => p.status === 'selesai').length;
            const pesananProses = pesanan.filter(p => p.status === 'dalam_proses').length;
            
            document.getElementById('totalPesananMasuk').textContent = totalPesananMasuk;
            document.getElementById('pesananSelesai').textContent = pesananSelesai;
            document.getElementById('pesananProses').textContent = pesananProses;
        }

        const { data: saldoData } = await DatabaseService.getSaldoByUser(mitraId);
        if (saldoData) {
            const formattedBalance = formatCurrency(saldoData.balance);
            document.getElementById('totalEarning').textContent = formattedBalance;
            document.getElementById('currentBalance').textContent = formattedBalance;
            document.getElementById('saldoAmount').textContent = formattedBalance;
        }
    } catch (error) {
        console.error('Error loading mitra stats:', error);
    }
}

async function loadMitraPesanan(mitraId) {
    try {
        const { data: pesanan } = await DatabaseService.getPesananByMitra(mitraId);
        
        // Load recent orders for dashboard
        const recentTable = document.getElementById('pesananTerbaruTable');
        if (recentTable) {
            if (!pesanan || pesanan.length === 0) {
                recentTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            <i data-feather="package" class="mb-2"></i>
                            <p>Belum ada pesanan</p>
                        </td>
                    </tr>
                `;
            } else {
                const recentOrders = pesanan.slice(0, 5);
                recentTable.innerHTML = recentOrders.map(p => `
                    <tr>
                        <td>#${p.id}</td>
                        <td>${p.user ? p.user.nama_lengkap : 'Tidak ada'}</td>
                        <td>${p.deskripsi.substring(0, 30)}...</td>
                        <td><span class="status-badge status-${p.status.replace('_', '-')}">${p.status.replace('_', ' ')}</span></td>
                        <td>
                            ${p.status === 'menunggu_konfirmasi' ? `
                                <button class="btn btn-success btn-sm me-1" onclick="updatePesananStatus(${p.id}, 'dalam_proses')">
                                    <i data-feather="check" style="width: 14px; height: 14px;"></i>
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="updatePesananStatus(${p.id}, 'ditolak')">
                                    <i data-feather="x" style="width: 14px; height: 14px;"></i>
                                </button>
                            ` : p.status === 'dalam_proses' ? `
                                <button class="btn btn-primary btn-sm" onclick="updatePesananStatus(${p.id}, 'selesai')">
                                    <i data-feather="check-circle" style="width: 14px; height: 14px;"></i>
                                </button>
                            ` : '-'}
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Load all orders for pesanan page
        const allTable = document.getElementById('allPesananTable');
        if (allTable) {
            if (!pesanan || pesanan.length === 0) {
                allTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted py-4">
                            <i data-feather="package" class="mb-2"></i>
                            <p>Belum ada pesanan</p>
                        </td>
                    </tr>
                `;
            } else {
                allTable.innerHTML = pesanan.map(p => `
                    <tr>
                        <td>#${p.id}</td>
                        <td>${p.user ? p.user.nama_lengkap : 'Tidak ada'}</td>
                        <td>${p.deskripsi.substring(0, 30)}...</td>
                        <td><span class="status-badge status-${p.status.replace('_', '-')}">${p.status.replace('_', ' ')}</span></td>
                        <td>${formatDate(p.waktu_pesan)}</td>
                        <td>
                            ${p.status === 'menunggu_konfirmasi' ? `
                                <button class="btn btn-success btn-sm me-1" onclick="updatePesananStatus(${p.id}, 'dalam_proses')">Terima</button>
                                <button class="btn btn-danger btn-sm" onclick="updatePesananStatus(${p.id}, 'ditolak')">Tolak</button>
                            ` : p.status === 'dalam_proses' ? `
                                <button class="btn btn-primary btn-sm" onclick="updatePesananStatus(${p.id}, 'selesai')">Selesaikan</button>
                            ` : `
                                <button class="btn btn-info btn-sm" onclick="viewPesananDetail(${p.id})">Detail</button>
                            `}
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading mitra pesanan:', error);
    }
}

async function loadMitraSaldo(mitraId) {
    try {
        const { data: saldoData } = await DatabaseService.getSaldoByUser(mitraId);
        const tbody = document.getElementById('transaksiTable');
        
        if (!saldoData || !saldoData.transactions || saldoData.transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i data-feather="credit-card" class="mb-2"></i>
                        <p>Belum ada transaksi</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = saldoData.transactions.map(t => `
                <tr>
                    <td>${formatDate(t.waktu)}</td>
                    <td>
                        <span class="badge bg-${t.jenis_transaksi === 'topup' ? 'success' : t.jenis_transaksi === 'income' ? 'info' : 'warning'}">
                            ${t.jenis_transaksi}
                        </span>
                    </td>
                    <td class="${t.jenis_transaksi === 'expense' ? 'text-danger' : 'text-success'}">
                        ${t.jenis_transaksi === 'expense' ? '-' : '+'}${formatCurrency(t.jumlah)}
                    </td>
                    <td>${t.keterangan || '-'}</td>
                </tr>
            `).join('');
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading mitra saldo:', error);
    }
}

function updateVerificationStatus(status) {
    const statusElement = document.getElementById('verificationStatus');
    if (statusElement) {
        if (status === 'terverifikasi') {
            statusElement.innerHTML = `
                <div class="d-flex align-items-center text-success">
                    <i data-feather="check-circle" class="me-2"></i>
                    <span>Akun Terverifikasi</span>
                </div>
            `;
        } else if (status === 'menunggu_verifikasi') {
            statusElement.innerHTML = `
                <div class="d-flex align-items-center text-warning">
                    <i data-feather="clock" class="me-2"></i>
                    <span>Menunggu Verifikasi</span>
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div class="d-flex align-items-center text-danger">
                    <i data-feather="x-circle" class="me-2"></i>
                    <span>Verifikasi Ditolak</span>
                </div>
            `;
        }
        feather.replace();
    }
}

function setupMitraFormHandlers(mitraId) {
    // Top up form (same as user)
    const submitTopup = document.getElementById('submitTopup');
    if (submitTopup) {
        submitTopup.addEventListener('click', async () => {
            const amount = parseInt(document.getElementById('topupAmount').value);
            const note = document.getElementById('topupNote').value;

            if (!amount || amount < 10000) {
                alert('Minimal top up Rp 10.000');
                return;
            }

            try {
                const { data, error } = await DatabaseService.createSaldoTransaction({
                    id_user: mitraId,
                    jumlah: amount,
                    jenis_transaksi: 'topup',
                    keterangan: note || 'Top up saldo',
                    status: 'pending'
                });

                if (error) {
                    alert('Gagal request top up. Silakan coba lagi.');
                } else {
                    alert('Request top up berhasil! Menunggu konfirmasi admin.');
                    bootstrap.Modal.getInstance(document.getElementById('topupModal')).hide();
                    document.getElementById('topupForm').reset();
                }
            } catch (error) {
                console.error('Error requesting topup:', error);
                alert('Terjadi kesalahan. Silakan coba lagi.');
            }
        });
    }
}

function setupMitraSubscriptions(mitraId) {
    // Subscribe to pesanan updates
    pesananSubscription = DatabaseService.subscribeToMitraPesanan(mitraId, () => {
        loadMitraPesanan(mitraId);
        loadMitraStats(mitraId);
    });

    // Subscribe to chat messages
    chatSubscription = DatabaseService.subscribeToChats(mitraId, (payload) => {
        // Refresh chat if currently viewing
        if (currentChatPartner) {
            loadChatHistory(mitraId, currentChatPartner);
        }
        loadChatList(mitraId);
    });
}

// Common functions for pesanan management
async function updatePesananStatus(pesananId, newStatus) {
    try {
        const { error } = await DatabaseService.updatePesananStatus(pesananId, newStatus);
        if (error) {
            alert('Gagal update status pesanan');
        } else {
            alert('Status pesanan berhasil diupdate!');
            // Reload pesanan data based on current user role
            if (currentUser.role === 'mitra') {
                await loadMitraPesanan(currentUser.id);
                await loadMitraStats(currentUser.id);
            } else if (currentUser.role === 'admin') {
                await loadAllPesanan();
            }
        }
    } catch (error) {
        console.error('Error updating pesanan status:', error);
        alert('Terjadi kesalahan');
    }
}

function viewPesananDetail(pesananId) {
    // This would show a modal with full pesanan details
    alert(`Detail pesanan #${pesananId} - fitur akan segera hadir`);
}

function viewUserDetail(userId) {
    // This would show a modal with full user details
    alert(`Detail user #${userId} - fitur akan segera hadir`);
}

// Chat functions
async function loadChatList(userId) {
    try {
        const { data: conversations } = await DatabaseService.getChatList(userId);
        const chatList = document.getElementById('chatList');
        
        if (!conversations || conversations.length === 0) {
            chatList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i data-feather="message-circle" class="mb-2"></i>
                    <p>Belum ada percakapan</p>
                </div>
            `;
        } else {
            chatList.innerHTML = conversations.map(c => `
                <div class="chat-item" onclick="openChat(${c.partnerId}, '${c.partnerName}')">
                    <div class="d-flex align-items-center">
                        <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                            <i data-feather="${c.partnerRole === 'user' ? 'user' : 'briefcase'}" class="text-white" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${c.partnerName}</h6>
                            <p class="mb-0 text-muted small">${c.lastMessage.substring(0, 30)}...</p>
                            <small class="text-muted">${formatDate(c.lastTime)}</small>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading chat list:', error);
    }
}

async function openChat(partnerId, partnerName) {
    currentChatPartner = partnerId;
    
    // Update chat container header
    const chatContainer = document.getElementById('chatContainer');
    const chatInput = document.getElementById('chatInput');
    
    if (chatInput) {
        chatInput.style.display = 'block';
    }
    
    // Load chat history
    await loadChatHistory(currentUser.id, partnerId);
    
    // Setup chat form
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.onsubmit = async (e) => {
            e.preventDefault();
            const messageInput = document.getElementById('messageInput');
            const message = messageInput.value.trim();
            
            if (message) {
                await sendMessage(currentUser.id, partnerId, message);
                messageInput.value = '';
            }
        };
    }
}

async function loadChatHistory(userId, partnerId) {
    try {
        const { data: messages } = await DatabaseService.getChatHistory(userId, partnerId);
        const chatContainer = document.getElementById('chatContainer');
        
        if (!messages || messages.length === 0) {
            chatContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i data-feather="message-square" class="mb-2"></i>
                    <p>Belum ada pesan. Mulai percakapan!</p>
                </div>
            `;
        } else {
            chatContainer.innerHTML = messages.map(m => `
                <div class="chat-message ${m.dari === userId ? 'own' : ''}">
                    <div class="message-bubble">
                        <p class="mb-1">${m.pesan}</p>
                        <div class="message-time">${formatDate(m.waktu)}</div>
                    </div>
                </div>
            `).join('');
            
            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        feather.replace();
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

async function sendMessage(fromId, toId, message) {
    try {
        const { error } = await DatabaseService.sendMessage({
            dari: fromId,
            ke: toId,
            pesan: message
        });
        
        if (error) {
            alert('Gagal mengirim pesan');
        } else {
            // Reload chat history
            await loadChatHistory(fromId, toId);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Terjadi kesalahan');
    }
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('dashboard-user.html')) {
        checkUserAuth();
    } else if (currentPath.includes('dashboard-mitra.html')) {
        checkMitraAuth();
    } else if (currentPath.includes('dashboard-admin.html')) {
        // Admin check is handled in the HTML file
    }
});
