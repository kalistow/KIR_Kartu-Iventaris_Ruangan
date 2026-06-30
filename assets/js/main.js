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

const VIEWS = ['dashboard', 'master-bmd', 'manajemen-kir', 'non-kir', 'usul-hapus', 'riwayat-penghapusan', 'laporan', 'riwayat-sistem'];

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
  "Ruang Kabid Wasnas"
];

function getActiveRooms(assets = globalAssets) {
    const customRooms = JSON.parse(localStorage.getItem('simbar.custom_rooms') || '[]');
    const deletedRooms = JSON.parse(localStorage.getItem('simbar.deleted_rooms') || '[]');
    const assetRooms = [...new Set(assets.map(a => a.ruangan))].filter(r => r && r !== 'Aset Non-KIR' && r !== 'Masih Harus Dicari' && r !== 'Barang yang Dihibahkan' && r !== 'Kendaraan Dinas' && r !== 'Depan Bidang' && r !== 'Inventaris Kantor');
    
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-textMuted">Belum ada riwayat aktivitas.</td></tr>';
        return;
    }
    
    data.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/20 hover:bg-white/10 transition-colors';
        
        // Find corresponding asset name
        const asset = globalAssets.find(a => a.id == r.asset_id);
        const assetName = asset ? asset.nama_barang : `Aset ID: ${r.asset_id}`;
        const formattedDate = new Date(r.tanggal).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        
        const assetNameEscaped = String(assetName || 'Aset').replace(/'/g, "\\'");
        const jenisEscaped = String(r.jenis_perubahan || 'Aktivitas').replace(/'/g, "\\'");
        
        tr.innerHTML = `
            <td class="py-3 px-4">${formattedDate}</td>
            <td class="py-3 px-4 font-bold text-gray-900">${assetName}</td>
            <td class="py-3 px-4"><span class="clay-btn px-3 py-1 text-xs inline-block bg-pastel-blue/20">${r.jenis_perubahan}</span></td>
            <td class="py-3 px-4 text-xs italic text-textMuted" title="${r.keterangan || ''}">${r.keterangan || '-'}</td>
            <td class="py-3 px-4 text-center">
                <button onclick="undoAktivitas('${r.id}', '${r.asset_id}', '${jenisEscaped}', '${assetNameEscaped}')" class="text-orange-500 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 mx-auto transition-colors shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                    Restore
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Supabase fetch riwayat error:', e);
  }
}

// Fitur Undo/Restore untuk Riwayat
window.undoAktivitas = async function(riwayatId, assetId, jenisPerubahan, assetName) {
    // Hanya Pemetaan yang dapat di-undo secara otomatis dengan menghapus aset dari ruangan (kembali ke Master)
    if (jenisPerubahan.includes('Pemetaan') || jenisPerubahan === 'Penerimaan Gudang') {
        if (!confirm(`Apakah Anda yakin ingin membatalkan (Undo) aktivitas "${jenisPerubahan}" untuk barang "${assetName}"?\n\nIni akan menghapus barang tersebut dari ruangan saat ini dan mengembalikannya ke Master BMD (Data Induk).`)) {
            return;
        }

        try {
            // Log the undo action
            await supabaseClient.from('riwayat_barang').insert([{
                asset_id: assetId,
                jenis_perubahan: 'Undo / Restore Aktivitas',
                keterangan: `Aktivitas "${jenisPerubahan}" dibatalkan. "${assetName}" dikembalikan ke Data Induk.`,
                tanggal: new Date().toISOString()
            }]);
            
            // Hapus aset dari table assets agar kembali unmapped
            const { error } = await supabaseClient.from('assets').delete().eq('id', assetId);
            if (error) throw error;
            
            await loadAllData();
            showToast('Aktivitas berhasil di-undo! Barang telah dikembalikan ke Data Induk.', 'success');
        } catch (err) {
            console.error('Undo error:', err);
            showToast('Gagal melakukan Undo: ' + err.message, 'error');
        }
    } else {
        // Untuk Edit Data, Hapus, dll yang tidak bisa di-undo secara terbalik karena butuh historical JSON
        showToast(`Maaf, fitur Restore otomatis tidak tersedia untuk jenis aktivitas "${jenisPerubahan}".`, 'warning');
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

