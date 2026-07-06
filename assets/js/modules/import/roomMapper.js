// assets/js/modules/import/roomMapper.js
// Memetakan aset BMD ke ruangan KIR.
// Mengelola perpindahan ruangan dan mendeteksi status MOVED.
// ─────────────────────────────────────────────────────────────────

/**
 * Dapatkan nama ruangan standar dari nama sheet Excel atau string ruangan.
 * Re-export dari fuzzy.js yang sudah ada untuk menghindari duplikasi.
 * @param {string} rawName
 * @returns {string|null}
 */
function getStandardRoom(rawName) {
    // Delegasi ke fungsi lama yang sudah ada di fuzzy.js
    if (window.getStandardRoomName) {
        return window.getStandardRoomName(rawName);
    }
    // Fallback inline jika belum load
    const clean = (rawName || '').toUpperCase().replace('RUANG ', '').trim();
    if (clean.includes('KABAN') || clean.includes('KEPALA')) return 'Ruang Kaban (Kepala Badan)';
    if (clean.includes('SEKRETARIS')) return 'Ruang Sekretaris';
    if (clean.includes('KEUANGAN')) return 'Ruang Kasubbag Keuangan';
    if (clean.includes('RAPAT')) return 'Ruang Rapat';
    return null;
}

/**
 * Tentukan status aset berdasarkan nama ruangan.
 * @param {string} roomName
 * @returns {'KIR'|'Non-KIR'|'Belum Terpetakan'|'Dihibahkan'}
 */
function getRoomStatus(roomName) {
    if (!roomName) return 'Belum Terpetakan';
    const r = roomName.toLowerCase();
    if (r.includes('kendaraan') || r.includes('non-kir') || r.includes('inventaris kantor') || r.includes('depan bidang')) {
        return 'Non-KIR';
    }
    if (r.includes('dicari') || r.includes('harus dicari')) return 'Masih Harus Dicari';
    if (r.includes('dihibahkan')) return 'Dihibahkan';
    if (r.includes('belum diketahui') || r.includes('belum terpetakan')) return 'Belum Terpetakan';
    return 'KIR';
}

/**
 * Cek apakah sebuah aset pindah ruangan dibandingkan record sebelumnya di database.
 * @param {string} newRoom  - Ruangan baru dari file Excel
 * @param {string} oldRoom  - Ruangan lama dari database
 * @returns {boolean}
 */
function isRoomChanged(newRoom, oldRoom) {
    if (!newRoom || !oldRoom) return false;
    return newRoom.trim().toLowerCase() !== oldRoom.trim().toLowerCase();
}

/**
 * Build payload perpindahan ruangan untuk dimasukkan ke riwayat_barang.
 * @param {Object} asset    - Record assets dari database
 * @param {string} newRoom  - Ruangan tujuan baru
 * @param {string} session  - UUID import session
 * @returns {Object}
 */
function buildRoomMoveHistory(asset, newRoom, session) {
    return {
        asset_id:        asset.id,
        jenis_perubahan: 'Perpindahan Ruangan',
        keterangan:      `Aset dipindahkan dari "${asset.ruangan}" ke "${newRoom}" (via sinkronisasi BMD, sesi: ${session}).`,
        tanggal:         new Date().toISOString(),
    };
}

/**
 * Proses pemetaan aset ke ruangan secara batch.
 * Untuk setiap aset yang ruangannya berubah, catat riwayat.
 *
 * @param {Array}  assetUpdates  - Array { id, ruangan_baru, ruangan_lama }
 * @param {string} importSession - UUID sesi impor
 * @returns {Promise<{ moved: number, unchanged: number }>}
 */
async function processRoomMappings(assetUpdates, importSession) {
    const movedAssets = assetUpdates.filter(a => isRoomChanged(a.ruangan_baru, a.ruangan_lama));
    const histories   = movedAssets.map(a => buildRoomMoveHistory(
        { id: a.id, ruangan: a.ruangan_lama },
        a.ruangan_baru,
        importSession
    ));

    if (histories.length > 0) {
        try {
            await supabaseClient.from('riwayat_barang').insert(histories);
        } catch (err) {
            console.warn('[RoomMapper] Gagal menyimpan riwayat perpindahan:', err);
        }
    }

    return {
        moved:     movedAssets.length,
        unchanged: assetUpdates.length - movedAssets.length,
    };
}

window.RoomMapper = { getStandardRoom, getRoomStatus, isRoomChanged, buildRoomMoveHistory, processRoomMappings };
