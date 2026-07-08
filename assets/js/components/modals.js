// assets/js/components/modals.js

window.openEditModal = function(id) {
    const asset = globalAssets.find(a => a.id === id);
    if (!asset) return;
    
    document.getElementById('edit-id').value = asset.id;
    document.getElementById('edit-nama').value = asset.nama_barang || '';
    
    // Split Kode Barang & Register number
    let displayKode = asset.kode_barang || '';
    let displayReg = '';
    if (asset.kode_barang && asset.kode_barang.includes('-')) {
        const parts = asset.kode_barang.split('-');
        displayKode = parts[0];
        displayReg = parts[1];
    }
    document.getElementById('edit-kode').value = displayKode;
    document.getElementById('edit-register').value = displayReg;
    
    document.getElementById('edit-merk').value = asset.merk_model || '';
    document.getElementById('edit-no-seri').value = asset.no_seri || '';
    document.getElementById('edit-ukuran').value = asset.ukuran || '';
    document.getElementById('edit-bahan').value = asset.bahan || '';
    document.getElementById('edit-tahun').value = asset.tahun || '';
    document.getElementById('edit-jumlah').value = asset.jumlah || 1;
    document.getElementById('edit-harga').value = asset.harga || 0;
    
    document.getElementById('old-ruangan').value = asset.ruangan || '';
    document.getElementById('old-kondisi').value = asset.kondisi || '';
    
    const editRuanganSelect = document.getElementById('edit-ruangan');
    editRuanganSelect.value = asset.ruangan || 'Ruang Kaban (Kepala Badan)';
    
    // Disable room change if in Usul Penghapusan
    const warningDiv = document.getElementById('edit-usul-hapus-warning');
    if (asset.status === 'Usul Penghapusan') {
        editRuanganSelect.disabled = true;
        editRuanganSelect.classList.add('bg-gray-100', 'cursor-not-allowed', 'opacity-70');
        if (warningDiv) warningDiv.classList.remove('hidden');
    } else {
        editRuanganSelect.disabled = false;
        editRuanganSelect.classList.remove('bg-gray-100', 'cursor-not-allowed', 'opacity-70');
        if (warningDiv) warningDiv.classList.add('hidden');
    }
    document.getElementById('edit-kondisi').value = asset.kondisi || 'Baik';
    
    // Parse Penanggung Jawab dari keterangan
    let pjVal = '';
    let ketVal = asset.keterangan || '';
    const pjRegex = /^\[Penanggung Jawab:\s*(.*?)\]\s*(.*)/s;
    const match = ketVal.match(pjRegex);
    if (match) {
        pjVal = match[1];
        ketVal = match[2];
    }
    
    const elPj = document.getElementById('edit-penanggung-jawab');
    if (elPj) elPj.value = pjVal;
    
    document.getElementById('edit-keterangan').value = ketVal;
    
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeEditModal = function() {
    const modal = document.getElementById('edit-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.handleEditRuanganChange = function() {
    const select = document.getElementById('edit-ruangan');
    const warning = document.getElementById('edit-induk-warning');
    if (select.value === '__DATA_INDUK__') {
        warning.classList.remove('hidden');
        select.classList.add('!ring-2', '!ring-purple-400', '!border-purple-400');
    } else {
        warning.classList.add('hidden');
        select.classList.remove('!ring-2', '!ring-purple-400', '!border-purple-400');
    }
};

window.openAddAssetModal = function() {
    const form = document.getElementById('add-asset-form');
    if (form) form.reset();
    
    const targetRoomLabel = document.getElementById('add-asset-target-room');
    if (targetRoomLabel) targetRoomLabel.textContent = selectedRoom;
    
    const modal = document.getElementById('add-asset-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.openAddNonKirAssetModal = function() {
    const form = document.getElementById('add-asset-form');
    if (form) form.reset();
    
    // Tentukan ruangan berdasarkan tab non-KIR yang aktif
    let targetRoom = 'Aset Non-KIR';
    if (typeof currentNonKirTab !== 'undefined') {
        if (currentNonKirTab === 'kendaraan') targetRoom = 'Kendaraan Dinas';
        else if (currentNonKirTab === 'umum') targetRoom = 'Inventaris Kantor';
        else if (currentNonKirTab === 'non-kir') targetRoom = 'Aset Non-KIR';
        else if (currentNonKirTab === 'search') targetRoom = 'Masih Harus Dicari';
    }
    
    const targetRoomLabel = document.getElementById('add-asset-target-room');
    if (targetRoomLabel) targetRoomLabel.textContent = targetRoom;
    
    const modal = document.getElementById('add-asset-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeAddAssetModal = function() {
    const modal = document.getElementById('add-asset-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.openAddRoomModal = function() {
    const input = document.getElementById('add-room-name');
    if (input) input.value = '';
    
    const modal = document.getElementById('add-room-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeAddRoomModal = function() {
    const modal = document.getElementById('add-room-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.openEditRoomModal = function() {
    const selectFilter = document.getElementById('kir-room-select');
    if (!selectFilter) return;
    
    const roomToEdit = selectFilter.value;
    if (!roomToEdit) {
        showToast('Tidak ada ruangan terpilih untuk dieit.', 'warning');
        return;
    }
    
    // Safety check: check if room is special
    const specialRooms = ['Aset Non-KIR', 'Masih Harus Dicari', 'Barang yang Dihibahkan', 'Kendaraan Dinas', 'Inventaris Kantor'];
    if (specialRooms.includes(roomToEdit)) {
        showToast(`Ruangan khusus "${roomToEdit}" tidak dapat diubah namanya.`, 'error');
        return;
    }

    const oldNameInput = document.getElementById('edit-room-old-name');
    const newNameInput = document.getElementById('edit-room-new-name');
    if (oldNameInput) oldNameInput.value = roomToEdit;
    if (newNameInput) newNameInput.value = roomToEdit;
    
    const modal = document.getElementById('edit-room-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeEditRoomModal = function() {
    const modal = document.getElementById('edit-room-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.deleteRoom = async function() {
    const selectFilter = document.getElementById('kir-room-select');
    if (!selectFilter) return;
    
    const roomToDelete = selectFilter.value;
    if (!roomToDelete) {
        showToast('Tidak ada ruangan terpilih untuk dihapus.', 'warning');
        return;
    }
    
    // Safety check: check if room is special
    const specialRooms = ['Aset Non-KIR', 'Masih Harus Dicari', 'Barang yang Dihibahkan', 'Kendaraan Dinas', 'Inventaris Kantor'];
    if (specialRooms.includes(roomToDelete)) {
        showToast(`Ruangan khusus "${roomToDelete}" tidak dapat dihapus.`, 'error');
        return;
    }
    
    // Safety check: check if the room contains assets
    const assetsInRoom = globalAssets.filter(a => a.ruangan === roomToDelete);
    let deleteAssetsPermanently = false;
    
    if (assetsInRoom.length > 0) {
        // Let's prompt with warning details and the option to delete permanently
        const confirmMsg = `Ruangan "${roomToDelete}" tidak dapat dihapus karena masih berisi ${assetsInRoom.length} barang terdaftar di dalamnya.\n\n` +
                           `Apakah Anda yakin ingin menghapus ruangan ini beserta seluruh barang di dalamnya secara PERMANEN?\n\n` +
                           `Tindakan ini tidak dapat dibatalkan!`;
        if (confirm(confirmMsg)) {
            deleteAssetsPermanently = true;
        } else {
            return;
        }
    } else {
        // Confirm deletion for empty room
        if (!confirm(`Apakah Anda yakin ingin menghapus ruangan "${roomToDelete}"?\n\nRuangan ini tidak akan ditampilkan lagi di daftar pilihan.`)) {
            return;
        }
    }
    
    // If we need to delete assets permanently first
    if (deleteAssetsPermanently) {
        try {
            const assetIds = assetsInRoom.map(a => a.id);
            const { error: deleteError } = await supabaseClient.from('assets').delete().in('id', assetIds);
            if (deleteError) throw deleteError;
            
            showToast(`${assetsInRoom.length} barang di dalam ruangan telah dihapus secara permanen.`, 'success');
        } catch (err) {
            console.error('Error deleting assets for room deletion:', err);
            showToast('Gagal menghapus barang di dalam ruangan: ' + err.message, 'error');
            return;
        }
    }
    
    // Delete custom rooms or add to deleted official rooms
    const customRooms = JSON.parse(localStorage.getItem('simbar.custom_rooms') || '[]');
    const customIndex = customRooms.indexOf(roomToDelete);
    
    if (customIndex !== -1) {
        // Remove from custom rooms list
        customRooms.splice(customIndex, 1);
        localStorage.setItem('simbar.custom_rooms', JSON.stringify(customRooms));
    } else {
        // Mark official room as deleted
        const deletedRooms = JSON.parse(localStorage.getItem('simbar.deleted_rooms') || '[]');
        if (!deletedRooms.includes(roomToDelete)) {
            deletedRooms.push(roomToDelete);
            localStorage.setItem('simbar.deleted_rooms', JSON.stringify(deletedRooms));
        }
    }
    
    // Refresh data and UI
    if (deleteAssetsPermanently) {
        if (typeof loadAllData !== 'undefined') {
            await loadAllData();
        }
    } else {
        // Refresh selects
        populateAllRoomSelects();
        // Refresh table
        renderKirTable(globalAssets);
    }
    
    showToast(`Ruangan "${roomToDelete}" berhasil dihapus.`, 'success');
};

window.deleteSingleAsset = function(id) {
    const asset = globalAssets.find(a => a.id === id);
    if (!asset) {
        showToast('Barang tidak ditemukan!', 'error');
        return;
    }
    
    document.getElementById('delete-confirm-asset-id').value = id;
    document.getElementById('delete-confirm-is-bulk').value = "false";
    document.getElementById('delete-confirm-asset-name').textContent = asset.nama_barang || 'Aset';
    document.getElementById('delete-confirm-asset-code').textContent = asset.kode_barang || '-';
    
    // reset selection
    const radios = document.getElementsByName('delete-method');
    if (radios.length > 0) radios[0].checked = true;
    
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.clay-panel').classList.remove('scale-95');
        }, 10);
    }
};

window.deleteSelectedAssets = function(type) {
    let idsToDelete = [];
    if (type === 'KIR') {
        idsToDelete = Array.from(selectedKirAssetIds);
    } else if (type === 'Non-KIR') {
        idsToDelete = Array.from(selectedNonKirAssetIds);
    } else if (type === 'Usul-Hapus') {
        idsToDelete = Array.from(selectedUsulHapusAssetIds);
    }
    
    if (idsToDelete.length === 0) return;
    
    document.getElementById('delete-confirm-asset-id').value = JSON.stringify(idsToDelete);
    document.getElementById('delete-confirm-is-bulk').value = "true";
    document.getElementById('delete-confirm-asset-name').textContent = `${idsToDelete.length} barang terpilih`;
    document.getElementById('delete-confirm-asset-code').textContent = `Penghapusan Massal (${type})`;
    
    // reset selection
    const radios = document.getElementsByName('delete-method');
    if (radios.length > 0) radios[0].checked = true;
    
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.clay-panel').classList.remove('scale-95');
        }, 10);
    }
};

window.openExecuteHapusModal = function(id) {
    const asset = globalAssets.find(a => a.id === id);
    if (!asset) {
        showToast('Barang tidak ditemukan!', 'error');
        return;
    }
    
    document.getElementById('execute-hapus-asset-id').value = id;
    document.getElementById('execute-hapus-is-bulk').value = "false";
    document.getElementById('execute-hapus-asset-name').textContent = asset.nama_barang || 'Aset';
    document.getElementById('execute-hapus-asset-code').textContent = asset.kode_barang || '-';
    
    const radios = document.getElementsByName('execute-hapus-method');
    if (radios.length > 0) radios[0].checked = true;
    
    const modal = document.getElementById('execute-hapus-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.clay-panel').classList.remove('scale-95');
        }, 10);
    }
};

window.executeHapusSelectedAssets = function(type) {
    let idsToDelete = [];
    if (type === 'Usul-Hapus') {
        idsToDelete = Array.from(selectedUsulHapusAssetIds);
    }
    
    if (idsToDelete.length === 0) return;
    
    document.getElementById('execute-hapus-asset-id').value = JSON.stringify(idsToDelete);
    document.getElementById('execute-hapus-is-bulk').value = "true";
    document.getElementById('execute-hapus-asset-name').textContent = `${idsToDelete.length} barang terpilih`;
    document.getElementById('execute-hapus-asset-code').textContent = `Eksekusi Massal`;
    
    const radios = document.getElementsByName('execute-hapus-method');
    if (radios.length > 0) radios[0].checked = true;
    
    const modal = document.getElementById('execute-hapus-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.clay-panel').classList.remove('scale-95');
        }, 10);
    }
};

window.closeExecuteHapusModal = function() {
    const modal = document.getElementById('execute-hapus-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.clay-panel').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
};

window.openMapModal = function(id) {
    const item = globalMasterBmd.find(b => b.id === id);
    if (!item) return;
    
    document.getElementById('map-bmd-id').value = item.id;
    document.getElementById('map-bmd-name').textContent = item.nama_barang || '-';
    document.getElementById('map-bmd-nibar').textContent = item.nibar || '-';
    // FIX timezone: substring(0,4) lebih aman dari getFullYear() agar tahun tidak bergeser di UTC+8
    document.getElementById('map-bmd-year').textContent = item.tanggal_perolehan ? String(item.tanggal_perolehan).substring(0, 4) : '-';
    document.getElementById('map-bmd-qty').textContent = item.jumlah || 0;
    document.getElementById('map-bmd-price').textContent = 'Rp ' + fmt(item.harga);
    
    // Fill values default
    document.getElementById('map-jumlah').value = 1;
    document.getElementById('map-jumlah').max = item.jumlah;
    document.getElementById('map-kondisi').value = 'Baik';
    document.getElementById('map-keterangan').value = '';
    
    const modal = document.getElementById('map-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeMapModal = function() {
    const modal = document.getElementById('map-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

async function returnToDataInduk(assetId) {
    const asset = globalAssets.find(a => a.id === assetId);
    if (!asset) {
        showToast('Aset tidak ditemukan!', 'error');
        return;
    }
    
    const namaBarang = asset.nama_barang || 'Aset';
    const fromRoom = asset.ruangan || 'Tidak Diketahui';
    
    if (!confirm(`Yakin ingin mengembalikan "${namaBarang}" ke Data Induk (Master)?\n\nBarang akan dihapus dari daftar KIR/ruangan dan kembali menjadi "Belum Terpetakan" di Master BMD.`)) {
        return;
    }
    
    try {
        // Log the return action first
        await supabaseClient.from('riwayat_barang').insert([{
            asset_id: assetId,
            jenis_perubahan: 'Dikembalikan ke Data Induk',
            keterangan: `"${namaBarang}" dikembalikan dari ${fromRoom} ke Data Induk (Master BMD). Aset kini berstatus Belum Terpetakan.`,
            tanggal: new Date().toISOString()
        }]);
        
        // Delete the asset from assets table (this makes the master BMD status go back to unmapped)
        const { error } = await supabaseClient.from('assets').delete().eq('id', assetId);
        if (error) throw error;
        
        await loadAllData();
    } catch (err) {
        console.error('Error returning to Data Induk:', err);
        showToast('Gagal mengembalikan ke Data Induk: ' + err.message, 'error');
    }
}


// --- Submit Event Listeners ---

window.closeDeleteConfirmModal = function() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.clay-panel').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
};

window.closeMapModal = function() {
    const modal = document.getElementById('map-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.clay-panel').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            const form = document.getElementById('map-form');
            if (form) form.reset();
        }, 300);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Edit Form Submit
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Menyimpan...';
            btn.disabled = true;

            const id = document.getElementById('edit-id').value;
            const nama = document.getElementById('edit-nama').value;
            const kode = document.getElementById('edit-kode').value;
            const reg = document.getElementById('edit-register').value;
            const merk = document.getElementById('edit-merk').value;
            const noSeri = document.getElementById('edit-no-seri').value;
            const ukuran = document.getElementById('edit-ukuran').value;
            const bahan = document.getElementById('edit-bahan').value;
            const tahun = document.getElementById('edit-tahun').value;
            const harga = document.getElementById('edit-harga').value;
            const kondisi = document.getElementById('edit-kondisi').value;
            const ketRaw = document.getElementById('edit-keterangan').value;
            const pj = document.getElementById('edit-penanggung-jawab')?.value.trim() || '';
            const ruangan = document.getElementById('edit-ruangan').value;

            // Rakit keterangan: gabungkan penanggung jawab jika ada
            const ket = pj ? `[Penanggung Jawab: ${pj}] ${ketRaw}` : ketRaw;

            try {
                const { error } = await supabaseClient.from('assets').update({
                    nama_barang: nama,
                    kode_barang: reg ? `${kode}-${reg}` : kode,
                    merk_model: merk,
                    no_seri: noSeri,
                    ukuran: ukuran,
                    bahan: bahan,
                    tahun: tahun,
                    harga: parseFloat(harga) || 0,
                    kondisi: kondisi,
                    keterangan: ket,
                    ruangan: ruangan
                }).eq('id', id);

                if (error) throw error;
                
                const oldAsset = globalAssets.find(a => a.id == id);
                let ketText = 'Data barang diubah melalui form edit.';
                if (oldAsset) {
                    let changes = [];
                    if (oldAsset.ruangan !== ruangan) changes.push(`Ruangan: ${oldAsset.ruangan || '-'} ➔ ${ruangan}`);
                    if (oldAsset.kondisi !== kondisi) changes.push(`Kondisi: ${oldAsset.kondisi || '-'} ➔ ${kondisi}`);
                    if (oldAsset.nama_barang !== nama) changes.push(`Nama: ${oldAsset.nama_barang || '-'} ➔ ${nama}`);
                    if (changes.length > 0) ketText = 'Perubahan: ' + changes.join(', ');
                }

                await supabaseClient.from('riwayat_barang').insert([{
                    asset_id: id,
                    jenis_perubahan: 'Edit Data',
                    keterangan: ketText,
                    tanggal: new Date().toISOString()
                }]);

                if (typeof closeEditModal !== 'undefined') closeEditModal();
                if (typeof loadAllData !== 'undefined') await loadAllData();
                showToast('Aset berhasil diperbarui.', 'success');
            } catch (err) {
                console.error('Update Error:', err);
                showToast('Gagal mengupdate aset: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // 2. Add Asset Form Submit
    const addAssetForm = document.getElementById('add-asset-form');
    if (addAssetForm) {
        addAssetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Menyimpan...';
            btn.disabled = true;

            const nama = document.getElementById('add-nama').value;
            const kode = document.getElementById('add-kode').value;
            const reg = document.getElementById('add-register').value;
            const merk = document.getElementById('add-merk').value;
            const noSeri = document.getElementById('add-no-seri').value;
            const ukuran = document.getElementById('add-ukuran').value;
            const bahan = document.getElementById('add-bahan').value;
            const tahun = document.getElementById('add-tahun').value;
            const harga = document.getElementById('add-harga').value;
            const kondisi = document.getElementById('add-kondisi').value;
            const ket = document.getElementById('add-keterangan').value;

            const targetRoomLabel = document.getElementById('add-asset-target-room');
            const selectedRoom = targetRoomLabel ? targetRoomLabel.textContent : "Belum Terpetakan";

            try {
                const { data, error } = await supabaseClient.from('assets').insert([{
                    nama_barang: nama,
                    kode_barang: reg ? `${kode}-${reg}` : kode,
                    merk_model: merk,
                    no_seri: noSeri,
                    ukuran: ukuran,
                    bahan: bahan,
                    tahun: tahun,
                    harga: parseFloat(harga) || 0,
                    kondisi: kondisi,
                    keterangan: ket,
                    ruangan: selectedRoom,
                    no_urut: globalAssets.filter(a => a.ruangan === selectedRoom).length + 1
                }]).select();

                if (error) throw error;
                
                if (data && data.length > 0) {
                    await supabaseClient.from('riwayat_barang').insert([{
                        asset_id: data[0].id,
                        jenis_perubahan: 'Barang Baru (Input Manual)',
                        keterangan: `Ditambahkan langsung ke ruangan ${selectedRoom}.`,
                        tanggal: new Date().toISOString()
                    }]);
                }
                
                if (typeof closeAddAssetModal !== 'undefined') closeAddAssetModal();
                if (typeof loadAllData !== 'undefined') await loadAllData();
                showToast('Aset baru berhasil ditambahkan.', 'success');
            } catch (err) {
                console.error('Insert Error:', err);
                showToast('Gagal menambahkan aset: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // 3. Add Room Form Submit
    const addRoomForm = document.getElementById('add-room-form');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('add-room-name').value.trim();
            if (!name) return;
            
            try {
                let customRooms = JSON.parse(localStorage.getItem('simbar.custom_rooms') || '[]');
                if (!Array.isArray(customRooms)) customRooms = [];
                
                let isOfficial = false;
                if (typeof OFFICIAL_ROOMS !== 'undefined' && OFFICIAL_ROOMS.includes(name)) isOfficial = true;
                
                if (!customRooms.includes(name) && !isOfficial) {
                    customRooms.push(name);
                    localStorage.setItem('simbar.custom_rooms', JSON.stringify(customRooms));
                }
                
                let deletedRooms = JSON.parse(localStorage.getItem('simbar.deleted_rooms') || '[]');
                if (!Array.isArray(deletedRooms)) deletedRooms = [];
                
                if (deletedRooms.includes(name)) {
                    deletedRooms = deletedRooms.filter(r => r !== name);
                    localStorage.setItem('simbar.deleted_rooms', JSON.stringify(deletedRooms));
                }
            } catch (err) {
                console.warn('LocalStorage error:', err);
                localStorage.setItem('simbar.custom_rooms', JSON.stringify([name]));
                localStorage.setItem('simbar.deleted_rooms', '[]');
            }
            
            if (typeof closeAddRoomModal !== 'undefined') closeAddRoomModal();
            if (typeof populateAllRoomSelects !== 'undefined') populateAllRoomSelects();
            const kirSelect = document.getElementById('kir-room-select');
            if (kirSelect) kirSelect.value = name;
            if (typeof loadKirRoomData !== 'undefined') loadKirRoomData();
            showToast(`Ruangan "${name}" berhasil ditambahkan.`, 'success');
        });
    }

    // 3.5 Edit Room Form Submit
    const editRoomForm = document.getElementById('edit-room-form');
    if (editRoomForm) {
        editRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldName = document.getElementById('edit-room-old-name').value;
            const newName = document.getElementById('edit-room-new-name').value.trim();
            if (!oldName || !newName) return;
            
            if (oldName === newName) {
                if (typeof closeEditRoomModal !== 'undefined') closeEditRoomModal();
                return;
            }

            const specialRooms = ['Aset Non-KIR', 'Masih Harus Dicari', 'Barang yang Dihibahkan', 'Kendaraan Dinas', 'Inventaris Kantor'];
            if (specialRooms.includes(newName)) {
                showToast(`Nama ruangan "${newName}" tidak dapat digunakan karena merupakan ruangan khusus.`, 'error');
                return;
            }

            const btn = document.getElementById('edit-room-submit-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span>Menyimpan...';
            btn.disabled = true;

            try {
                // Update in Supabase assets table
                const { error } = await supabaseClient
                    .from('assets')
                    .update({ ruangan: newName })
                    .eq('ruangan', oldName);

                if (error) throw error;

                // Update in LocalStorage
                let customRooms = JSON.parse(localStorage.getItem('simbar.custom_rooms') || '[]');
                if (!Array.isArray(customRooms)) customRooms = [];

                let deletedRooms = JSON.parse(localStorage.getItem('simbar.deleted_rooms') || '[]');
                if (!Array.isArray(deletedRooms)) deletedRooms = [];

                const customIndex = customRooms.indexOf(oldName);
                if (customIndex !== -1) {
                    customRooms[customIndex] = newName;
                    localStorage.setItem('simbar.custom_rooms', JSON.stringify(customRooms));
                } else {
                    if (!deletedRooms.includes(oldName)) {
                        deletedRooms.push(oldName);
                        localStorage.setItem('simbar.deleted_rooms', JSON.stringify(deletedRooms));
                    }
                    if (!customRooms.includes(newName)) {
                        customRooms.push(newName);
                        localStorage.setItem('simbar.custom_rooms', JSON.stringify(customRooms));
                    }
                }

                if (deletedRooms.includes(newName)) {
                    deletedRooms = deletedRooms.filter(r => r !== newName);
                    localStorage.setItem('simbar.deleted_rooms', JSON.stringify(deletedRooms));
                }

                if (typeof closeEditRoomModal !== 'undefined') closeEditRoomModal();
                if (typeof loadAllData !== 'undefined') await loadAllData();
                
                const kirSelect = document.getElementById('kir-room-select');
                if (kirSelect) {
                    kirSelect.value = newName;
                }
                if (typeof loadKirRoomData !== 'undefined') loadKirRoomData();

                showToast(`Nama ruangan "${oldName}" berhasil diubah menjadi "${newName}".`, 'success');
            } catch (err) {
                console.error('Rename Room Error:', err);
                showToast('Gagal mengubah nama ruangan: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // 4. Delete Confirm Form Submit
    const deleteForm = document.getElementById('delete-confirm-form');
    if (deleteForm) {
        deleteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Mengeksekusi...';
            btn.disabled = true;

            const idVal = document.getElementById('delete-confirm-asset-id').value;
            const isBulk = document.getElementById('delete-confirm-is-bulk').value === 'true';
            const method = document.querySelector('input[name="delete-method"]:checked').value;
            
            let ids = isBulk ? JSON.parse(idVal) : [parseInt(idVal)];

            try {
                if (method === 'permanen') {
                    const { error } = await supabaseClient.from('assets').delete().in('id', ids);
                    if (error) throw error;
                } else if (method === 'usul-hapus') {
                    const { error } = await supabaseClient.from('assets').update({
                        status: 'Usul Penghapusan'
                    }).in('id', ids);
                    if (error) throw error;
                    
                    const history = ids.map(id => {
                        const asset = globalAssets.find(a => a.id == id);
                        const origin = asset && asset.ruangan ? asset.ruangan : 'ruangan sebelumnya';
                        return {
                            asset_id: id,
                            jenis_perubahan: 'Masuk Usul Penghapusan',
                            keterangan: `Dari ruangan "${origin}" dipindahkan ke Usul Penghapusan.`,
                            tanggal: new Date().toISOString()
                        };
                    });
                    await supabaseClient.from('riwayat_barang').insert(history);
                }
                
                if (typeof selectedKirAssetIds !== 'undefined') selectedKirAssetIds.clear();
                if (typeof selectedNonKirAssetIds !== 'undefined') selectedNonKirAssetIds.clear();
                if (typeof selectedUsulHapusAssetIds !== 'undefined') selectedUsulHapusAssetIds.clear();
                
                if (typeof closeDeleteConfirmModal !== 'undefined') closeDeleteConfirmModal();
                if (typeof loadAllData !== 'undefined') await loadAllData();
                showToast('Aset berhasil dieksekusi.', 'success');
            } catch (err) {
                console.error('Delete Error:', err);
                showToast('Gagal mengeksekusi penghapusan: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // 4b. Execute Hapus Form Submit
    const executeHapusForm = document.getElementById('execute-hapus-form');
    if (executeHapusForm) {
        executeHapusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Mengeksekusi...';
            btn.disabled = true;

            const idVal = document.getElementById('execute-hapus-asset-id').value;
            const isBulk = document.getElementById('execute-hapus-is-bulk').value === 'true';
            const method = document.querySelector('input[name="execute-hapus-method"]:checked').value;
            
            let ids = isBulk ? JSON.parse(idVal) : [parseInt(idVal)];

            try {
                if (method === 'permanen') {
                    const { error } = await supabaseClient.from('assets').delete().in('id', ids);
                    if (error) throw error;
                } else {
                    const { error } = await supabaseClient.from('assets').update({
                        status: method
                    }).in('id', ids);
                    if (error) throw error;
                    
                    const history = ids.map(id => {
                        const asset = globalAssets.find(a => a.id == id);
                        return {
                            asset_id: id,
                            jenis_perubahan: `Dieksekusi: ${method}`,
                            keterangan: `Barang telah ${method.toLowerCase()}.`,
                            tanggal: new Date().toISOString()
                        };
                    });
                    await supabaseClient.from('riwayat_barang').insert(history);
                }
                
                if (typeof selectedKirAssetIds !== 'undefined') selectedKirAssetIds.clear();
                if (typeof selectedNonKirAssetIds !== 'undefined') selectedNonKirAssetIds.clear();
                if (typeof selectedUsulHapusAssetIds !== 'undefined') selectedUsulHapusAssetIds.clear();
                
                if (typeof closeExecuteHapusModal !== 'undefined') closeExecuteHapusModal();
                if (typeof loadAllData !== 'undefined') await loadAllData();
                showToast('Aset berhasil dieksekusi.', 'success');
            } catch (err) {
                console.error('Execute Error:', err);
                showToast('Gagal mengeksekusi penghapusan: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

// 5. Map Form Submit
    const mapForm = document.getElementById('map-form');
    if (mapForm) {
        mapForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Memetakan...';
            btn.disabled = true;

            const bmdId = document.getElementById('map-bmd-id').value;
            const targetRoom = document.getElementById('map-ruangan').value;
            const jumlah = parseInt(document.getElementById('map-jumlah').value) || 1;
            const kondisi = document.getElementById('map-kondisi').value;
            const keterangan = document.getElementById('map-keterangan').value;
            
            const bmdItem = globalMasterBmd.find(b => b.id == bmdId);
            if (!bmdItem) {
                showToast('Item BMD tidak ditemukan!', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

            try {
                let status = 'KIR';
                if (targetRoom === 'Aset Non-KIR' || targetRoom === 'Kendaraan Dinas' || targetRoom === 'Inventaris Kantor' || targetRoom === 'Depan Bidang') {
                    status = 'Non-KIR';
                } else if (targetRoom === 'Masih Harus Dicari') {
                    status = 'Masih Harus Dicari';
                } else if (targetRoom === 'Barang yang Dihibahkan') {
                    status = 'Dihibahkan';
                } else if (targetRoom === 'Belum Terpetakan') {
                    status = 'Belum Terpetakan';
                }

                const payload = {
                    master_bmd_id: bmdItem.id,
                    no_urut: globalAssets.filter(a => a.ruangan === targetRoom).length + 1,
                    kode_barang: bmdItem.kode_barang || '',
                    nama_barang: bmdItem.nama_barang,
                    merk_model: bmdItem.merek_tipe || '',
                    no_seri: bmdItem.nomor_polisi || bmdItem.nomor_rangka || '',
                    ukuran: '',
                    bahan: '',
                    // FIX timezone: substring(0,4) lebih aman dari getFullYear() agar tahun tidak bergeser di UTC+8
                    tahun: bmdItem.tanggal_perolehan ? String(bmdItem.tanggal_perolehan).substring(0, 4) : '',
                    jumlah: jumlah,
                    harga: bmdItem.harga,
                    ruangan: targetRoom,
                    kondisi: kondisi,
                    keterangan: keterangan || `Dipetakan manual ke ${targetRoom}`,
                    status: status
                };
                
                const { data, error } = await supabaseClient.from('assets').insert([payload]).select();
                if (error) throw error;
                
                if (data && data.length > 0) {
                    await supabaseClient.from('riwayat_barang').insert([{
                        asset_id: data[0].id,
                        jenis_perubahan: 'Pemetaan Manual',
                        keterangan: `Aset "${bmdItem.nama_barang}" dipetakan ke ${targetRoom} sebanyak ${jumlah} unit.`,
                        tanggal: new Date().toISOString()
                    }]);
                }
                
                closeMapModal();
                await loadAllData();
                showToast(`Barang berhasil dipetakan ke ${targetRoom}.`, 'success');
            } catch (err) {
                console.error('Map Error:', err);
                showToast('Gagal memetakan barang: ' + err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});
