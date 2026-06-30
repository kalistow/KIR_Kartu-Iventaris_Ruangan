// assets/js/utils/fuzzy.js

function getStandardRoomName(sheetName) {
    const clean = sheetName.toUpperCase().replace('RUANG ', '').trim();
    if (clean.includes('KABAN') || clean.includes('KEPALA')) return "Ruang Kaban (Kepala Badan)";
    if (clean.includes('SEKRETARIS')) return "Ruang Sekretaris";
    if (clean.includes('SEKRETARIAT')) return "Ruang Sekretariat";
    if (clean.includes('KEUANGAN')) return "Ruang Kasubbag Keuangan";
    if (clean.includes('UMPEG') || clean.includes('UMUM')) return "Ruang Kasubbag Umpeg";
    if (clean.includes('SUNRAM') || clean.includes('PERENCANAAN')) return "Ruang Kasubbag Sunram";
    if (clean.includes('SELASAR')) return "Ruang Selasar";
    if (clean.includes('RAPAT')) return "Ruang Rapat";
    if (clean.includes('PELAYANAN')) return "Ruang Pelayanan";
    if (clean.includes('DAPUR')) return "Ruang Dapur";
    if (clean.includes('IDEOLOGI')) return "Ruang Kabid Ideologi";
    if (clean.includes('HANSENIBUD') || clean.includes('SENI')) return "Ruang Kabid Hansenibud";
    if (clean.includes('POLITIK')) return "Ruang Kabid Politik";
    if (clean.includes('WASNAS')) return "Ruang Kabid Wasnas";
    
    // Add mapping for special non-physical rooms/locations
    if (clean.includes('DEPAN BIDANG')) return "Depan Bidang";
    if (clean.includes('INVENTARIS KANTOR') || clean.includes('BARANG INVENTARIS')) return "Inventaris Kantor";
    if (clean.includes('KENDARAAN')) return "Kendaraan Dinas";
    
    return null; // non-room or unmapped sheet
}

// 1. Algoritma Levenshtein Distance (Mengukur jarak antar karakter)
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(matrix[i][j - 1] + 1, // insertion
                             matrix[i - 1][j] + 1) // deletion
                );
            }
        }
    }
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1.0 : (1.0 - (matrix[b.length][a.length] / maxLen));
}

// 2. Algoritma Token Set Ratio (Mengukur kemiripan tanpa mempedulikan urutan kata)
function tokenSetRatio(str1, str2) {
    const set1 = new Set(str1.split(/\s+/).filter(x => x.length > 0));
    const set2 = new Set(str2.split(/\s+/).filter(x => x.length > 0));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const diff1to2 = new Set([...set1].filter(x => !set2.has(x)));
    const diff2to1 = new Set([...set2].filter(x => !set1.has(x)));
    
    const sortedIntersect = [...intersection].sort().join(' ');
    const sorted1 = [...intersection, ...diff1to2].sort().join(' ');
    const sorted2 = [...intersection, ...diff2to1].sort().join(' ');
    
    // Bandingkan gabungan dari irisan dan perbedaan menggunakan Levenshtein
    const score1 = levenshteinDistance(sortedIntersect, sorted1);
    const score2 = levenshteinDistance(sortedIntersect, sorted2);
    const score3 = levenshteinDistance(sorted1, sorted2);
    
    return Math.max(score1, score2, score3);
}

// Gabungan Skor (Otak Utama)
function getFuzzySimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (s1 === s2) return 1.0;
    
    // Kombinasi 40% jarak huruf, 60% himpunan kata
    const levScore = levenshteinDistance(s1, s2);
    const tokenScore = tokenSetRatio(s1, s2);
    
    return (levScore * 0.4) + (tokenScore * 0.6); // Lebih bobot ke Token Set Ratio
}

function getBmdCandidates(kirName, kirPrice, globalMasterBmd) {
    const candidates = [];
    const price = parseFloat(kirPrice) || 0;
    
    globalMasterBmd.forEach(b => {
        const bPrice = parseFloat(b.harga) || 0;
        const priceDiff = Math.abs(bPrice - price);
        
        // Dapatkan skor kemiripan algoritma baru
        const sim = getFuzzySimilarity(b.nama_barang, kirName);
        
        const isPriceMatch = priceDiff < 10;
        
        // Kriteria diperbarui dengan algoritma cerdas
        // Jika harganya sama, kemiripan 40% saja sudah cukup
        // Jika harganya beda, wajib mirip minimal 70%
        let isMatch = false;
        if (isPriceMatch && sim >= 0.40) {
            isMatch = true;
        } else if (!isPriceMatch && sim >= 0.70) {
            isMatch = true;
        } else if (price > 0 && (priceDiff / price < 0.1) && sim >= 0.55) {
            isMatch = true;
        }
        
        if (isMatch) {
            candidates.push({
                id: b.id,
                nibar: b.nibar || '',
                nama_barang: b.nama_barang,
                merek_tipe: b.merek_tipe || '',
                harga: b.harga,
                tanggal_perolehan: b.tanggal_perolehan,
                kode_barang: b.kode_barang || '',
                similarity: sim,
                priceDiff: priceDiff
            });
        }
    });
    
    // Sort candidates: Paling mirip ke paling tidak mirip
    candidates.sort((x, y) => {
        if (x.priceDiff < 10 && y.priceDiff >= 10) return -1;
        if (y.priceDiff < 10 && x.priceDiff >= 10) return 1;
        return y.similarity - x.similarity;
    });
    
    return candidates.slice(0, 8);
}

// Export functions to global scope to prevent linter warnings
window.getStandardRoomName = getStandardRoomName;
window.getFuzzySimilarity = getFuzzySimilarity;
window.getBmdCandidates = getBmdCandidates;
