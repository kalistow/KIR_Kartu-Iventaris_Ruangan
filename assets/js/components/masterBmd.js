// assets/js/components/masterBmd.js

function renderBmdTable(bmdData) {
    const tbody = document.getElementById('bmd-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const searchVal = document.getElementById('search-bmd')?.value.toLowerCase() || '';
    const filterCategory = document.getElementById('filter-bmd-category')?.value || 'semua';
    
    const filtered = bmdData.filter(b => {
        // Exclude category header rows from data list
        if (b.nibar && b.nibar.startsWith('CAT_')) return false;
        
        // Search filter
        const matchSearch = 
            (b.nibar && b.nibar.toLowerCase().includes(searchVal)) ||
            (b.kode_barang && b.kode_barang.toLowerCase().includes(searchVal)) ||
            (b.nama_barang && b.nama_barang.toLowerCase().includes(searchVal)) ||
            (b.merek_tipe && b.merek_tipe.toLowerCase().includes(searchVal));
            
        if (!matchSearch) return false;
        
        // Category filter
        if (filterCategory === 'semua') return true;
        
        // Calculate mapped count
        const mappedAssets = globalAssets.filter(a => a.master_bmd_id === b.id);
        const mappedQty = mappedAssets.reduce((sum, item) => sum + (item.jumlah || 0), 0);
        
        if (filterCategory === 'terpetakan') {
            return mappedQty > 0;
        }
        
        if (filterCategory === 'belum-terpetakan') {
            return mappedQty < (b.jumlah || 0);
        }
        
        // Filter by category code prefix matching
        return b.kode_barang && b.kode_barang.startsWith(filterCategory);
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center py-10 text-textMuted">Data Master BMD tidak ditemukan.</td></tr>';
        renderBmdPagination(0, 1);
        updateBulkToolbar();
        return;
    }
    
    const totalPages = Math.ceil(filtered.length / bmdItemsPerPage);
    if (currentBmdPage > totalPages) currentBmdPage = totalPages;
    if (currentBmdPage < 1) currentBmdPage = 1;

    const startIdx = (currentBmdPage - 1) * bmdItemsPerPage;
    const endIdx = startIdx + bmdItemsPerPage;
    const paginatedData = filtered.slice(startIdx, endIdx);
    
    paginatedData.forEach((b, loopIndex) => {
        const index = startIdx + loopIndex;
        // Calculate mapped count
        const mappedAssets = globalAssets.filter(a => a.master_bmd_id === b.id);
        const mappedQty = mappedAssets.reduce((sum, item) => sum + (item.jumlah || 0), 0);
        const canSelect = mappedQty < b.jumlah;
        
        let statusBadge = '';
        if (mappedQty >= b.jumlah) {
            statusBadge = `<span class="bg-pastel-green text-green-800 py-1.5 px-4 rounded-full text-xs font-black border border-green-200">Terpetakan (${mappedQty}/${b.jumlah})</span>`;
        } else if (mappedQty > 0) {
            statusBadge = `<span class="bg-pastel-yellow text-yellow-800 py-1.5 px-4 rounded-full text-xs font-black border border-yellow-200">Parsial (${mappedQty}/${b.jumlah})</span>`;
        } else {
            statusBadge = `<span class="bg-pastel-red text-red-800 py-1.5 px-4 rounded-full text-xs font-black border border-red-200">Belum Terpetakan</span>`;
        }
        
        const tr = document.createElement('tr');
        const isSelected = bulkSelectedBmdIds.has(b.id);
        tr.className = `border-b border-white/30 hover:bg-white/20 transition-colors ${isSelected ? 'bg-blue-50/40 ring-1 ring-blue-300/40' : ''}`;
        
        const displayDate = b.tanggal_perolehan ? new Date(b.tanggal_perolehan).toLocaleDateString('id-ID') : '-';
        const displayNibar = b.nibar ? b.nibar.substring(b.nibar.length - 8) : '-'; // show short register / nibar end
        
        // Action cell: toggle between Petakan (select) and Dipilih (deselect)
        let actionCell = '';
        if (canSelect) {
            if (isSelected) {
                actionCell = `<button onclick="toggleBmdSelect(${b.id})" class="clay-btn p-2.5 !shadow-clay-pressed text-white font-bold text-xs flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 border border-blue-400" title="Klik untuk batal pilih"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg> Dipilih</button>`;
            } else {
                actionCell = `<button onclick="toggleBmdSelect(${b.id})" class="clay-btn p-2.5 !shadow-clay-sm text-green-700 hover:text-green-950 font-bold text-xs flex items-center gap-1" title="Klik untuk pilih & petakan"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Petakan</button>`;
            }
        } else {
            actionCell = `<span class="text-xs text-textMuted font-bold">Lengkap</span>`;
        }
        
        tr.innerHTML = `
            <td class="py-4 px-4 whitespace-nowrap text-center">${index + 1}</td>
            <td class="py-4 px-4 font-mono text-xs" title="${b.nibar || '-'}">${displayNibar} / ${b.no_register || '-'}</td>
            <td class="py-4 px-4 whitespace-nowrap">${b.kode_barang || '-'}</td>
            <td class="py-4 px-4 font-extrabold text-gray-900">${b.nama_barang || '-'}</td>
            <td class="py-4 px-4 text-textMuted">${b.merek_tipe || '-'}</td>
            <td class="py-4 px-4 text-center">${displayDate}</td>
            <td class="py-4 px-4 text-center">${b.jumlah || 0}</td>
            <td class="py-4 px-4 text-right font-extrabold text-blue-900">Rp ${fmt(b.harga)}</td>
            <td class="py-4 px-4 text-center">${statusBadge}</td>
            <td class="py-4 px-4 text-xs font-medium text-textMuted">${b.status_penggunaan || '-'}</td>
            <td class="py-4 px-4 text-center">
                ${actionCell}
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    renderBmdPagination(filtered.length, currentBmdPage);
    updateBulkToolbar();
}

function renderBmdPagination(totalItems, currentPage) {
    const container = document.getElementById('bmd-pagination');
    if (!container) return;
    container.innerHTML = '';
    
    const totalPages = Math.ceil(totalItems / bmdItemsPerPage);
    if (totalPages <= 1) return; // Hide pagination if 1 page or empty
    
    let html = '';
    
    // Prev Button
    html += `<button onclick="changeBmdPage(${currentPage - 1})" class="clay-btn px-3 py-1.5 text-xs font-bold ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/50'}" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>`;
    
    // Page Numbers (Show max 5 pages around current)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    if (startPage > 1) {
        html += `<button onclick="changeBmdPage(1)" class="clay-btn px-3 py-1.5 text-xs font-bold hover:bg-white/50">1</button>`;
        if (startPage > 2) html += `<span class="px-2 text-textMuted text-xs">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const activeClass = isActive ? '!shadow-clay-pressed bg-surface/50 text-blue-900' : 'hover:bg-white/50 text-textMuted';
        html += `<button onclick="changeBmdPage(${i})" class="clay-btn px-3 py-1.5 text-xs font-bold ${activeClass}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="px-2 text-textMuted text-xs">...</span>`;
        html += `<button onclick="changeBmdPage(${totalPages})" class="clay-btn px-3 py-1.5 text-xs font-bold hover:bg-white/50">${totalPages}</button>`;
    }
    
    // Next Button
    html += `<button onclick="changeBmdPage(${currentPage + 1})" class="clay-btn px-3 py-1.5 text-xs font-bold ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/50'}" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>`;
    
    // Info text
    html += `<div class="ml-4 text-xs font-bold text-textMuted">Total: ${totalItems} baris</div>`;
    
    container.innerHTML = html;
}

window.changeBmdPage = function(page) {
    currentBmdPage = page;
    renderBmdTable(globalMasterBmd);
};

window.handleSearchBmd = function() {
    currentBmdPage = 1;
    renderBmdTable(globalMasterBmd);
};

window.handleFilterBmdCategoryChange = function() {
    currentBmdPage = 1;
    renderBmdTable(globalMasterBmd);
};

window.toggleBmdSelect = function(id) {
    if (bulkSelectedBmdIds.has(id)) {
        bulkSelectedBmdIds.delete(id);
    } else {
        bulkSelectedBmdIds.add(id);
    }
    renderBmdTable(globalMasterBmd);
};

window.clearBulkSelection = function() {
    bulkSelectedBmdIds.clear();
    renderBmdTable(globalMasterBmd);
};

function updateBulkToolbar() {
    const bar = document.getElementById('bulk-action-bar');
    const countEl = document.getElementById('bulk-count');
    if (!bar) return;
    
    const count = bulkSelectedBmdIds.size;
    if (countEl) countEl.textContent = count;
    
    if (count > 0) {
        bar.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        bar.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
    } else {
        bar.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        bar.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
    }
}

window.openBulkTransferModal = function() {
    const count = bulkSelectedBmdIds.size;
    if (count === 0) return;
    
    const ruangan = document.getElementById('bulk-ruangan')?.value || 'Belum Terpetakan';
    const kondisi = document.getElementById('bulk-kondisi')?.value || 'Baik';
    const ket = document.getElementById('bulk-keterangan')?.value || '-';
    
    // Populate modal info
    document.getElementById('bulk-modal-count').textContent = count;
    document.getElementById('bulk-modal-room').textContent = ruangan;
    document.getElementById('bulk-modal-kondisi').textContent = kondisi;
    document.getElementById('bulk-modal-ket').textContent = ket;
    
    // Populate item list
    const listContainer = document.getElementById('bulk-modal-list');
    listContainer.innerHTML = '';
    
    let idx = 1;
    bulkSelectedBmdIds.forEach(id => {
        const item = globalMasterBmd.find(b => b.id === id);
        if (!item) return;
        
        const mappedAssets = globalAssets.filter(a => a.master_bmd_id === item.id);
        const mappedQty = mappedAssets.reduce((sum, a) => sum + (a.jumlah || 0), 0);
        const remaining = (item.jumlah || 0) - mappedQty;
        
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 p-3 rounded-xl bg-white/50 border border-white/60';
        div.innerHTML = `
            <span class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs flex-shrink-0">${idx}</span>
            <div class="flex-1 min-w-0">
                <p class="font-extrabold text-gray-900 text-sm truncate">${item.nama_barang || '-'}</p>
                <p class="text-xs text-textMuted font-bold">${item.kode_barang || '-'} · ${item.merek_tipe || '-'}</p>
            </div>
            <div class="text-right flex-shrink-0">
                <p class="font-black text-blue-800 text-sm">${remaining} unit</p>
                <p class="text-xs text-textMuted">Rp ${fmt(item.harga)}</p>
            </div>
        `;
        listContainer.appendChild(div);
        idx++;
    });
    
    // Reset progress overlay
    document.getElementById('bulk-progress-overlay').classList.add('hidden');
    document.getElementById('bulk-confirm-btn').disabled = false;
    
    // Show modal
    const modal = document.getElementById('bulk-transfer-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeBulkTransferModal = function() {
    const modal = document.getElementById('bulk-transfer-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.executeBulkTransfer = async function() {
    const count = bulkSelectedBmdIds.size;
    if (count === 0) return;
    
    const ruangan = document.getElementById('bulk-ruangan')?.value;
    const kondisi = document.getElementById('bulk-kondisi')?.value || 'Baik';
    
    if (!ruangan) {
        showToast('Pilih ruangan tujuan terlebih dahulu!', 'warning');
        return;
    }
    
    // Show progress
    const progressOverlay = document.getElementById('bulk-progress-overlay');
    const progressText = document.getElementById('bulk-progress-text');
    const confirmBtn = document.getElementById('bulk-confirm-btn');
    progressOverlay.classList.remove('hidden');
    confirmBtn.disabled = true;
    
    const idsToProcess = [...bulkSelectedBmdIds];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < idsToProcess.length; i++) {
        const bmdId = idsToProcess[i];
        const bmdItem = globalMasterBmd.find(b => b.id === bmdId);
        if (!bmdItem) {
            errorCount++;
            continue;
        }
        
        progressText.textContent = `${i + 1} / ${idsToProcess.length}`;
        
        // Calculate remaining quantity to map
        const mappedAssets = globalAssets.filter(a => a.master_bmd_id === bmdItem.id);
        const mappedQty = mappedAssets.reduce((sum, a) => sum + (a.jumlah || 0), 0);
        const remaining = (bmdItem.jumlah || 0) - mappedQty;
        
        if (remaining <= 0) {
            // Already fully mapped, skip
            errorCount++;
            continue;
        }
        
        try {
            let status = 'KIR';
            if (ruangan === 'Aset Non-KIR' || ruangan === 'Kendaraan Dinas' || ruangan === 'Inventaris Kantor' || ruangan === 'Depan Bidang') {
                status = 'Non-KIR';
            } else if (ruangan === 'Masih Harus Dicari') {
                status = 'Masih Harus Dicari';
            } else if (ruangan === 'Barang yang Dihibahkan') {
                status = 'Dihibahkan';
            } else if (ruangan === 'Belum Terpetakan') {
                status = 'Belum Terpetakan';
            }

            const insertPayload = {
                master_bmd_id: bmdItem.id,
                no_urut: globalAssets.filter(a => a.ruangan === ruangan).length + 1 + successCount,
                kode_barang: bmdItem.kode_barang || '',
                nama_barang: bmdItem.nama_barang,
                merk_model: bmdItem.merek_tipe || '',
                no_seri: bmdItem.nomor_polisi || bmdItem.nomor_rangka || '',
                ukuran: '',
                bahan: '',
                tahun: bmdItem.tanggal_perolehan ? String(new Date(bmdItem.tanggal_perolehan).getFullYear()) : '',
                jumlah: remaining,
                harga: bmdItem.harga,
                ruangan: ruangan,
                kondisi: kondisi,
                keterangan: document.getElementById('bulk-keterangan')?.value || `Dipetakan massal ke ${ruangan}`,
                status: status
            };
            
            const { data, error } = await supabaseClient.from('assets').insert([insertPayload]).select();
            if (error) throw error;
            
            // Log to history
            if (data && data.length > 0) {
                const ketInput = document.getElementById('bulk-keterangan')?.value;
                const note = ketInput 
                    ? `Aset "${bmdItem.nama_barang}" dipetakan ke ${ruangan} sebanyak ${remaining} unit. Keterangan: ${ketInput}`
                    : `Aset "${bmdItem.nama_barang}" dipetakan ke ${ruangan} sebanyak ${remaining} unit (pemindahan massal).`;
                    
                await supabaseClient.from('riwayat_barang').insert([{
                    asset_id: data[0].id,
                    jenis_perubahan: 'Pemetaan Massal',
                    keterangan: note,
                    tanggal: new Date().toISOString()
                }]);
            }
            
            successCount++;
        } catch (err) {
            console.error(`Gagal memindahkan BMD ID ${bmdId}:`, err);
            errorCount++;
        }
    }
    
    // Done
    bulkSelectedBmdIds.clear();
    closeBulkTransferModal();
    await loadAllData();
    
    // Show result summary
    let resultMsg = `Pemindahan massal selesai!<br>✅ Berhasil: ${successCount} barang`;
    if (errorCount > 0) {
        resultMsg += `<br>⚠️ Gagal/Dilewati: ${errorCount} barang`;
    }
    showToast(resultMsg, errorCount > 0 ? 'warning' : 'success');
};
