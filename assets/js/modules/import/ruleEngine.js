// assets/js/modules/import/ruleEngine.js
// Scoring berbasis aturan (rule-based) berbobot per field.
// Total skor maksimum = 100 poin.
// ─────────────────────────────────────────────────────────────────

/**
 * Bobot penilaian per field.
 * Total bobot maksimum = 100.
 */
const RULE_WEIGHTS = {
    kode_barang:  40,   // kode barang sama persis → identitas terkuat
    nama_barang:  20,   // nama barang sama (setelah normalisasi)
    merek_tipe:   15,   // merek/tipe sama
    spesifikasi:  15,   // spesifikasi sama
    satuan:        5,   // unit/satuan sama
    harga_range:   5,   // harga dalam toleransi ±25%
};

/**
 * Hitung skor aturan antara record baru (incoming) dan kandidat (candidate).
 * Kedua record harus sudah di-normalize via DataCleaner (ada field _norm_*).
 *
 * @param {Object} incoming  - Record dari Excel baru (sudah dibersihkan)
 * @param {Object} candidate - Record dari database (sudah dibersihkan)
 * @returns {number} skor 0–100
 */
function scoreRule(incoming, candidate) {
    let score = 0;

    // 1. Kode barang (bobot tertinggi — 40 poin)
    const kodeIn  = incoming._norm_kode  || window.DataCleaner.normalizeCode(incoming.kode_barang || '');
    const kodeCan = candidate._norm_kode || window.DataCleaner.normalizeCode(candidate.kode_barang || '');
    if (kodeIn && kodeCan && kodeIn === kodeCan) {
        score += RULE_WEIGHTS.kode_barang;
    } else if (kodeIn && kodeCan && (kodeIn.startsWith(kodeCan) || kodeCan.startsWith(kodeIn))) {
        // Partial prefix match → setengah skor kode (kode kategori prefix)
        score += Math.floor(RULE_WEIGHTS.kode_barang * 0.5);
    }

    // 2. Nama barang (20 poin)
    const namaIn  = incoming._norm_nama  || window.DataCleaner.normalizeText(incoming.nama_barang || '');
    const namaCan = candidate._norm_nama || window.DataCleaner.normalizeText(candidate.nama_barang || '');
    if (namaIn && namaCan && namaIn === namaCan) {
        score += RULE_WEIGHTS.nama_barang;
    } else if (namaIn && namaCan && (namaIn.includes(namaCan) || namaCan.includes(namaIn))) {
        // Partial name match (satu mengandung yang lain)
        score += Math.floor(RULE_WEIGHTS.nama_barang * 0.5);
    }

    // 3. Merek/Tipe (15 poin)
    const merkIn  = incoming._norm_merk  || window.DataCleaner.normalizeText(incoming.merek_tipe || incoming.merk_model || '');
    const merkCan = candidate._norm_merk || window.DataCleaner.normalizeText(candidate.merek_tipe || '');
    if (merkIn && merkCan && merkIn === merkCan) {
        score += RULE_WEIGHTS.merek_tipe;
    } else if (merkIn && merkCan && (merkIn.includes(merkCan) || merkCan.includes(merkIn))) {
        score += Math.floor(RULE_WEIGHTS.merek_tipe * 0.5);
    }

    // 4. Spesifikasi (15 poin)
    const spekIn  = incoming._norm_spek  || window.DataCleaner.normalizeText(incoming.spesifikasi_nama || incoming.spesifikasi_lainnya || '');
    const spekCan = candidate._norm_spek || window.DataCleaner.normalizeText(candidate.spesifikasi_nama || candidate.spesifikasi_lainnya || '');
    if (spekIn && spekCan && spekIn === spekCan) {
        score += RULE_WEIGHTS.spesifikasi;
    } else if (spekIn && spekCan && (spekIn.includes(spekCan) || spekCan.includes(spekIn))) {
        score += Math.floor(RULE_WEIGHTS.spesifikasi * 0.5);
    }

    // 5. Satuan (5 poin)
    const satIn  = incoming._norm_satuan  || window.DataCleaner.normalizeText(incoming.satuan || '');
    const satCan = candidate._norm_satuan || window.DataCleaner.normalizeText(candidate.satuan || '');
    if (satIn && satCan && satIn === satCan) {
        score += RULE_WEIGHTS.satuan;
    }

    // 6. Range harga (5 poin) — toleransi ±25%
    const hargaIn  = parseFloat(incoming.harga)  || 0;
    const hargaCan = parseFloat(candidate.harga) || 0;
    if (hargaIn > 0 && hargaCan > 0) {
        const maxH = Math.max(hargaIn, hargaCan);
        const diff = Math.abs(hargaIn - hargaCan) / maxH;
        if (diff <= 0.25) score += RULE_WEIGHTS.harga_range;
    }

    return Math.min(score, 100);
}

/**
 * Cari kandidat terbaik dari daftar kandidat menggunakan rule-based scoring.
 * @param {Object} incoming - Record baru (sudah dibersihkan)
 * @param {Array}  candidates - Array kandidat dari database (sudah dibersihkan)
 * @returns {{ candidate: Object|null, score: number }} kandidat terbaik dan skor-nya
 */
function findBestRuleMatch(incoming, candidates) {
    let bestScore = 0;
    let bestCandidate = null;

    for (const candidate of candidates) {
        const score = scoreRule(incoming, candidate);
        if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
        }
    }

    return { candidate: bestCandidate, score: bestScore };
}

window.RuleEngine = { RULE_WEIGHTS, scoreRule, findBestRuleMatch };
