// assets/js/modules/import/confidence.js
// Kalkulasi dan klasifikasi confidence score hasil matching.
// Menentukan apakah record bisa di-commit otomatis atau butuh review admin.
// ─────────────────────────────────────────────────────────────────

/**
 * Threshold skor untuk klasifikasi keputusan.
 */
const CONFIDENCE_THRESHOLDS = {
    AUTO_MATCH:  95,   // ≥95 → commit otomatis ke database
    NEED_REVIEW: 80,   // 80–94 → masuk antrian verifikasi admin
    NEW_ASSET:    0,   // <80 → aset baru, insert ke master_bmd
};

/**
 * Status yang mungkin dari sebuah hasil matching.
 */
const MATCH_STATUS = {
    MATCHED:  'MATCHED',   // Cocok otomatis, tidak ada perubahan data
    UPDATED:  'UPDATED',   // Cocok otomatis, ada perubahan field (harga, jumlah, dsb)
    REVIEW:   'REVIEW',    // 80–94, butuh keputusan admin
    NEW:      'NEW',       // <80, dianggap aset baru
    MISSING:  'MISSING',   // Ada di DB lama, tidak muncul di Excel terbaru
    MOVED:    'MOVED',     // Pindah ruangan (KIR flow)
};

/**
 * Klasifikasikan hasil matching berdasarkan skor confidence.
 *
 * @param {number}  score      - Skor 0–100 dari ruleEngine atau similarity
 * @param {boolean} isModified - Ada perubahan field data (harga, jumlah, dll)?
 * @param {boolean} isNew      - Tidak ada kandidat sama sekali?
 * @returns {{ status: string, score: number, label: string }}
 */
function classifyMatch(score, isModified = false, isNew = false) {
    if (isNew || score < CONFIDENCE_THRESHOLDS.NEED_REVIEW) {
        if (isNew) {
            return { status: MATCH_STATUS.NEW, score: 0, label: 'Aset Baru' };
        }
        return { status: MATCH_STATUS.NEW, score, label: 'Aset Baru (Skor Rendah)' };
    }
    if (score >= CONFIDENCE_THRESHOLDS.AUTO_MATCH) {
        const status = isModified ? MATCH_STATUS.UPDATED : MATCH_STATUS.MATCHED;
        const label  = isModified ? 'Diperbarui Otomatis' : 'Cocok Otomatis';
        return { status, score, label };
    }
    // 80–94
    return { status: MATCH_STATUS.REVIEW, score, label: 'Perlu Verifikasi' };
}

/**
 * Cek apakah ada perbedaan field penting antara record baru dan kandidat di DB.
 * @param {Object} incoming  - Record dari Excel
 * @param {Object} candidate - Record dari database
 * @returns {boolean} true jika ada perbedaan signifikan
 */
function hasSignificantChange(incoming, candidate) {
    const hargaIn  = parseFloat(incoming.harga)  || 0;
    const hargaCan = parseFloat(candidate.harga) || 0;
    const jumlahIn  = parseInt(incoming.jumlah)  || 0;
    const jumlahCan = parseInt(candidate.jumlah) || 0;
    const merkIn  = window.DataCleaner.normalizeText(incoming.merek_tipe || incoming.merk_model || '');
    const merkCan = window.DataCleaner.normalizeText(candidate.merek_tipe || '');

    if (jumlahIn !== jumlahCan) return true;
    if (hargaIn > 0 && hargaCan > 0 && Math.abs(hargaIn - hargaCan) / Math.max(hargaIn, hargaCan) > 0.01) return true;
    if (merkIn && merkCan && merkIn !== merkCan) return true;
    return false;
}

/**
 * Hitung skor gabungan antara rule score dan fuzzy score.
 * Rule score diprioritaskan lebih tinggi karena deterministik.
 * @param {number} ruleScore  - 0–100
 * @param {number} fuzzyScore - 0–100
 * @returns {number} skor gabungan 0–100
 */
function combineScores(ruleScore, fuzzyScore) {
    // 70% rule, 30% fuzzy
    return Math.round(ruleScore * 0.7 + fuzzyScore * 0.3);
}

window.Confidence = {
    CONFIDENCE_THRESHOLDS,
    MATCH_STATUS,
    classifyMatch,
    hasSignificantChange,
    combineScores,
};
