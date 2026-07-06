// assets/js/modules/import/similarity.js
// Fuzzy matching menggunakan algoritma lokal (Token Set Ratio + Levenshtein).
// Fuse.js dipakai sebagai lapisan tambahan untuk nama barang.
// ─────────────────────────────────────────────────────────────────

/**
 * Hitung Levenshtein Distance normalized (0.0–1.0 similarity).
 * 1.0 = identik, 0.0 = sama sekali berbeda.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshteinSim(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const la = a.length, lb = b.length;
    const matrix = Array.from({ length: lb + 1 }, (_, i) => [i]);
    for (let j = 0; j <= la; j++) matrix[0][j] = j;
    for (let i = 1; i <= lb; i++) {
        for (let j = 1; j <= la; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = 1 + Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]);
            }
        }
    }
    const maxLen = Math.max(la, lb);
    return maxLen === 0 ? 1 : 1 - matrix[lb][la] / maxLen;
}

/**
 * Token Set Ratio: kemiripan tanpa mempedulikan urutan kata.
 * Berguna untuk: "Kursi Kerja Putar" vs "Putar Kerja Kursi"
 * @param {string} str1
 * @param {string} str2
 * @returns {number} 0.0–1.0
 */
function tokenSetRatio(str1, str2) {
    if (!str1 || !str2) return 0;
    const t1 = new Set(str1.split(/\s+/).filter(x => x.length > 0));
    const t2 = new Set(str2.split(/\s+/).filter(x => x.length > 0));
    const inter    = new Set([...t1].filter(x => t2.has(x)));
    const diff1to2 = new Set([...t1].filter(x => !t2.has(x)));
    const diff2to1 = new Set([...t2].filter(x => !t1.has(x)));
    const sortInter = [...inter].sort().join(' ');
    const sorted1   = [...inter, ...diff1to2].sort().join(' ');
    const sorted2   = [...inter, ...diff2to1].sort().join(' ');
    return Math.max(
        levenshteinSim(sortInter, sorted1),
        levenshteinSim(sortInter, sorted2),
        levenshteinSim(sorted1, sorted2)
    );
}

/**
 * Hitung similarity gabungan (40% Levenshtein + 60% Token Set Ratio).
 * @param {string} a
 * @param {string} b
 * @returns {number} 0.0–1.0
 */
function getSimilarity(a, b) {
    if (!a || !b) return 0;
    const na = window.DataCleaner.normalizeText(a);
    const nb = window.DataCleaner.normalizeText(b);
    if (na === nb) return 1;
    return (levenshteinSim(na, nb) * 0.4) + (tokenSetRatio(na, nb) * 0.6);
}

/**
 * Cari kandidat fuzzy terbaik dari daftar menggunakan Fuse.js (jika tersedia) atau fallback lokal.
 * @param {string} incomingName - Nama barang dari Excel (sudah dinormalisasi)
 * @param {Array}  candidates   - Array kandidat dari database
 * @param {number} minScore     - Skor minimum (0–100) untuk dipertimbangkan
 * @returns {Array<{candidate, fuseScore}>} Hasil terurut dari yang paling mirip
 */
function findFuzzyMatches(incomingName, candidates, minScore = 50) {
    if (!incomingName || !candidates || candidates.length === 0) return [];

    const normalizedInput = window.DataCleaner.normalizeText(incomingName);

    // Coba gunakan Fuse.js jika sudah di-load via CDN
    if (window.Fuse) {
        const fuse = new window.Fuse(candidates, {
            keys: ['_norm_nama', 'nama_barang'],
            threshold: 0.5,      // 0 = exact, 1 = very fuzzy
            includeScore: true,
            minMatchCharLength: 3,
        });
        const results = fuse.search(normalizedInput);
        return results
            .map(r => ({
                candidate: r.item,
                fuseScore: Math.round((1 - r.score) * 100),
            }))
            .filter(r => r.fuseScore >= minScore)
            .sort((a, b) => b.fuseScore - a.fuseScore);
    }

    // Fallback: algoritma lokal Token Set Ratio + Levenshtein
    return candidates
        .map(candidate => {
            const normCand = candidate._norm_nama || window.DataCleaner.normalizeText(candidate.nama_barang || '');
            const sim = getSimilarity(normalizedInput, normCand);
            return { candidate, fuseScore: Math.round(sim * 100) };
        })
        .filter(r => r.fuseScore >= minScore)
        .sort((a, b) => b.fuseScore - a.fuseScore)
        .slice(0, 10);
}

window.Similarity = { levenshteinSim, tokenSetRatio, getSimilarity, findFuzzyMatches };
