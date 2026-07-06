// assets/js/modules/import/fingerprint.js
// Membangun fingerprint deterministik untuk setiap aset.
// Fingerprint ini STABIL meskipun harga, tahun, atau NIBAR berubah.
// ─────────────────────────────────────────────────────────────────

/**
 * Bangun string fingerprint dari sebuah record BMD.
 * Fingerprint menggabungkan field-field yang tidak berubah secara identitas.
 *
 * Untuk kendaraan: gunakan no_polisi + no_rangka sebagai primary identity.
 * Untuk barang biasa: gunakan kode_barang + nama + merk + spesifikasi.
 *
 * @param {Object} record - Record BMD (sudah di-normalize via DataCleaner)
 * @returns {string} fingerprint string
 */
function buildFingerprint(record) {
    const nc = window.DataCleaner.normalizeCode;
    const nt = window.DataCleaner.normalizeText;

    const kode  = nc(record.kode_barang || '');
    const nama  = nt(record.nama_barang || record.spesifikasi_nama || '');
    const merk  = nt(record.merek_tipe || '');
    const spek  = nt(record.spesifikasi_nama || record.spesifikasi_lainnya || '');
    const sat   = nt(record.satuan || '');
    const nopol = (record.nomor_polisi || '').trim().toUpperCase().replace(/\s+/g, '');
    const norang = (record.nomor_rangka || '').trim().toUpperCase().replace(/\s+/g, '');

    // Kendaraan: identitas utama dari nomor polisi & rangka (sangat unik)
    if (nopol || norang) {
        const vehicleParts = [kode, nopol, norang].filter(Boolean);
        return vehicleParts.join('|');
    }

    // Barang biasa: kombinasi kode + nama + merk + spesifikasi + satuan
    const parts = [kode, nama, merk, spek, sat].filter(Boolean);
    return parts.join('|');
}

/**
 * Bangun Map dari fingerprint → record untuk lookup O(1).
 * @param {Array} records - Array record BMD yang sudah dibersihkan
 * @returns {Map<string, Object>} fingerprintMap
 */
function buildFingerprintMap(records) {
    const map = new Map();
    records.forEach(record => {
        const fp = buildFingerprint(record);
        if (fp && fp.length > 3) {
            // Simpan hanya yang pertama ditemukan jika ada duplikat
            if (!map.has(fp)) {
                map.set(fp, record);
            }
        }
    });
    return map;
}

window.Fingerprint = { buildFingerprint, buildFingerprintMap };
