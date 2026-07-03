// assets/js/components/kir.js

function renderKirTable(assets) {
    const tbody = document.getElementById('kir-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Filter by selected room
    const roomFiltered = assets.filter(a => a.ruangan === selectedRoom && a.ruangan !== 'Belum Terpetakan');
    
    // Clear selection of IDs that are no longer in this filtered list
    const roomFilteredIds = roomFiltered.map(a => a.id);
    for (let id of selectedKirAssetIds) {
        if (!roomFilteredIds.includes(id)) {
            selectedKirAssetIds.delete(id);
        }
    }
    
    const searchVal = document.getElementById('search-kir')?.value.toLowerCase() || '';
    const filterKondisi = document.getElementById('filter-kir-kondisi')?.value || 'semua';
    
    const filtered = roomFiltered.filter(a => {
        const matchesSearch = 
            (a.kode_barang && a.kode_barang.toLowerCase().includes(searchVal)) ||
            (a.nama_barang && a.nama_barang.toLowerCase().includes(searchVal)) ||
            (a.merk_model && a.merk_model.toLowerCase().includes(searchVal));
            
        if (!matchesSearch) return false;
        
        if (filterKondisi === 'semua') return true;
        return a.kondisi === filterKondisi;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="18" class="text-center py-10 text-textMuted">Tidak ada barang yang memenuhi kriteria filter.</td></tr>';
        updateKirBulkButton();
        return;
    }
    
    filtered.forEach((a, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/30 hover:bg-white/20 transition-colors text-center';
        
        // Lookup NIBAR from Master BMD
        let nibar = '-';
        if (a.master_bmd_id) {
            const linked = globalMasterBmd.find(b => b.id === a.master_bmd_id);
            if (linked) nibar = linked.nibar || '-';
        }
        
        // Split Kode Barang & Register number
        let displayKode = a.kode_barang || '-';
        let displayReg = '-';
        if (a.kode_barang && a.kode_barang.includes('-')) {
            const parts = a.kode_barang.split('-');
            displayKode = parts[0];
            displayReg = parts[1];
        }
        
        // Condition checks
        const isB = a.kondisi === 'Baik' ? `<span class="text-green-600 font-extrabold text-base">✓</span>` : '';
        const isKB = a.kondisi === 'Kurang Baik' ? `<span class="text-yellow-600 font-extrabold text-base">✓</span>` : '';
        const isRB = a.kondisi === 'Rusak Berat' ? `<span class="text-red-600 font-extrabold text-base">✓</span>` : '';
        
        const isSelected = selectedKirAssetIds.has(a.id);
        
        const usulBadge = a.status === 'Usul Penghapusan' ? `<br><span class="inline-block mt-1 bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded border border-red-300">Usul Hapus</span>` : '';
        
        tr.innerHTML = `
            <td class="py-4 px-2 text-center"><input type="checkbox" class="kir-checkbox w-4 h-4 cursor-pointer" value="${a.id}" ${isSelected ? 'checked' : ''} onchange="updateKirSelection()"></td>
            <td class="py-4 px-4 whitespace-nowrap">${index + 1}</td>
            <td class="py-4 px-4 whitespace-nowrap text-xs text-blue-700 font-mono">${nibar}</td>
            <td class="py-4 px-4 whitespace-nowrap">${displayKode}</td>
            <td class="py-4 px-4 whitespace-nowrap">${displayReg}</td>
            <td class="py-4 px-4 font-extrabold text-gray-900 text-left">${a.nama_barang || '-'}${usulBadge}</td>
            <td class="py-4 px-4 text-textMuted text-left">${a.merk_model || '-'}</td>
            <td class="py-4 px-4">${a.no_seri || '-'}</td>
            <td class="py-4 px-4">${a.ukuran || '-'}</td>
            <td class="py-4 px-4">${a.bahan || '-'}</td>
            <td class="py-4 px-4">${a.tahun || '-'}</td>
            <td class="py-4 px-4">${a.jumlah || 1}</td>
            <td class="py-4 px-4 text-right text-blue-900">Rp ${fmt(a.harga)}</td>
            <td class="py-4 px-4 border-l border-white/20">${isB}</td>
            <td class="py-4 px-4 border-l border-white/20">${isKB}</td>
            <td class="py-4 px-4 border-l border-r border-white/20">${isRB}</td>
            <td class="py-4 px-4 text-xs italic text-textMuted text-left max-w-[150px] truncate" title="${a.keterangan || '-'}">${a.keterangan || '-'}</td>
            <td class="py-4 px-4 whitespace-nowrap">
                <button onclick="openEditModal(${a.id})" class="clay-btn p-2.5 !shadow-clay-sm text-blue-600 hover:text-blue-800 mr-1.5" title="Edit / Mutasi Data">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button onclick="deleteSingleAsset(${a.id})" class="clay-btn p-2.5 !shadow-clay-sm text-red-600 hover:text-red-800" title="Hapus Barang">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    updateKirBulkButton();
}

window.loadKirRoomData = function() {
    const select = document.getElementById('kir-room-select');
    if (select) {
        selectedRoom = select.value;
        const label = document.getElementById('room-info-name');
        if (label) label.textContent = selectedRoom;
    }
    
    // Reset condition filter when room changes to avoid showing empty tables
    const filterSelect = document.getElementById('filter-kir-kondisi');
    if (filterSelect) filterSelect.value = 'semua';
    
    renderKirTable(globalAssets);
};

window.handleSearchKir = function() {
    renderKirTable(globalAssets);
};

window.toggleSelectAllKir = function(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.kir-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = masterCheckbox.checked;
        const id = parseInt(cb.value);
        if (masterCheckbox.checked) {
            selectedKirAssetIds.add(id);
        } else {
            selectedKirAssetIds.delete(id);
        }
    });
    window.updateKirBulkButton();
};

window.updateKirSelection = function() {
    const checkboxes = document.querySelectorAll('.kir-checkbox');
    let allChecked = true;
    let anyChecked = false;
    
    checkboxes.forEach(cb => {
        const id = parseInt(cb.value);
        if (cb.checked) {
            selectedKirAssetIds.add(id);
            anyChecked = true;
        } else {
            selectedKirAssetIds.delete(id);
            allChecked = false;
        }
    });
    
    const masterCheck = document.getElementById('select-all-kir');
    if (masterCheck) {
        masterCheck.checked = checkboxes.length > 0 && allChecked;
    }
    
    window.updateKirBulkButton();
};

window.updateKirBulkButton = function() {
    const btn = document.getElementById('btn-bulk-delete-kir');
    const countSpan = document.getElementById('bulk-delete-kir-count');
    const btnTransfer = document.getElementById('btn-bulk-transfer-kir');
    const countSpanTransfer = document.getElementById('bulk-transfer-kir-count');
    
    if (btn && countSpan) {
        const count = selectedKirAssetIds.size;
        countSpan.textContent = count;
        if (count > 0) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }
    
    if (btnTransfer && countSpanTransfer) {
        const count = selectedKirAssetIds.size;
        countSpanTransfer.textContent = count;
        if (count > 0) {
            btnTransfer.classList.remove('hidden');
        } else {
            btnTransfer.classList.add('hidden');
        }
    }
    
    // Sync master checkbox state on render
    const checkboxes = document.querySelectorAll('.kir-checkbox');
    const masterCheck = document.getElementById('select-all-kir');
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

window.openTransferKirModal = function() {
    const count = selectedKirAssetIds.size;
    if (count === 0) return;
    
    document.getElementById('transfer-kir-count').textContent = count;
    
    const roomSelect = document.getElementById('transfer-kir-room');
    roomSelect.innerHTML = '';
    const allRooms = [
        "Ruang Kaban (Kepala Badan)", "Ruang Sekretaris", "Ruang Sekretariat",
        "Ruang Kasubbag Keuangan", "Ruang Kasubbag Umpeg", "Ruang Kasubbag Sunram",
        "Ruang Selasar", "Ruang Rapat", "Ruang Pelayanan", "Ruang Dapur",
        "Ruang Kabid Ideologi", "Ruang Kabid Hansenibud"
    ];
    
    allRooms.forEach(r => {
        if(r !== selectedRoom) {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            roomSelect.appendChild(opt);
        }
    });
    
    document.getElementById('transfer-kir-kondisi').value = 'Baik';
    document.getElementById('transfer-kir-keterangan').value = '';
    
    const modal = document.getElementById('transferKirModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeTransferKirModal = function() {
    const modal = document.getElementById('transferKirModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.executeTransferKir = async function() {
    const targetRoom = document.getElementById('transfer-kir-room').value;
    const kondisi = document.getElementById('transfer-kir-kondisi').value;
    const ket = document.getElementById('transfer-kir-keterangan').value;
    
    if(!targetRoom) {
        if(typeof showToast === 'function') showToast('Pilih ruangan tujuan.', 'warning');
        return;
    }
    
    const btn = document.getElementById('transfer-kir-submit-btn');
    const oriText = btn.innerHTML;
    btn.innerHTML = 'Memindahkan...';
    btn.disabled = true;
    
    try {
        const updates = [];
        const histories = [];
        const now = new Date().toISOString();
        
        selectedKirAssetIds.forEach(id => {
            updates.push({
                id: id,
                ruangan: targetRoom,
                kondisi: kondisi,
                keterangan: ket
            });
            histories.push({
                asset_id: id,
                jenis_perubahan: `Pemindahan ke ${targetRoom}`,
                keterangan: ket,
                tanggal: now
            });
        });
        
        for (const update of updates) {
            const { error: errUpdate } = await supabaseClient.from('assets').update({
                ruangan: update.ruangan,
                kondisi: update.kondisi,
                keterangan: update.keterangan
            }).eq('id', update.id);
            if (errUpdate) throw errUpdate;
        }
        
        const { error: errHist } = await supabaseClient.from('riwayat_barang').insert(histories);
        if (errHist) throw errHist;
        
        if(typeof showToast === 'function') showToast(`Berhasil memindahkan ${updates.length} barang ke ${targetRoom}.`, 'success');
        
        selectedKirAssetIds.clear();
        closeTransferKirModal();
        if(typeof loadAllData === 'function') await loadAllData();
        if(typeof loadKirRoomData === 'function') loadKirRoomData();
        
    } catch(err) {
        console.error('Error transfer KIR:', err);
        if(typeof showToast === 'function') showToast('Gagal memindahkan barang: ' + err.message, 'error');
    } finally {
        btn.innerHTML = oriText;
        btn.disabled = false;
    }
};
