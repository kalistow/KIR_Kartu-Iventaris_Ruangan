// assets/js/components/riwayatPenghapusan.js

let currentRiwayatPenghapusanTab = 'Dimusnahkan';

window.switchRiwayatPenghapusanTab = function(tabName) {
    currentRiwayatPenghapusanTab = tabName;
    updateRiwayatPenghapusanTabUI();
    renderRiwayatPenghapusanTable(globalAssets);
};

function updateRiwayatPenghapusanTabUI() {
    const tabs = ['Dimusnahkan', 'Dihibahkan', 'Dilelang'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`tab-riwayat-${tab.toLowerCase()}`);
        if (btn) {
            if (tab === currentRiwayatPenghapusanTab) {
                btn.classList.add('bg-white', 'shadow-clay');
                btn.classList.remove('text-textMuted');
                btn.classList.add('text-textMain');
            } else {
                btn.classList.remove('bg-white', 'shadow-clay');
                btn.classList.add('text-textMuted');
                btn.classList.remove('text-textMain');
            }
        }
    });
}

function renderRiwayatPenghapusanTable(assets) {
    const tbody = document.getElementById('riwayat-penghapusan-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let filteredAssets = assets.filter(a => a.status === currentRiwayatPenghapusanTab);
    
    const searchVal = document.getElementById('search-riwayat-penghapusan')?.value.toLowerCase() || '';
    if (searchVal) {
        filteredAssets = filteredAssets.filter(a => 
            (a.kode_barang && a.kode_barang.toLowerCase().includes(searchVal)) ||
            (a.nama_barang && a.nama_barang.toLowerCase().includes(searchVal)) ||
            (a.merk_model && a.merk_model.toLowerCase().includes(searchVal))
        );
    }
    
    let emptyMsg = "Tidak ada data riwayat penghapusan.";
    let badgeHtml = '';
    
    if (currentRiwayatPenghapusanTab === 'Dimusnahkan') {
        emptyMsg = "Belum ada aset yang dimusnahkan.";
        badgeHtml = '<span class="bg-red-100 text-red-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-red-300">Dimusnahkan</span>';
    } else if (currentRiwayatPenghapusanTab === 'Dihibahkan') {
        emptyMsg = "Belum ada aset yang dihibahkan.";
        badgeHtml = '<span class="bg-green-100 text-green-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-green-300">Dihibahkan</span>';
    } else if (currentRiwayatPenghapusanTab === 'Dilelang') {
        emptyMsg = "Belum ada aset yang dilelang.";
        badgeHtml = '<span class="bg-blue-100 text-blue-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-blue-300">Dilelang</span>';
    }

    if (filteredAssets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-10 text-textMuted">${emptyMsg}</td></tr>`;
        return;
    }
    
    filteredAssets.forEach((a, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/30 hover:bg-white/20 transition-colors';
        
        tr.innerHTML = `
            <td class="py-4 px-4 whitespace-nowrap text-center">${index + 1}</td>
            <td class="py-4 px-4 whitespace-nowrap">${a.kode_barang || '-'}</td>
            <td class="py-4 px-4 font-extrabold text-gray-900">${a.nama_barang || '-'}</td>
            <td class="py-4 px-4 text-textMuted">${a.merk_model || '-'}</td>
            <td class="py-4 px-4">${a.no_seri || '-'}</td>
            <td class="py-4 px-4 text-center">${a.tahun || '-'}</td>
            <td class="py-4 px-4 text-center">${a.jumlah || 1}</td>
            <td class="py-4 px-4 text-right text-blue-900">Rp ${fmt(a.harga)}</td>
            <td class="py-4 px-4 text-center">${badgeHtml}</td>
            <td class="py-4 px-4 text-center">
                <button onclick="openRiwayatSistem('${a.id}')" class="clay-btn px-4 py-2 flex items-center justify-center gap-2 w-full !shadow-clay-sm text-gray-700 hover:text-gray-900 font-extrabold text-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Histori
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.handleSearchRiwayatPenghapusan = function() {
    renderRiwayatPenghapusanTable(globalAssets);
};

// Initialize UI
updateRiwayatPenghapusanTabUI();
