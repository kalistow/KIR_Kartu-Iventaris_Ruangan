// assets/js/modules/import/verification.js
// Kelola antrian verifikasi untuk kasus matching yang ambigu (REVIEW).
// Menulis ke tabel verification_queue di Supabase dan membaca untuk UI.
// ─────────────────────────────────────────────────────────────────

/**
 * Simpan batch hasil matching REVIEW ke tabel verification_queue.
 * @param {Array}  reviewItems   - Array hasil matching dengan status REVIEW
 * @param {string} importSession - UUID sesi impor
 * @returns {Promise<number>} Jumlah item berhasil disimpan
 */
async function saveToVerificationQueue(reviewItems, importSession) {
    if (!reviewItems || reviewItems.length === 0) return 0;

    const records = reviewItems.map(item => ({
        import_session:  importSession,
        incoming_data:   JSON.stringify(item.incoming),
        candidate_data:  item.candidate ? JSON.stringify(item.candidate) : null,
        confidence:      item.score || 0,
        status:          'REVIEW',
        created_at:      new Date().toISOString(),
    }));

    let saved = 0;
    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        try {
            const { error } = await supabaseClient.from('verification_queue').insert(chunk);
            if (!error) saved += chunk.length;
            else console.warn('[Verification] Insert chunk error:', error);
        } catch (err) {
            console.warn('[Verification] Batch save error:', err);
        }
    }
    return saved;
}

/**
 * Ambil daftar item dari verification_queue dengan filter status.
 * @param {'REVIEW'|'APPROVED'|'REJECTED'|'ALL'} statusFilter
 * @param {string|null} sessionId - Filter per sesi, null untuk semua
 * @returns {Promise<Array>}
 */
async function fetchVerificationQueue(statusFilter = 'REVIEW', sessionId = null) {
    try {
        let query = supabaseClient
            .from('verification_queue')
            .select('*')
            .order('created_at', { ascending: false });

        if (statusFilter !== 'ALL') {
            query = query.eq('status', statusFilter);
        }
        if (sessionId) {
            query = query.eq('import_session', sessionId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(item => ({
            ...item,
            incoming_data:  tryParse(item.incoming_data),
            candidate_data: tryParse(item.candidate_data),
        }));
    } catch (err) {
        console.error('[Verification] Fetch queue error:', err);
        return [];
    }
}

/**
 * Setujui item dari antrian verifikasi.
 * Ini akan memperbarui status menjadi APPROVED dan melakukan update ke master_bmd.
 * @param {number} queueId   - ID di verification_queue
 * @param {Object} resolvedData - Data final yang diputuskan admin (bisa dari candidate atau incoming)
 * @param {string} adminEmail
 * @returns {Promise<boolean>}
 */
async function approveVerificationItem(queueId, resolvedData, adminEmail = '') {
    try {
        // Update queue item ke APPROVED
        const { error: qErr } = await supabaseClient
            .from('verification_queue')
            .update({
                status:      'APPROVED',
                decision_by: adminEmail,
                decision_at: new Date().toISOString(),
                notes:       'Disetujui oleh admin',
            })
            .eq('id', queueId);
        if (qErr) throw qErr;

        // Jika ada candidate (sudah ada di DB), update master_bmd
        if (resolvedData?.candidateId) {
            const { error: uErr } = await supabaseClient
                .from('master_bmd')
                .update({
                    jumlah:          resolvedData.jumlah,
                    harga:           resolvedData.harga,
                    nilai:           resolvedData.nilai,
                    keterangan:      resolvedData.keterangan,
                    status_penggunaan: 'Aktif',
                    last_import_session: resolvedData.importSession,
                })
                .eq('id', resolvedData.candidateId);
            if (uErr) throw uErr;
        } else if (resolvedData?.incoming) {
            // Insert sebagai aset baru
            const { error: iErr } = await supabaseClient
                .from('master_bmd')
                .insert([{ ...resolvedData.incoming, status_penggunaan: 'Aktif' }]);
            if (iErr) throw iErr;
        }

        return true;
    } catch (err) {
        console.error('[Verification] Approve error:', err);
        return false;
    }
}

/**
 * Tolak item dari antrian verifikasi (tandai REJECTED).
 * @param {number} queueId
 * @param {string} notes     - Alasan penolakan oleh admin
 * @param {string} adminEmail
 * @returns {Promise<boolean>}
 */
async function rejectVerificationItem(queueId, notes = '', adminEmail = '') {
    try {
        const { error } = await supabaseClient
            .from('verification_queue')
            .update({
                status:      'REJECTED',
                decision_by: adminEmail,
                decision_at: new Date().toISOString(),
                notes:       notes || 'Ditolak oleh admin',
            })
            .eq('id', queueId);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('[Verification] Reject error:', err);
        return false;
    }
}

/**
 * Bulk approve beberapa item sekaligus.
 * @param {number[]} queueIds
 * @param {string}   adminEmail
 * @returns {Promise<number>} jumlah item berhasil disetujui
 */
async function bulkApproveItems(queueIds, adminEmail = '') {
    let count = 0;
    for (const id of queueIds) {
        const ok = await approveVerificationItem(id, null, adminEmail);
        if (ok) count++;
    }
    return count;
}

/** Safe JSON parse helper */
function tryParse(str) {
    if (!str) return null;
    if (typeof str === 'object') return str;
    try { return JSON.parse(str); } catch { return null; }
}

window.Verification = {
    saveToVerificationQueue,
    fetchVerificationQueue,
    approveVerificationItem,
    rejectVerificationItem,
    bulkApproveItems,
};
