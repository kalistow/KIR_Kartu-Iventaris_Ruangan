// assets/js/components/nonKir.js

/**
 * Merender tabel aset non-KIR berdasarkan data aset yang masuk dan tab filter yang aktif.
 * @param {Array<Object>} assets - Daftar aset dari database.
 */
function renderNonKirTable(assets) {
    const tbody = document.getElementById('non-kir-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let nonKirAssets = [];
    let emptyMsg = "Tidak ada data aset Non-KIR.";
    let badgeHtml = '<span class="bg-blue-100 text-blue-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-blue-300">Non-KIR</span>';
    
    if (currentNonKirTab === 'kendaraan') {
        nonKirAssets = assets.filter(a => a.ruangan === 'Kendaraan Dinas');
        emptyMsg = "Tidak ada data kendaraan dinas.";
        badgeHtml = '<span class="bg-red-100 text-red-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-red-300">Kendaraan</span>';
    } else if (currentNonKirTab === 'umum') {
        nonKirAssets = assets.filter(a => a.ruangan === 'Depan Bidang' || a.ruangan === 'Inventaris Kantor');
        emptyMsg = "Tidak ada data inventaris umum/luar ruangan.";
        badgeHtml = '<span class="bg-indigo-100 text-indigo-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-indigo-300">Umum</span>';
    } else if (currentNonKirTab === 'non-kir') {
        nonKirAssets = assets.filter(a => (a.status === 'Tetap di Non-KIR' || a.status === 'Non-KIR' || a.ruangan === 'Aset Non-KIR') && a.ruangan !== 'Kendaraan Dinas' && a.ruangan !== 'Depan Bidang' && a.ruangan !== 'Inventaris Kantor');
        emptyMsg = "Tidak ada data aset cadangan di gudang.";
        badgeHtml = '<span class="bg-blue-100 text-blue-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-blue-300">Cadangan</span>';
    } else if (currentNonKirTab === 'search') {
        nonKirAssets = assets.filter(a => a.status === 'Masih Harus Dicari' || a.ruangan === 'Masih Harus Dicari');
        emptyMsg = "Tidak ada data aset yang masih harus dicari.";
        badgeHtml = '<span class="bg-yellow-100 text-yellow-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-yellow-300">Harus Dicari</span>';
    }
    
    // Clear selection of IDs that are no longer in this filtered list
    const nonKirAssetIds = nonKirAssets.map(a => a.id);
    for (let id of selectedNonKirAssetIds) {
        if (!nonKirAssetIds.includes(id)) {
            selectedNonKirAssetIds.delete(id);
        }
    }
    
    const searchVal = document.getElementById('search-non-kir')?.value.toLowerCase() || '';
    const filtered = nonKirAssets.filter(a => 
        (a.kode_barang && a.kode_barang.toLowerCase().includes(searchVal)) ||
        (a.nama_barang && a.nama_barang.toLowerCase().includes(searchVal)) ||
        (a.merk_model && a.merk_model.toLowerCase().includes(searchVal))
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" class="text-center py-10 text-textMuted">${emptyMsg}</td></tr>`;
        updateNonKirBulkButton();
        return;
    }
    
    filtered.forEach((a, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/30 hover:bg-white/20 transition-colors';
        const isSelected = selectedNonKirAssetIds.has(a.id);
        
        const usulBadge = a.status === 'Usul Penghapusan' ? `<br><span class="inline-block mt-1 bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded border border-red-300">Usul Hapus</span>` : '';
        
        tr.innerHTML = `
            <td class="py-4 px-2 text-center"><input type="checkbox" class="non-kir-checkbox w-4 h-4 cursor-pointer" value="${a.id}" ${isSelected ? 'checked' : ''} onchange="updateNonKirSelection()"></td>
            <td class="py-4 px-4 whitespace-nowrap text-center">${index + 1}</td>
            <td class="py-4 px-4 whitespace-nowrap">${a.kode_barang || '-'}</td>
            <td class="py-4 px-4 font-extrabold text-gray-900">${a.nama_barang || '-'}${usulBadge}</td>
            <td class="py-4 px-4 text-textMuted">${a.merk_model || '-'}</td>
            <td class="py-4 px-4">${a.no_seri || '-'}</td>
            <td class="py-4 px-4">${a.ukuran || '-'}</td>
            <td class="py-4 px-4">${a.bahan || '-'}</td>
            <td class="py-4 px-4 text-center">${a.tahun || '-'}</td>
            <td class="py-4 px-4 text-center">${a.jumlah || 1}</td>
            <td class="py-4 px-4 text-right text-blue-900">Rp ${fmt(a.harga)}</td>
            <td class="py-4 px-4 text-center">${badgeForKondisi(a.kondisi)}</td>
            <td class="py-4 px-4 text-center">
                ${badgeHtml}
            </td>
            <td class="py-4 px-4 text-center">
                <button onclick="openEditModal(${a.id})" class="clay-btn px-4 py-2 flex items-center justify-center gap-2 w-full !shadow-clay-sm text-blue-700 hover:text-blue-950 font-extrabold text-xs mb-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    Edit
                </button>
                <button onclick="deleteSingleAsset(${a.id})" class="clay-btn px-4 py-2 flex items-center justify-center gap-2 w-full !shadow-clay-sm text-red-700 hover:text-red-900 font-extrabold text-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    updateNonKirBulkButton();
}

window.handleSearchNonKir = function() {
    renderNonKirTable(globalAssets);
};

/**
 * Mengubah status centang semua checkbox di tabel non-KIR sesuai dengan checkbox master.
 * @param {HTMLInputElement} masterCheckbox - Checkbox master di header tabel.
 */
window.toggleSelectAllNonKir = function(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.non-kir-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = masterCheckbox.checked;
        const id = parseInt(cb.value);
        if (masterCheckbox.checked) {
            selectedNonKirAssetIds.add(id);
        } else {
            selectedNonKirAssetIds.delete(id);
        }
    });
    window.updateNonKirBulkButton();
};

/**
 * Memperbarui state pilihan aset non-KIR yang sedang dicentang.
 * Sinkronisasi dengan checkbox master juga dilakukan di sini.
 */
window.updateNonKirSelection = function() {
    const checkboxes = document.querySelectorAll('.non-kir-checkbox');
    let allChecked = true;
    let anyChecked = false;
    
    checkboxes.forEach(cb => {
        const id = parseInt(cb.value);
        if (cb.checked) {
            selectedNonKirAssetIds.add(id);
            anyChecked = true;
        } else {
            selectedNonKirAssetIds.delete(id);
            allChecked = false;
        }
    });
    
    const masterCheck = document.getElementById('select-all-nonkir');
    if (masterCheck) {
        masterCheck.checked = checkboxes.length > 0 && allChecked;
    }
    
    window.updateNonKirBulkButton();
};

/**
 * Memperbarui tampilan tombol aksi massal (bulk delete) berdasarkan jumlah aset yang dicentang.
 */
window.updateNonKirBulkButton = function() {
    const btn = document.getElementById('btn-bulk-delete-nonkir');
    const countSpan = document.getElementById('bulk-delete-nonkir-count');
    if (btn && countSpan) {
        const count = selectedNonKirAssetIds.size;
        countSpan.textContent = count;
        if (count > 0) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }
    
    // Sync master checkbox state on render
    const checkboxes = document.querySelectorAll('.non-kir-checkbox');
    const masterCheck = document.getElementById('select-all-nonkir');
    if (masterCheck && checkboxes.length > 0) {
        let allChecked = true;
        checkboxes.forEach(cb => {
            if (!cb.checked) allChecked = false;
        });
        masterCheck.checked = allChecked;
    } else if (masterCheck) {
        masterCheck.checked = false;
    }
};
