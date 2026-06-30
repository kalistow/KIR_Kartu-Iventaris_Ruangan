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
    
    document.getElementById('edit-ruangan').value = asset.ruangan || 'Ruang Kaban (Kepala Badan)';
    document.getElementById('edit-kondisi').value = asset.kondisi || 'Baik';
    document.getElementById('edit-keterangan').value = asset.keterangan || '';
    
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

window.deleteRoom = function() {
    const selectFilter = document.getElementById('kir-room-select');
    if (!selectFilter) return;
    
    const roomToDelete = selectFilter.value;
    if (!roomToDelete) {
        alert('Tidak ada ruangan terpilih untuk dihapus.');
        return;
    }
    
    // Safety check: check if room is special
    const specialRooms = ['Gudang Transit', 'Aset Non-KIR', 'Masih Harus Dicari', 'Barang yang Dihibahkan', 'Kendaraan Dinas', 'Inventaris Kantor'];
    if (specialRooms.includes(roomToDelete)) {
        alert(`Ruangan khusus "${roomToDelete}" tidak dapat dihapus.`);
        return;
    }
    
    // Safety check: check if the room contains assets
    const assetsInRoom = globalAssets.filter(a => a.ruangan === roomToDelete);
    if (assetsInRoom.length > 0) {
        alert(`Ruangan "${roomToDelete}" tidak dapat dihapus karena masih berisi ${assetsInRoom.length} barang terdaftar di dalamnya.\n\nSilakan pindahkan semua barang di ruangan ini ke ruangan lain terlebih dahulu.`);
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Apakah Anda yakin ingin menghapus ruangan "${roomToDelete}"?\n\nRuangan ini tidak akan ditampilkan lagi di daftar pilihan.`)) {
        return;
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
    
    // Refresh selects
    populateAllRoomSelects();
    
    // Refresh table
    renderKirTable(globalAssets);
    
    alert(`Ruangan "${roomToDelete}" berhasil dihapus.`);
};

window.deleteSingleAsset = function(id) {
    const asset = globalAssets.find(a => a.id === id);
    if (!asset) {
        alert('Barang tidak ditemukan!');
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

window.openMapModal = function(id) {
    const item = globalMasterBmd.find(b => b.id === id);
    if (!item) return;
    
    document.getElementById('map-bmd-id').value = item.id;
    document.getElementById('map-bmd-name').textContent = item.nama_barang || '-';
    document.getElementById('map-bmd-nibar').textContent = item.nibar || '-';
    document.getElementById('map-bmd-year').textContent = item.tanggal_perolehan ? new Date(item.tanggal_perolehan).getFullYear() : '-';
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
        alert('Aset tidak ditemukan!');
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
        
        loadAllData();
    } catch (err) {
        console.error('Error returning to Data Induk:', err);
        alert('Gagal mengembalikan ke Data Induk: ' + err.message);
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
            const ket = document.getElementById('edit-keterangan').value;
            const ruangan = document.getElementById('edit-ruangan').value;

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
                
                await supabaseClient.from('riwayat_barang').insert([{
                    asset_id: id,
                    jenis_perubahan: 'Edit Data',
                    keterangan: 'Data barang diubah melalui form edit.',
                    tanggal: new Date().toISOString()
                }]);

                if (typeof closeEditModal !== 'undefined') closeEditModal();
                if (typeof loadAllData !== 'undefined') loadAllData();
            } catch (err) {
                console.error('Update Error:', err);
                alert('Gagal mengupdate aset: ' + err.message);
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

            const selectedRoom = (typeof currentKirRoom !== 'undefined' && currentKirRoom) ? currentKirRoom : "Gudang Transit";

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
                if (typeof loadAllData !== 'undefined') loadAllData();
            } catch (err) {
                console.error('Insert Error:', err);
                alert('Gagal menambahkan aset: ' + err.message);
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
                        status: 'Usul Hapus'
                    }).in('id', ids);
                    if (error) throw error;
                    
                    const history = ids.map(id => ({
                        asset_id: id,
                        jenis_perubahan: 'Masuk Usul Penghapusan',
                        keterangan: 'Barang dipindahkan ke daftar karantina usul hapus.',
                        tanggal: new Date().toISOString()
                    }));
                    await supabaseClient.from('riwayat_barang').insert(history);
                }
                
                if (typeof selectedKirAssetIds !== 'undefined') selectedKirAssetIds.clear();
                if (typeof selectedNonKirAssetIds !== 'undefined') selectedNonKirAssetIds.clear();
                if (typeof selectedUsulHapusAssetIds !== 'undefined') selectedUsulHapusAssetIds.clear();
                
                if (typeof closeDeleteConfirmModal !== 'undefined') closeDeleteConfirmModal();
                if (typeof loadAllData !== 'undefined') loadAllData();
            } catch (err) {
                console.error('Delete Error:', err);
                alert('Gagal mengeksekusi penghapusan: ' + err.message);
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
                alert('Item BMD tidak ditemukan!');
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
                } else if (targetRoom === 'Gudang Transit') {
                    status = 'Pesan Masuk';
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
                    tahun: bmdItem.tanggal_perolehan ? String(new Date(bmdItem.tanggal_perolehan).getFullYear()) : '',
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
                loadAllData();
            } catch (err) {
                console.error('Map Error:', err);
                alert('Gagal memetakan barang: ' + err.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});
