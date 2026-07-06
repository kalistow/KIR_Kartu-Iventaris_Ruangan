// assets/js/modules/import/dataCleaner.js
// Modul normalisasi & pembersihan data aset sebelum proses matching.
// ─────────────────────────────────────────────────────────────────

const _ABBREVIATIONS = {
    'lpt':     'laptop',
    'mntr':    'monitor',
    'kmpter':  'komputer',
    'kmptr':   'komputer',
    'prntr':   'printer',
    'scnr':    'scanner',
    'projctr': 'proyektor',
    'proyekt': 'proyektor',
    'ac':      'air conditioner',
    'krs':     'kursi',
    'lemri':   'lemari',
    'telp':    'telepon',
    'tlp':     'telepon',
    'pc':      'personal computer',
    'nb':      'notebook',
    'ups':     'uninterruptible power supply',
    'cpu':     'central processing unit',
    'ssd':     'solid state drive',
    'hdd':     'hard disk drive',
    'ram':     'random access memory',
    'tv':      'televisi',
    'dvd':     'dvd player',
    'cctv':    'closed circuit television',
    'gprs':    'gps',
    'filling': 'filing',
    'kabinet': 'cabinet',
    'almari':  'lemari',
};

/**
 * Normalisasi teks: lowercase, hilangkan tanda baca, normalisasi spasi, ekspansi singkatan.
 * @param {string} str
 * @returns {string}
 */
function normalizeText(str = '') {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .replace(/\./g, '')             // hapus tanda titik terlebih dahulu agar "A.C. Split" -> "ac split" -> "air conditioner split"
        .replace(/[^\w\s]/g, ' ')       // ganti tanda baca lain dengan spasi
        .replace(/\s+/g, ' ')           // normalisasi multiple spasi
        .trim()
        .split(' ')
        .map(word => _ABBREVIATIONS[word] || word)
        .join(' ');
}

/**
 * Normalisasi kode barang: hapus .0, hapus spasi, uppercase.
 * @param {string} code
 * @returns {string}
 */
function normalizeCode(code = '') {
    if (!code) return '';
    return String(code)
        .trim()
        .replace(/\.0/g, '')            // hapus ".0" dari angka float
        .replace(/\s+/g, '')
        .toUpperCase();
}

/**
 * Normalisasi angka harga / nilai.
 * @param {*} val
 * @returns {number}
 */
function normalizePrice(val) {
    if (!val) return 0;
    const str = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(str) || 0;
}

/**
 * Bersihkan dan normalisasi satu record BMD mentah.
 * Menambahkan field _norm_* yang digunakan oleh engine matching.
 * @param {Object} raw
 * @returns {Object}
 */
function cleanBmdRecord(raw) {
    return {
        ...raw,
        _norm_nama:   normalizeText(raw.nama_barang || raw.spesifikasi_nama || ''),
        _norm_merk:   normalizeText(raw.merek_tipe || ''),
        _norm_spek:   normalizeText(raw.spesifikasi_nama || raw.spesifikasi_lainnya || ''),
        _norm_kode:   normalizeCode(raw.kode_barang || ''),
        _norm_satuan: normalizeText(raw.satuan || ''),
        harga:        normalizePrice(raw.harga),
        jumlah:       parseInt(raw.jumlah) || 0,
    };
}

/**
 * Bersihkan dan normalisasi satu record KIR mentah.
 * @param {Object} raw
 * @returns {Object}
 */
function cleanKirRecord(raw) {
    return {
        ...raw,
        _norm_nama:  normalizeText(raw.nama_barang || raw.merk_model || ''),
        _norm_merk:  normalizeText(raw.merk_model || ''),
        _norm_spek:  normalizeText(raw.no_seri || raw.ukuran || ''),
        _norm_kode:  normalizeCode(raw.kode_barang || ''),
        harga:       normalizePrice(raw.harga),
    };
}

/**
 * Batch clean semua records.
 * @param {Array} records
 * @param {'bmd'|'kir'} type
 * @returns {Array}
 */
function cleanRecords(records, type = 'bmd') {
    return records.map(r => type === 'bmd' ? cleanBmdRecord(r) : cleanKirRecord(r));
}

window.DataCleaner = { normalizeText, normalizeCode, normalizePrice, cleanBmdRecord, cleanKirRecord, cleanRecords };
