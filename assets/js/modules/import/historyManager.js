// assets/js/modules/import/historyManager.js
// Audit trail tanpa overwrite — semua perubahan dicatat ke riwayat_barang & asset_versions.
// Prinsip: data lama TIDAK PERNAH dihapus, selalu buat versi baru.
// ─────────────────────────────────────────────────────────────────

/**
 * Simpan log satu record perubahan ke tabel riwayat_barang.
 * @param {Object} options
 * @param {number|null} options.assetId       - ID dari tabel assets (null jika global)
 * @param {string}      options.jenisPerubahan - Deskripsi singkat jenis perubahan
 * @param {string}      options.keterangan     - Detail perubahan
 * @param {Object}      [options.detailBefore] - Snapshot data sebelumnya (JSONB)
 * @param {Object}      [options.detailAfter]  - Snapshot data baru (JSONB)
 * @returns {Promise<void>}
 */
async function logChange({ assetId, jenisPerubahan, keterangan, detailBefore = null, detailAfter = null }) {
    try {
        await supabaseClient.from('riwayat_barang').insert([{
            asset_id:         assetId || null,
            jenis_perubahan:  jenisPerubahan,
            keterangan:       keterangan,
            detail_before:    detailBefore ? JSON.stringify(detailBefore) : null,
            detail_after:     detailAfter  ? JSON.stringify(detailAfter)  : null,
            tanggal:          new Date().toISOString(),
        }]);
    } catch (err) {
        console.warn('[HistoryManager] Gagal mencatat riwayat:', err);
    }
}

/**
 * Simpan snapshot versi aset sebelum data diubah ke tabel asset_versions.
 * @param {Object} masterBmdRecord - Record master_bmd SEBELUM diupdate
 * @param {string} importSession   - UUID sesi impor
 * @returns {Promise<void>}
 */
async function saveAssetVersion(masterBmdRecord, importSession) {
    try {
        await supabaseClient.from('asset_versions').insert([{
            master_bmd_id:  masterBmdRecord.id,
            import_session: importSession,
            nama_barang:    masterBmdRecord.nama_barang,
            kode_barang:    masterBmdRecord.kode_barang,
            merek_tipe:     masterBmdRecord.merek_tipe,
            spesifikasi:    masterBmdRecord.spesifikasi_nama || masterBmdRecord.spesifikasi_lainnya,
            harga:          masterBmdRecord.harga,
            jumlah:         masterBmdRecord.jumlah,
            satuan:         masterBmdRecord.satuan,
            snapshot_at:    new Date().toISOString(),
        }]);
    } catch (err) {
        console.warn('[HistoryManager] Gagal menyimpan versi aset:', err);
    }
}

/**
 * Batch log perubahan untuk semua matched/updated records.
 * @param {Array}  matchResults  - Array hasil matching (dari matchingEngine)
 * @param {string} importSession - UUID sesi impor
 * @returns {Promise<void>}
 */
async function batchLogImportChanges(matchResults, importSession) {
    const now = new Date().toISOString();
    const logs = [];

    for (const result of matchResults) {
        const { status, incoming, candidate, score } = result;

        let keterangan = '';
        if (status === 'MATCHED') {
            keterangan = `Auto-match (score: ${score}%) — Tidak ada perubahan data.`;
        } else if (status === 'UPDATED') {
            keterangan = `Auto-match + update (score: ${score}%) — Data diperbarui dari file BMD terbaru.`;
        } else if (status === 'NEW') {
            keterangan = `Aset baru terdeteksi (score: ${score}%) — Diinsert sebagai master_bmd baru.`;
        } else if (status === 'REVIEW') {
            keterangan = `Masuk antrian verifikasi (score: ${score}%) — Menunggu konfirmasi admin.`;
        } else if (status === 'MISSING') {
            keterangan = `Aset tidak ditemukan di file BMD terbaru — Ditandai Perlu Verifikasi.`;
        }

        logs.push({
            asset_id:        candidate?.id || null,
            jenis_perubahan: `Impor BMD — ${status}`,
            keterangan,
            tanggal:         now,
        });
    }

    // Batch insert riwayat — chunk 100 record
    const chunkSize = 100;
    for (let i = 0; i < logs.length; i += chunkSize) {
        const chunk = logs.slice(i, i + chunkSize);
        try {
            await supabaseClient.from('riwayat_barang').insert(chunk);
        } catch (err) {
            console.warn('[HistoryManager] Batch log error:', err);
        }
    }
}

/**
 * Buat atau update record sesi impor di tabel import_sessions.
 * @param {Object} sessionData
 * @returns {Promise<string>} UUID sesi impor
 */
async function createImportSession(sessionData) {
    try {
        const { data, error } = await supabaseClient.from('import_sessions').insert([sessionData]).select('id');
        if (error) throw error;
        return data?.[0]?.id || null;
    } catch (err) {
        console.warn('[HistoryManager] Gagal membuat sesi impor:', err);
        return null;
    }
}

/**
 * Update statistik sesi impor setelah pipeline selesai.
 * @param {string} sessionId  - UUID sesi
 * @param {Object} stats      - { matched_auto, need_review, new_assets, missing, status }
 * @returns {Promise<void>}
 */
async function updateImportSession(sessionId, stats) {
    if (!sessionId) return;
    try {
        await supabaseClient.from('import_sessions').update({
            ...stats,
            completed_at: new Date().toISOString(),
        }).eq('id', sessionId);
    } catch (err) {
        console.warn('[HistoryManager] Gagal update sesi impor:', err);
    }
}

window.HistoryManager = {
    logChange,
    saveAssetVersion,
    batchLogImportChanges,
    createImportSession,
    updateImportSession,
};
