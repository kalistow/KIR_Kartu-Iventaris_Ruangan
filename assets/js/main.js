// assets/js/main.js

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

const VIEWS = [
    'dashboard', 'master-bmd', 'manajemen-kir', 'gudang-transit', 'non-kir', 'usul-hapus', 'laporan'
];

// Official room list
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
  "Gudang Transit"
];

function getActiveRooms(assets = globalAssets) {
    const customRooms = JSON.parse(localStorage.getItem('simbar.custom_rooms') || '[]');
    const deletedRooms = JSON.parse(localStorage.getItem('simbar.deleted_rooms') || '[]');
    const assetRooms = [...new Set(assets.map(a => a.ruangan))].filter(r => r && r !== 'Gudang Transit' && r !== 'Aset Non-KIR' && r !== 'Masih Harus Dicari' && r !== 'Barang yang Dihibahkan' && r !== 'Kendaraan Dinas' && r !== 'Depan Bidang' && r !== 'Inventaris Kantor');
    
    // Combine official, custom, and asset rooms (deduplicated)
    const combined = Array.from(new Set([
        ...OFFICIAL_ROOMS.filter(r => r !== 'Gudang Transit'),
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
        
        tr.innerHTML = `
            <td class="py-3 px-4">${formattedDate}</td>
            <td class="py-3 px-4 font-bold text-gray-900">${assetName}</td>
            <td class="py-3 px-4"><span class="clay-btn px-3 py-1 text-xs inline-block bg-pastel-blue/20">${r.jenis_perubahan}</span></td>
            <td class="py-3 px-4 text-xs italic text-textMuted" title="${r.keterangan || ''}">${r.keterangan || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Supabase fetch riwayat error:', e);
  }
}

window.switchView = function(viewName) {
    if (!VIEWS.includes(viewName)) return;
    
    currentView = viewName;

    const importBtnHeader = document.getElementById('import-btn-header');
    if (importBtnHeader) {
        if (viewName === 'master-bmd') {
            importBtnHeader.classList.remove('hidden');
        } else {
            importBtnHeader.classList.add('hidden');
        }
    }

    VIEWS.forEach(item => {
        const btn = document.getElementById(`nav-${item}`);
        if (btn) {
            if (item === viewName) {
                btn.className = "clay-btn py-3 px-5 flex items-center gap-3 text-textMain !shadow-clay-pressed !bg-surface/80 w-full text-left";
                btn.querySelector('svg').className.baseVal = "w-5 h-5 text-blue-600";
            } else {
                btn.className = "clay-btn py-3 px-5 flex items-center gap-3 text-textMuted hover:text-textMain w-full text-left";
                btn.querySelector('svg').className.baseVal = "w-5 h-5 text-gray-500";
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
    } else if (viewName === 'gudang-transit') {
        title.textContent = 'Gudang Transit';
        desc.textContent = 'Area penempatan awal untuk aset baru atau yang perlu verifikasi';
    } else if (viewName === 'non-kir') {
        title.textContent = 'Aset Non-KIR';
        desc.textContent = 'Daftar aset cadangan, belum dialokasikan, atau yang tidak berada di ruangan resmi';
        currentNonKirTab = 'non-kir';
        updateNonKirTabUI();
    } else if (viewName === 'usul-hapus') {
        title.textContent = 'Usul Penghapusan';
        desc.textContent = 'Daftar aset yang diusulkan untuk dihapus dari inventaris';
    } else if (viewName === 'laporan') {
        title.textContent = 'Laporan & Cetak Rekap';
        desc.textContent = 'Rekapitulasi total aset per ruangan and export format resmi';
        populateRoomSelects();
    }

    renderCurrentViewData();
    checkPesanMasuk();
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
    loadAllData();
    
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
        if (typeof checkPesanMasuk === 'function') checkPesanMasuk();
    } else if (currentView === 'master-bmd') {
        if (typeof renderBmdTable === 'function') renderBmdTable(globalMasterBmd);
    } else if (currentView === 'manajemen-kir') {
        if (typeof loadKirRoomData === 'function') loadKirRoomData();
    } else if (currentView === 'gudang-transit') {
        if (typeof renderTransitTable === 'function') renderTransitTable(globalAssets);
    } else if (currentView === 'non-kir') {
        if (typeof renderNonKirTable === 'function') renderNonKirTable(globalAssets);
    } else if (currentView === 'usul-hapus') {
        if (typeof renderUsulHapusTable === 'function') renderUsulHapusTable(globalAssets);
    } else if (currentView === 'laporan') {
        if (typeof renderRekapTable === 'function') renderRekapTable(globalAssets);
    }
};

window.populateAllRoomSelects = function() {
    populateRoomSelects();
};

window.populateRoomSelects = function() {
    const rooms = getActiveRooms(globalAssets);
    const selects = ['kir-room-select', 'rekap-rooms'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        rooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            select.appendChild(opt);
        });
        if (currentVal && rooms.includes(currentVal)) {
            select.value = currentVal;
        } else if (rooms.length > 0) {
            select.value = rooms[0];
        }
    });
};

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

