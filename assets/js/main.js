// assets/js/main.js

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    
    let colorClass, iconHtml;
    
    if (type === 'success') {
        colorClass = 'bg-green-100 text-green-800 border-green-300';
        iconHtml = '<svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>';
    } else if (type === 'error') {
        colorClass = 'bg-red-100 text-red-800 border-red-300';
        iconHtml = '<svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>';
    } else if (type === 'warning') {
        colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';
        iconHtml = '<svg class="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    } else {
        // info
        colorClass = 'bg-blue-100 text-blue-800 border-blue-300';
        iconHtml = '<svg class="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }
    
    toast.className = `flex items-center gap-3 p-4 rounded-xl border font-bold shadow-lg animate-toastIn ${colorClass}`;
    toast.innerHTML = `
        ${iconHtml}
        <span class="text-sm">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('animate-toastIn');
        toast.classList.add('animate-toastOut');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
};

// Global states
let globalAssets = [];
let globalMasterBmd = [];
let currentView = 'dashboard';
let selectedRoom = 'Ruang Kaban (Kepala Badan)';
let uploadedFileObject = null;
let bulkSelectedBmdIds = new Set();
let currentNonKirTab = 'non-kir';
let selectedKirAssetIds = new Set();
let selectedNonKirAssetIds = new Set();
let selectedUsulHapusAssetIds = new Set();
let selectedRekapRooms = new Set();
let currentBmdPage = 1;
let bmdItemsPerPage = 50;

const VIEWS = ['dashboard', 'master-bmd', 'manajemen-kir', 'usul-hapus', 'riwayat-penghapusan', 'laporan', 'riwayat-sistem', 'verifikasi'];

// Official room list (semua lokasi termasuk ruangan khusus/non-KIR lama)
let OFFICIAL_ROOMS = [
  "Ruang Kaban (Kepala Badan)",
  "Ruang Sekretaris",
  "Ruang Sekretariat",
  "Ruang Kasubbag Keuangan",
  "Ruang Kasubbag Umpeg",
  "Ruang Kasubbag Sunram",
  "Ruang Selasar",
  "Ruang Rapat",
  "Ruang Pelayanan",
  "Ruang Dapur",
  "Ruang Kabid Ideologi",
  "Ruang Kabid Hansenibud",
  "Ruang Kabid Politik",
  "Ruang Kabid Wasnas",
  "Depan Bidang",
  "Inventaris Kantor",
  "Aset Non-KIR",
  "Kendaraan Dinas",
  "Masih Harus Dicari"
];

function getActiveRooms(assets = globalAssets) {
    const customRooms = JSON.parse(localStorage.getItem('simbar.custom_rooms') || '[]');
    const deletedRooms = JSON.parse(localStorage.getItem('simbar.deleted_rooms') || '[]');
    // Lokasi di luar tanggung jawab internal (seperti barang yang sudah dihibahkan/dihapus keluar)
    const NON_OFFICE_LOCATIONS = new Set(['Barang yang Dihibahkan']);
    const assetRooms = [...new Set(assets.map(a => a.ruangan))].filter(r => r && !NON_OFFICE_LOCATIONS.has(r));
    
    // Combine official, custom, and asset rooms (deduplicated)
    const combined = Array.from(new Set([
        ...OFFICIAL_ROOMS,
        ...customRooms,
        ...assetRooms
    ])).filter(r => !deletedRooms.includes(r));
    
    return combined;
}

async function loadAllData() {
    await checkDatabaseTables();
    await fetchAssets();
    await fetchMasterBmd();
    await fetchRiwayat();
    
    // Refresh tables in current view
    populateAllRoomSelects();
    renderCurrentViewData();

    // Load import session stat widget on dashboard
    if (window.loadImportSessionStat) window.loadImportSessionStat();
}

async function fetchAssets() {
  try {
    let { data, error } = await supabaseClient.from('assets').select('*').order('no_urut', { ascending: true });
    if (error) throw error;
    globalAssets = data || [];
    updateDashboardStats(globalAssets);
  } catch (e) {
    console.error('Supabase fetch assets error:', e);
  }
}

async function fetchMasterBmd() {
  try {
    let { data, error } = await supabaseClient.from('master_bmd').select('*').order('id', { ascending: true });
    if (error) throw error;
    globalMasterBmd = data || [];
  } catch (e) {
    console.error('Supabase fetch master_bmd error:', e);
  }
}

async function fetchRiwayat() {
  try {
    let { data, error } = await supabaseClient.from('riwayat_barang').select('*').order('tanggal', { ascending: false }).limit(20);
    if (error) throw error;
    
    const tbody = document.getElementById('riwayat-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-textMuted">Belum ada riwayat aktivitas.</td></tr>';
        return;
    }
    
    data.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/20 hover:bg-white/10 transition-colors';
        
        // Find corresponding asset name
        const asset = globalAssets.find(a => a.id == r.asset_id);
        const assetName = asset ? asset.nama_barang : `Aset ID: ${r.asset_id}`;
        const formattedDate = new Date(r.tanggal).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        
        let badgeColorClass = 'bg-pastel-blue/20 text-blue-800 border-blue-200';
        const jenis = r.jenis_perubahan || '';
        if (jenis.includes('Impor') || jenis.includes('NEW')) {
            badgeColorClass = 'bg-pastel-green/40 text-green-800 border-green-200';
        } else if (jenis.includes('Edit') || jenis.includes('Ubah')) {
            badgeColorClass = 'bg-pastel-blue/40 text-blue-800 border-blue-200';
        } else if (jenis.includes('Hapus') || jenis.includes('Dieksekusi') || jenis.includes('Dimusnahkan') || jenis.includes('Dihibahkan') || jenis.includes('Dilelang')) {
            badgeColorClass = 'bg-pastel-red/40 text-red-800 border-red-200';
        } else if (jenis.includes('Usul') || jenis.includes('Pindah') || jenis.includes('Mutasi')) {
            badgeColorClass = 'bg-pastel-yellow/40 text-yellow-800 border-yellow-200';
        }

        tr.innerHTML = `
            <td class="py-2 px-2 whitespace-nowrap text-xs">${formattedDate}</td>
            <td class="py-2 px-2 font-bold text-gray-900 text-xs max-w-[120px] truncate" title="${assetName}">${assetName}</td>
            <td class="py-2 px-2 whitespace-nowrap text-center"><span class="clay-btn px-2 py-0.5 text-[10px] inline-block ${badgeColorClass}">${r.jenis_perubahan}</span></td>
            <td class="py-2 px-2 text-xs italic text-textMuted max-w-[150px] truncate" title="${r.keterangan || ''}">${r.keterangan || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Supabase fetch riwayat error:', e);
  }
}


// Mobile off-canvas sidebar drawer control.
// Desktop/lg+ is untouched (sidebar stays static via lg: classes in HTML),
// this only toggles the translate/overlay classes used below the lg breakpoint.
window.toggleSidebar = function(forceState) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    let shouldOpen;
    if (forceState === 'open') {
        shouldOpen = true;
    } else if (forceState === 'close') {
        shouldOpen = false;
    } else {
        shouldOpen = sidebar.classList.contains('-translate-x-full');
    }

    if (shouldOpen) {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
        // Lock background scroll while the drawer is open (mobile only).
        if (window.innerWidth < 1024) {
            document.body.style.overflow = 'hidden';
        }
    } else {
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

// Keep drawer state sane if the window is resized/rotated across the lg breakpoint.
window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) {
        document.body.style.overflow = '';
    }
});

window.switchView = function(viewName) {
    if (!VIEWS.includes(viewName)) return;

    // Auto-close the drawer on mobile/tablet after picking a menu item.
    if (window.innerWidth < 1024) {
        window.toggleSidebar('close');
    }

    currentView = viewName;

    const importBtnHeader = document.getElementById('import-btn-header');
    if (importBtnHeader) {
        if (viewName === 'master-bmd') {
            importBtnHeader.classList.remove('hidden');
        } else {
            importBtnHeader.classList.add('hidden');
        }
    }

    const iconColors = {
        'dashboard': { active: 'text-blue-600', inactive: 'text-blue-400' },
        'master-bmd': { active: 'text-indigo-600', inactive: 'text-indigo-400' },
        'manajemen-kir': { active: 'text-emerald-600', inactive: 'text-emerald-400' },
        'non-kir': { active: 'text-amber-600', inactive: 'text-amber-400' },
        'usul-hapus': { active: 'text-rose-600', inactive: 'text-rose-400' },
        'riwayat-penghapusan': { active: 'text-violet-600', inactive: 'text-violet-400' },
        'laporan': { active: 'text-sky-600', inactive: 'text-sky-400' },
        'verifikasi': { active: 'text-fuchsia-600', inactive: 'text-fuchsia-400' }
    };

    VIEWS.forEach(item => {
        const btn = document.getElementById(`nav-${item}`);
        if (btn) {
            const colors = iconColors[item] || { active: 'text-blue-600', inactive: 'text-gray-500' };
            const svg = btn.querySelector('svg');
            if (item === viewName) {
                btn.className = "clay-btn py-3 px-5 flex items-center gap-3 text-textMain !shadow-clay-pressed !bg-surface/80 w-full text-left";
                if (svg) svg.className.baseVal = `w-5 h-5 ${colors.active}`;
            } else {
                btn.className = "clay-btn py-3 px-5 flex items-center gap-3 text-textMuted hover:text-textMain w-full text-left";
                if (svg) svg.className.baseVal = `w-5 h-5 ${colors.inactive}`;
            }
        }
        
        const panel = document.getElementById(`${item}-panel`);
        if (panel) {
            if (item === viewName) {
                panel.classList.remove('hidden');
                panel.classList.add('block');
            } else {
                panel.classList.add('hidden');
                panel.classList.remove('block');
            }
        }
    });

    // Auto-expand and style parent groups based on active view
    const isPenghapusanActive = ['usul-hapus', 'riwayat-penghapusan'].includes(viewName);
    const isLaporanKontrolActive = ['laporan', 'verifikasi'].includes(viewName);

    if (isPenghapusanActive) {
        toggleSidebarGroup('penghapusan', 'open');
    }
    if (isLaporanKontrolActive) {
        toggleSidebarGroup('laporan-kontrol', 'open');
    }

    const btnPenghapusan = document.getElementById('btn-group-penghapusan');
    if (btnPenghapusan) {
        const svg = btnPenghapusan.querySelector('svg');
        if (isPenghapusanActive) {
            btnPenghapusan.classList.add('!bg-slate-50', 'text-textMain');
            btnPenghapusan.classList.remove('text-textMuted');
            if (svg) svg.className.baseVal = "w-5 h-5 text-rose-600";
        } else {
            btnPenghapusan.classList.remove('!bg-slate-50', 'text-textMain');
            btnPenghapusan.classList.add('text-textMuted');
            if (svg) svg.className.baseVal = "w-5 h-5 text-rose-400";
        }
    }

    const btnLaporanKontrol = document.getElementById('btn-group-laporan-kontrol');
    if (btnLaporanKontrol) {
        const svg = btnLaporanKontrol.querySelector('svg');
        if (isLaporanKontrolActive) {
            btnLaporanKontrol.classList.add('!bg-slate-50', 'text-textMain');
            btnLaporanKontrol.classList.remove('text-textMuted');
            if (svg) svg.className.baseVal = "w-5 h-5 text-sky-600";
        } else {
            btnLaporanKontrol.classList.remove('!bg-slate-50', 'text-textMain');
            btnLaporanKontrol.classList.add('text-textMuted');
            if (svg) svg.className.baseVal = "w-5 h-5 text-sky-400";
        }
    }

    // Update Header Text
    const title = document.getElementById('header-title');
    const desc = document.getElementById('header-desc');
    
    if (viewName === 'dashboard') {
        title.textContent = 'Dashboard Inventaris';
        desc.textContent = 'Ringkasan data Barang Milik Daerah (BMD) dan Kartu Inventaris Ruangan (KIR)';
    } else if (viewName === 'master-bmd') {
        title.textContent = 'Master BMD (Data Induk)';
        desc.textContent = 'Aset induk Peralatan dan Mesin Badan Kesbangpol';
        populateRoomSelects();
    } else if (viewName === 'manajemen-kir') {
        title.textContent = 'Manajemen KIR';
        desc.textContent = 'Pengelolaan Kartu Inventaris Ruangan (KIR) secara terperinci';
        populateRoomSelects();
        // Reset search and condition filters when entering the KIR view
        const searchInput = document.getElementById('search-kir');
        if (searchInput) searchInput.value = '';
        const condSelect = document.getElementById('filter-kir-kondisi');
        if (condSelect) condSelect.value = 'semua';
    } else if (viewName === 'non-kir') {
        title.textContent = 'Aset Non-KIR';
        desc.textContent = 'Daftar aset cadangan, belum dialokasikan, atau yang tidak berada di ruangan resmi';
        currentNonKirTab = 'non-kir';
        updateNonKirTabUI();
    } else if (viewName === 'usul-hapus') {
        title.textContent = 'Usul Penghapusan';
        desc.textContent = 'Daftar aset yang diusulkan untuk dihapus dari inventaris';
    } else if (viewName === 'riwayat-penghapusan') {
        title.textContent = 'Riwayat Penghapusan';
        desc.textContent = 'Daftar aset yang telah dikeluarkan (Dimusnahkan, Dihibahkan, atau Dilelang)';
    } else if (viewName === 'laporan') {
        title.textContent = 'Laporan & Cetak Rekap';
        desc.textContent = 'Rekapitulasi total aset per ruangan and export format resmi';
        populateRoomSelects();
    } else if (viewName === 'verifikasi') {
        title.textContent = 'Antrian Verifikasi';
        desc.textContent = 'Tinjau dan konfirmasi hasil pencocokan aset dari impor BMD yang memerlukan keputusan admin';
        if (window.loadVerificationQueue) window.loadVerificationQueue();
        if (window.loadImportSessions) window.loadImportSessions();
    }

    renderCurrentViewData();

};

window.switchNonKirTab = function(tabName) {
    currentNonKirTab = tabName;
    updateNonKirTabUI();
    renderNonKirTable(globalAssets);
};

// Realtime subscriptions
supabaseClient
  .channel('public:assets')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
      console.log('Realtime change in assets, reloading...');
      loadAllData();
  })
  .subscribe();

supabaseClient
  .channel('public:master_bmd')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'master_bmd' }, () => {
      console.log('Realtime change in master_bmd, reloading...');
      loadAllData();
  })
  .subscribe();

document.addEventListener('DOMContentLoaded', () => {
    // Customize UI based on mode
    const isDemo = localStorage.getItem('simbar.isDemo') === 'true';
    if (isDemo) {
        const emailEl = document.getElementById('user-email-display');
        if (emailEl) emailEl.textContent = 'demo@kesbangpol.id';
        const badgeEl = document.getElementById('demo-badge');
        if (badgeEl) badgeEl.classList.remove('hidden');
    } else {
        const localSessionRaw = localStorage.getItem('supabase.session');
        if (localSessionRaw) {
            try {
                const session = JSON.parse(localSessionRaw);
                const email = session?.user?.email;
                if (email) {
                    const emailEl = document.getElementById('user-email-display');
                    if (emailEl) emailEl.textContent = email;
                }
            } catch (e) {}
        }
    }

    loadAllData();
    switchView(currentView);
    
    // Listen to AI toggle checkbox to show/hide API key input wrapper
    document.getElementById('use-gemini-ai')?.addEventListener('change', (e) => {
        const keyWrapper = document.getElementById('gemini-key-input-wrapper');
        if (keyWrapper) {
            if (e.target.checked) {
                keyWrapper.classList.remove('hidden');
            } else {
                keyWrapper.classList.add('hidden');
            }
        }
    });
});

// Polyfills / Recreated functions for UI and data handling
window.checkDatabaseTables = async function() {
    try {
        const { data, error } = await supabaseClient.from('master_bmd').select('id').limit(1);
        if (error && error.code === '42P01') {
            const alertBox = document.getElementById('supabase-setup-alert');
            if (alertBox) alertBox.classList.remove('hidden');
        }
    } catch (e) {
        console.error('Check tables error:', e);
    }
};

window.renderCurrentViewData = function() {
    if (currentView === 'dashboard') {
        if (typeof updateDashboardStats === 'function') updateDashboardStats(globalAssets);

    } else if (currentView === 'master-bmd') {
        if (typeof renderBmdTable === 'function') renderBmdTable(globalMasterBmd);
    } else if (currentView === 'manajemen-kir') {
        if (typeof loadKirRoomData === 'function') loadKirRoomData();
    } else if (currentView === 'non-kir') {
        if (typeof renderNonKirTable === 'function') renderNonKirTable(globalAssets);
    } else if (currentView === 'usul-hapus') {
        if (typeof renderUsulHapusTable === 'function') renderUsulHapusTable(globalAssets);
    } else if (currentView === 'riwayat-penghapusan') {
        if (typeof renderRiwayatPenghapusanTable === 'function') renderRiwayatPenghapusanTable(globalAssets);
    } else if (currentView === 'laporan') {
        if (typeof renderRekapTable === 'function') renderRekapTable(globalAssets);
    }
};

window.populateAllRoomSelects = function() {
    populateRoomSelects();
};

window.populateRoomSelects = function() {
    const rooms = getActiveRooms(globalAssets);
    
    // Tentukan pemetaan nama representatif kategori khusus (tanpa emoji)
    const SPECIAL_ROOM_MAP = {
        'Aset Non-KIR': 'Aset Cadangan (Gudang)',
        'Kendaraan Dinas': 'Kendaraan Dinas (Operasional)',
        'Masih Harus Dicari': 'Masih Harus Dicari (Pelacakan)'
    };
    
    const physicalRooms = rooms.filter(r => !SPECIAL_ROOM_MAP[r]);
    const specialRooms = rooms.filter(r => SPECIAL_ROOM_MAP[r]);
    
    // 1. Populate standard selectors
    const standardSelects = ['kir-room-select', 'rekap-rooms', 'bulk-ruangan', 'map-ruangan'];
    standardSelects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        
        // Group 1: Ruangan Fisik
        const groupPhysical = document.createElement('optgroup');
        groupPhysical.label = 'RUANGAN KANTOR (FISIK)';
        physicalRooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            groupPhysical.appendChild(opt);
        });
        select.appendChild(groupPhysical);
        
        // Group 2: Kategori Khusus
        if (specialRooms.length > 0) {
            const groupSpecial = document.createElement('optgroup');
            groupSpecial.label = 'KATEGORI KHUSUS / LUAR RUANG';
            specialRooms.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = SPECIAL_ROOM_MAP[r] || r;
                groupSpecial.appendChild(opt);
            });
            select.appendChild(groupSpecial);
        }
        
        // Append special options untuk map-ruangan
        if (id === 'map-ruangan') {
            const specialOpt = document.createElement('option');
            specialOpt.value = '__DATA_INDUK__';
            specialOpt.textContent = 'Kembalikan ke Data Induk (Master)';
            specialOpt.style.backgroundColor = '#e9d5ff';
            specialOpt.style.color = '#6b21a8';
            specialOpt.style.fontWeight = 'bold';
            select.appendChild(specialOpt);
        }
        
        if (currentVal && (rooms.includes(currentVal) || (id === 'map-ruangan' && currentVal === '__DATA_INDUK__'))) {
            select.value = currentVal;
        } else if (rooms.length > 0) {
            select.value = rooms[0];
        }
    });
    
    // 2. Populate edit-ruangan selector
    const editSelect = document.getElementById('edit-ruangan');
    if (editSelect) {
        const currentVal = editSelect.value;
        editSelect.innerHTML = '';
        
        // Group 1: Ruangan Fisik
        const groupPhysical = document.createElement('optgroup');
        groupPhysical.label = 'RUANGAN KANTOR (FISIK)';
        physicalRooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            groupPhysical.appendChild(opt);
        });
        editSelect.appendChild(groupPhysical);
        
        // Group 2: Kategori Khusus
        const groupSpecial = document.createElement('optgroup');
        groupSpecial.label = 'KATEGORI KHUSUS / LUAR RUANG';
        specialRooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = SPECIAL_ROOM_MAP[r] || r;
            groupSpecial.appendChild(opt);
        });
        editSelect.appendChild(groupSpecial);
        
        // Add action option
        const optMaster = document.createElement('option');
        optMaster.value = '__DATA_INDUK__';
        optMaster.textContent = '[Aksi] Kembalikan ke Data Induk (Master)';
        optMaster.style.backgroundColor = '#e9d5ff';
        optMaster.style.color = '#6b21a8';
        optMaster.style.fontWeight = 'bold';
        editSelect.appendChild(optMaster);
        
        if (currentVal) {
            editSelect.value = currentVal;
        }
    }
    
    // 3. Render Custom Dropdown UI Facade
    renderCustomRoomDropdown(physicalRooms, specialRooms, SPECIAL_ROOM_MAP);
};

// Logika rendering & kontrol custom dropdown
const CUSTOM_ROOM_ICONS = {
    'office': `<svg class="w-5 h-5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`,
    'Aset Non-KIR': `<svg class="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`,
    'Kendaraan Dinas': `<svg class="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1"></path></svg>`,
    'Masih Harus Dicari': `<svg class="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`
};

function renderCustomRoomDropdown(physicalRooms, specialRooms, nameMap) {
    const listPhysical = document.getElementById('custom-room-physical-list');
    const listSpecial = document.getElementById('custom-room-special-list');
    const nativeSelect = document.getElementById('kir-room-select');
    
    if (!listPhysical || !listSpecial || !nativeSelect) return;
    
    listPhysical.innerHTML = '';
    listSpecial.innerHTML = '';
    
    const activeVal = nativeSelect.value;
    
    // Helper untuk membuat item dropdown
    const createItem = (value, displayName, iconHtml) => {
        const div = document.createElement('div');
        const isActive = value === activeVal;
        
        div.className = `flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-bold ${
            isActive 
                ? 'bg-blue-100/80 text-blue-900 shadow-sm border border-blue-200/50' 
                : 'text-textMain hover:bg-slate-100 hover:text-blue-950'
        }`;
        
        div.innerHTML = `
            ${iconHtml}
            <span class="flex-1">${displayName}</span>
            ${isActive ? `<svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>` : ''}
        `;
        
        div.onclick = () => {
            selectCustomRoom(value, displayName, iconHtml);
        };
        return div;
    };
    
    // 1. Render Ruangan Fisik
    physicalRooms.forEach(r => {
        const item = createItem(r, r, CUSTOM_ROOM_ICONS['office']);
        listPhysical.appendChild(item);
    });
    
    // 2. Render Kategori Khusus
    specialRooms.forEach(r => {
        const iconHtml = CUSTOM_ROOM_ICONS[r] || CUSTOM_ROOM_ICONS['office'];
        const displayName = nameMap[r] ? nameMap[r].replace(/^[^\s]+\s*/, '') : r; // Bersihkan emoji awalan jika ada
        const item = createItem(r, displayName, iconHtml);
        listSpecial.appendChild(item);
    });
    
    // 3. Set label terpilih pada tombol utama saat pertama load/sync
    const currentOption = nativeSelect.options[nativeSelect.selectedIndex];
    if (currentOption) {
        const rawVal = currentOption.value;
        const displayName = nameMap[rawVal] ? nameMap[rawVal].replace(/^[^\s]+\s*/, '') : rawVal;
        const iconHtml = CUSTOM_ROOM_ICONS[rawVal] || CUSTOM_ROOM_ICONS['office'];
        
        const labelContainer = document.getElementById('custom-room-dropdown-selected-label');
        if (labelContainer) {
            labelContainer.innerHTML = `${iconHtml}<span>${displayName}</span>`;
        }
    }
}

window.toggleCustomRoomDropdown = function() {
    const menu = document.getElementById('custom-room-dropdown-menu');
    const chevron = document.getElementById('custom-room-dropdown-chevron');
    if (!menu) return;
    
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
    } else {
        menu.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
    }
};

window.selectCustomRoom = function(value, displayName, iconHtml) {
    const nativeSelect = document.getElementById('kir-room-select');
    if (!nativeSelect) return;
    
    nativeSelect.value = value;
    
    // Trigger onchange event pada select native
    const event = new Event('change');
    nativeSelect.dispatchEvent(event);
    
    // Update label utama tombol
    const labelContainer = document.getElementById('custom-room-dropdown-selected-label');
    if (labelContainer) {
        labelContainer.innerHTML = `${iconHtml}<span>${displayName}</span>`;
    }
    
    // Tutup menu dropdown
    const menu = document.getElementById('custom-room-dropdown-menu');
    const chevron = document.getElementById('custom-room-dropdown-chevron');
    if (menu) menu.classList.add('hidden');
    if (chevron) chevron.classList.remove('rotate-180');
    
    // Render ulang list untuk memperbarui status active item centang
    populateRoomSelects();
};

// Tutup dropdown jika mengklik di luar area container
document.addEventListener('click', (e) => {
    const container = document.getElementById('custom-room-dropdown-container');
    const menu = document.getElementById('custom-room-dropdown-menu');
    const chevron = document.getElementById('custom-room-dropdown-chevron');
    
    if (container && !container.contains(e.target) && menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
    }
});

window.updateNonKirTabUI = function() {
    const tabs = ['non-kir', 'kendaraan', 'umum', 'search', 'gift'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        if (!btn) return;
        if (tab === currentNonKirTab) {
            btn.classList.add('bg-blue-100', 'text-blue-800', 'shadow-clay-pressed');
            btn.classList.remove('bg-surface', 'text-textMuted');
        } else {
            btn.classList.remove('bg-blue-100', 'text-blue-800', 'shadow-clay-pressed');
            btn.classList.add('bg-surface', 'text-textMuted');
        }
    });
};

window.logoutAdmin = async function() {
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    try {
        if (typeof supabaseClient !== 'undefined' && typeof supabaseClient.auth !== 'undefined') {
            await supabaseClient.auth.signOut();
        }
    } catch (err) {
        console.error('Error saat logout:', err);
    }
    
    // Clear auth and demo states
    localStorage.removeItem('supabase.session');
    localStorage.removeItem('simbar.isDemo');
    localStorage.removeItem('simbar.demo.assets');
    localStorage.removeItem('simbar.demo.master_bmd');
    localStorage.removeItem('simbar.demo.riwayat_barang');
    localStorage.removeItem('simbar.demo.verification_queue');
    localStorage.removeItem('simbar.demo.import_sessions');
    
    window.location.href = 'login.html';
};

window.toggleSidebarGroup = function(groupId, forceState) {
    const subGroup = document.getElementById(`sub-group-${groupId}`);
    const chevron = document.getElementById(`chevron-group-${groupId}`);
    if (!subGroup) return;
    
    let isHidden = subGroup.classList.contains('hidden');
    
    if (forceState === 'open') {
        isHidden = true; // force remove hidden
    } else if (forceState === 'close') {
        isHidden = false; // force add hidden
    }
    
    if (isHidden) {
        subGroup.classList.remove('hidden');
        if (chevron) {
            chevron.classList.add('rotate-180');
        }
    } else {
        subGroup.classList.add('hidden');
        if (chevron) {
            chevron.classList.remove('rotate-180');
        }
    }
};
