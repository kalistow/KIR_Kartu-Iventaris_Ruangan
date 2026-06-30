// assets/js/components/usulHapus.js

function renderUsulHapusTable(assets) {
    const tbody = document.getElementById('usul-hapus-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const usulHapusAssets = assets.filter(a => a.status === 'Usul Penghapusan');
    
    // Clear selection of IDs that are no longer in this filtered list
    const usulHapusAssetIds = usulHapusAssets.map(a => a.id);
    for (let id of selectedUsulHapusAssetIds) {
        if (!usulHapusAssetIds.includes(id)) {
            selectedUsulHapusAssetIds.delete(id);
        }
    }
    
    const searchVal = document.getElementById('search-usul-hapus')?.value.toLowerCase() || '';
    const filtered = usulHapusAssets.filter(a => 
        (a.kode_barang && a.kode_barang.toLowerCase().includes(searchVal)) ||
        (a.nama_barang && a.nama_barang.toLowerCase().includes(searchVal)) ||
        (a.merk_model && a.merk_model.toLowerCase().includes(searchVal))
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="text-center py-10 text-textMuted">Tidak ada data usul penghapusan.</td></tr>';
        updateUsulHapusBulkButton();
        return;
    }
    
    filtered.forEach((a, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/30 hover:bg-white/20 transition-colors bg-red-50/50';
        const isSelected = selectedUsulHapusAssetIds.has(a.id);
        
        tr.innerHTML = `
            <td class="py-4 px-2 text-center"><input type="checkbox" class="usul-hapus-checkbox w-4 h-4 cursor-pointer" value="${a.id}" ${isSelected ? 'checked' : ''} onchange="updateUsulHapusSelection()"></td>
            <td class="py-4 px-4 whitespace-nowrap text-center">${index + 1}</td>
            <td class="py-4 px-4 whitespace-nowrap">${a.kode_barang || '-'}</td>
            <td class="py-4 px-4 font-extrabold text-gray-900">${a.nama_barang || '-'}</td>
            <td class="py-4 px-4 text-textMuted">${a.merk_model || '-'}</td>
            <td class="py-4 px-4">${a.no_seri || '-'}</td>
            <td class="py-4 px-4">${a.ukuran || '-'}</td>
            <td class="py-4 px-4">${a.bahan || '-'}</td>
            <td class="py-4 px-4 text-center">${a.tahun || '-'}</td>
            <td class="py-4 px-4 text-center">${a.jumlah || 1}</td>
            <td class="py-4 px-4 text-right text-blue-900">Rp ${fmt(a.harga)}</td>
            <td class="py-4 px-4 text-center">${badgeForKondisi(a.kondisi)}</td>
            <td class="py-4 px-4 text-center">
                <span class="bg-pastel-red text-red-800 py-1.5 px-3 rounded-full text-xs font-black border border-red-300 shadow-sm">Usul Penghapusan</span>
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
    
    updateUsulHapusBulkButton();
}

window.handleSearchUsulHapus = function() {
    renderUsulHapusTable(globalAssets);
};

window.toggleSelectAllUsulHapus = function(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.usul-hapus-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = masterCheckbox.checked;
        const id = parseInt(cb.value);
        if (masterCheckbox.checked) {
            selectedUsulHapusAssetIds.add(id);
        } else {
            selectedUsulHapusAssetIds.delete(id);
        }
    });
    window.updateUsulHapusBulkButton();
};

window.updateUsulHapusSelection = function() {
    const checkboxes = document.querySelectorAll('.usul-hapus-checkbox');
    let allChecked = true;
    let anyChecked = false;
    
    checkboxes.forEach(cb => {
        const id = parseInt(cb.value);
        if (cb.checked) {
            selectedUsulHapusAssetIds.add(id);
            anyChecked = true;
        } else {
            selectedUsulHapusAssetIds.delete(id);
            allChecked = false;
        }
    });
    
    const masterCheck = document.getElementById('select-all-usul-hapus');
    if (masterCheck) {
        masterCheck.checked = checkboxes.length > 0 && allChecked;
    }
    
    window.updateUsulHapusBulkButton();
};

window.updateUsulHapusBulkButton = function() {
    const btn = document.getElementById('btn-bulk-delete-usul-hapus');
    const countSpan = document.getElementById('bulk-delete-usul-hapus-count');
    if (btn && countSpan) {
        const count = selectedUsulHapusAssetIds.size;
        countSpan.textContent = count;
        if (count > 0) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }
    
    // Sync master checkbox state on render
    const checkboxes = document.querySelectorAll('.usul-hapus-checkbox');
    const masterCheck = document.getElementById('select-all-usul-hapus');
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
