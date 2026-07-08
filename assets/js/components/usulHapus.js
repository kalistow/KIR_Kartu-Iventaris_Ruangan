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
                <button onclick="cancelUsulHapus(${a.id})" class="clay-btn px-4 py-2 flex items-center justify-center gap-2 w-full !shadow-clay-sm text-gray-700 hover:text-gray-950 font-extrabold text-xs mb-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Batal
                </button>
                <button onclick="openExecuteHapusModal(${a.id})" class="clay-btn px-4 py-2 flex items-center justify-center gap-2 w-full !shadow-clay-sm text-orange-700 hover:text-orange-900 font-extrabold text-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                    Eksekusi
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
    const btnCancel = document.getElementById('btn-bulk-cancel-usul-hapus');
    if (btn && countSpan) {
        const count = selectedUsulHapusAssetIds.size;
        countSpan.textContent = count;
        if (count > 0) {
            btn.classList.remove('hidden');
            if(btnCancel) btnCancel.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
            if(btnCancel) btnCancel.classList.add('hidden');
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

window.cancelUsulHapus = async function(id) {
    if (!confirm('Batalkan usul penghapusan untuk barang ini?')) return;
    await processCancelUsulHapus([id]);
};

window.cancelBulkUsulHapus = async function() {
    if (selectedUsulHapusAssetIds.size === 0) return;
    if (!confirm(`Batalkan usul penghapusan untuk ${selectedUsulHapusAssetIds.size} barang terpilih?`)) return;
    await processCancelUsulHapus(Array.from(selectedUsulHapusAssetIds));
};

async function processCancelUsulHapus(ids) {
    try {
        // Prepare bulk update based on each asset's original room
        const assetsToUpdate = globalAssets.filter(a => ids.includes(a.id));
        
        // Group by new status
        const updatesByStatus = {};
        for (let asset of assetsToUpdate) {
            let newStatus = 'KIR';
            if (['Aset Non-KIR', 'Kendaraan Dinas', 'Inventaris Kantor', 'Depan Bidang'].includes(asset.ruangan)) {
                newStatus = 'Non-KIR';
            } else if (asset.ruangan === 'Masih Harus Dicari') {
                newStatus = 'Masih Harus Dicari';
            } else if (asset.ruangan === 'Barang yang Dihibahkan') {
                newStatus = 'Dihibahkan';
            } else if (asset.ruangan === 'Belum Terpetakan') {
                newStatus = 'Belum Terpetakan';
            }
            
            if (!updatesByStatus[newStatus]) updatesByStatus[newStatus] = [];
            updatesByStatus[newStatus].push(asset.id);
        }
        
        // Execute updates
        for (let status in updatesByStatus) {
            const { error } = await supabaseClient.from('assets').update({ status: status }).in('id', updatesByStatus[status]);
            if (error) throw error;
        }
        
        // Insert history
        const history = ids.map(id => {
            return {
                asset_id: id,
                jenis_perubahan: 'Batal Usul Penghapusan',
                keterangan: 'Membatalkan usul penghapusan dan mengembalikan status ke kondisi semula.',
                tanggal: new Date().toISOString()
            };
        });
        await supabaseClient.from('riwayat_barang').insert(history);
        
        selectedUsulHapusAssetIds.clear();
        await loadAllData();
        showToast('Berhasil membatalkan usulan penghapusan.', 'success');
    } catch (err) {
        console.error('Cancel Usul Hapus Error:', err);
        showToast('Gagal membatalkan usulan: ' + err.message, 'error');
    }
}

// Ekspos fungsi ke global scope
window.renderUsulHapusTable = renderUsulHapusTable;
