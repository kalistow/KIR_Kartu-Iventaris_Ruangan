// assets/js/modules/import/excelParser.js
// Modul parsing Excel yang memiliki satu tanggung jawab:
// Membaca file Excel dan menghasilkan array raw rows yang terstruktur.
// ─────────────────────────────────────────────────────────────────

/**
 * Parse workbook Excel menjadi raw BMD records.
 * Mengganti logika parsing dari processBmdUpload() di importExcel.js lama.
 *
 * @param {Object} workbook - Workbook dari XLSX.read()
 * @returns {{ records: Array, error: string|null, totalRawRows: number }}
 */
function parseBmdWorkbook(workbook) {
    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];
    const rows      = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (!rows || rows.length < 12) {
        return { records: [], error: 'Format file salah atau kosong! Minimal 12 baris diperlukan.', totalRawRows: 0 };
    }

    // Validasi template BMD: cek keberadaan keyword penting di header (baris 10-12)
    const headerRow = (rows[10] || []).concat(rows[11] || []);
    const headerStr = headerRow.join('').toLowerCase();
    if (!headerStr.includes('kode') && !headerStr.includes('nama') && !headerStr.includes('harga')) {
        return {
            records: [],
            error: 'Struktur file tidak sesuai template Master BMD. Kolom Kode Barang, Nama Barang, atau Harga tidak ditemukan.',
            totalRawRows: rows.length,
        };
    }

    const records = [];
    for (let i = 12; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 10) continue;

        const nibar = row[9] ? String(row[9]).trim() : '';
        const name  = row[8] ? String(row[8]).trim() : '';
        const qty   = parseInt(row[19]);

        if (nibar.startsWith('12') && name && !isNaN(qty) && qty > 0) {
            const codeParts = [row[1], row[2], row[3], row[4], row[5], row[7]]
                .filter(x => x !== undefined && x !== null && x !== '');
            const combinedCode = codeParts.length > 3
                ? codeParts.map(x => String(x).replace('.0', '').padStart(2, '0')).join('.')
                : (row[0] || '');

            records.push({
                nibar:               nibar,
                no_register:         row[10] ? String(row[10]).trim() : '',
                kode_barang:         combinedCode,
                nama_barang:         name,
                spesifikasi_nama:    row[11] ? String(row[11]).trim() : name,
                spesifikasi_lainnya: row[12] ? String(row[12]).trim() : '',
                merek_tipe:          row[14] ? String(row[14]).trim() : '',
                nomor_polisi:        row[16] ? String(row[16]).trim() : '',
                nomor_rangka:        row[17] ? String(row[17]).trim() : '',
                nomor_bpkb:          row[18] ? String(row[18]).trim() : '',
                jumlah:              qty,
                satuan:              row[20] ? String(row[20]).trim() : 'Buah',
                harga:               Math.round(parseFloat(row[22]) || 0),
                nilai:               Math.round(parseFloat(row[23]) || 0),
                cara_perolehan:      row[24] ? String(row[24]).trim() : '',
                tanggal_perolehan:   row[25] instanceof Date ? row[25].toISOString() : null,
                status_penggunaan:   row[26] ? String(row[26]).trim() : '',
                keterangan:          row[28] ? String(row[28]).trim() : '',
            });
        }
    }

    if (records.length === 0) {
        return {
            records: [],
            error: 'Tidak ada baris aset valid ditemukan! Periksa apakah kolom NIBAR dimulai dengan "12" dan kolom Jumlah berisi angka.',
            totalRawRows: rows.length,
        };
    }

    return { records, error: null, totalRawRows: rows.length };
}

/**
 * Parse workbook Excel KIR dengan auto-detect kolom dan nama ruangan.
 * Mengganti logika parsing dari processKirUpload() di importExcel.js lama.
 *
 * @param {Object} workbook - Workbook dari XLSX.read()
 * @returns {{ assets: Array, skippedSheets: string[], error: string|null }}
 */
function parseKirWorkbook(workbook) {
    const assets       = [];
    const skippedSheets = [];
    const SHEET_BLACKLIST = ['REKAP', 'REKAP BARANG ALL RUANGAN', 'KENDARAAN BERDASARKAN KIB', 'Sheet1'];

    workbook.SheetNames.forEach(sheetName => {
        if (SHEET_BLACKLIST.includes(sheetName)) {
            skippedSheets.push(sheetName);
            return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const standardRoom = window.RoomMapper
            ? window.RoomMapper.getStandardRoom(sheetName)
            : window.getStandardRoomName?.(sheetName);

        // Auto-detect header columns
        let colMap = {};
        let dataStartRow = 0;
        let hasRoomColumn = false;

        for (let h = 0; h < Math.min(rows.length, 12); h++) {
            const headerRow = rows[h];
            if (!headerRow) continue;
            const filled = headerRow.filter(c => c !== undefined && c !== null && String(c).trim() !== '');
            if (filled.length < 5) continue;

            // Baris numbering (1,2,3,...) → data mulai di baris berikutnya
            if (filled.length >= 5 && filled.every(c => !isNaN(Number(c)))) {
                dataStartRow = h + 1;
                continue;
            }

            headerRow.forEach((cell, idx) => {
                if (!cell) return;
                const val = String(cell).toLowerCase().trim();
                if (val.includes('urut') || val === 'no' || val === 'no.') colMap.urut = idx;
                if (val.includes('ruang'))   { colMap.ruangan = idx; hasRoomColumn = true; }
                if (val.includes('nama') && (val.includes('barang') || val.includes('jenis'))) colMap.nama = idx;
                if (val.includes('merk') || val.includes('model') || val.includes('merek')) colMap.merk = idx;
                if (val.includes('seri') || val.includes('pabrik')) colMap.noSeri = idx;
                if (val.includes('ukuran')) colMap.ukuran = idx;
                if (val.includes('bahan'))  colMap.bahan = idx;
                if (val.includes('tahun') || val.includes('pembuatan')) colMap.tahun = idx;
                if (val.includes('kode') && val.includes('barang')) colMap.kodeBarang = idx;
                if (val.includes('jumlah') || val.includes('register')) colMap.jumlah = idx;
                if (val.includes('harga') || val.includes('perolehan')) colMap.harga = idx;
                if (val.includes('kondisi') || val.includes('keadaan')) colMap.kondisi = idx;
                if (val === 'baik' || (val.includes('baik') && !val.includes('kurang'))) colMap.baik = idx;
                if (val.includes('kurang')) colMap.kurangBaik = idx;
                if (val.includes('rusak'))  colMap.rusakBerat = idx;
                if (val.includes('keterangan')) colMap.keterangan = idx;
            });

            const headerStr = headerRow.map(c => String(c || '').toLowerCase()).join('|');
            if (headerStr.includes('nama') && (headerStr.includes('barang') || headerStr.includes('jenis'))) {
                if (!dataStartRow) dataStartRow = h + 1;
            }
        }

        if (!standardRoom && !hasRoomColumn) {
            skippedSheets.push(sheetName);
            return;
        }

        // Fallback posisi kolom default
        if (Object.keys(colMap).length === 0) {
            colMap = { urut: 0, nama: 1, merk: 2, noSeri: 3, ukuran: 4, bahan: 5, tahun: 6, kodeBarang: 7, jumlah: 8, harga: 9, baik: 10, kurangBaik: 11, rusakBerat: 12, keterangan: 13 };
        }
        if (!dataStartRow || dataStartRow < 5) dataStartRow = 8;
        if (colMap.nama === undefined) colMap.nama = 1;

        // Parse data rows
        for (let i = dataStartRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 3) continue;

            const urut = parseInt(row[colMap.urut ?? 0]);
            if (isNaN(urut)) continue;

            const name = row[colMap.nama] ? String(row[colMap.nama]).trim() : '';
            if (!name || !isNaN(Number(name))) continue;

            // Tentukan ruangan
            let roomName = standardRoom;
            if (colMap.ruangan !== undefined && row[colMap.ruangan]) {
                const rawRoom = String(row[colMap.ruangan]).trim();
                const stdRoom = window.RoomMapper
                    ? window.RoomMapper.getStandardRoom(rawRoom)
                    : window.getStandardRoomName?.(rawRoom);
                roomName = stdRoom || rawRoom;
            }
            if (!roomName) roomName = 'Belum Diketahui';

            // Kondisi barang
            let kondisi = 'Baik';
            if (colMap.kondisi !== undefined && row[colMap.kondisi]) {
                const rawK = String(row[colMap.kondisi]).toLowerCase();
                if (rawK.includes('kurang')) kondisi = 'Kurang Baik';
                else if (rawK.includes('rusak') || rawK.includes('berat')) kondisi = 'Rusak Berat';
            } else {
                if (colMap.kurangBaik !== undefined && row[colMap.kurangBaik] != null && String(row[colMap.kurangBaik]).trim() !== '') kondisi = 'Kurang Baik';
                if (colMap.rusakBerat !== undefined && row[colMap.rusakBerat] != null && String(row[colMap.rusakBerat]).trim() !== '') kondisi = 'Rusak Berat';
            }

            // Kode barang
            const rawKode = colMap.kodeBarang !== undefined && row[colMap.kodeBarang] ? String(row[colMap.kodeBarang]).trim() : '';
            const rawReg  = colMap.jumlah !== undefined && row[colMap.jumlah] ? String(row[colMap.jumlah]).trim() : '';
            let kodeBarangCombined = rawKode;
            if (rawKode && rawReg) {
                const paddedReg = isNaN(Number(rawReg)) ? rawReg : String(rawReg).padStart(4, '0');
                kodeBarangCombined = `${rawKode}-${paddedReg}`;
            }

            const assetStatus = window.RoomMapper
                ? window.RoomMapper.getRoomStatus(roomName)
                : 'KIR';

            assets.push({
                master_bmd_id: null,
                no_urut:       urut,
                kode_barang:   kodeBarangCombined,
                nama_barang:   name,
                merk_model:    colMap.merk !== undefined && row[colMap.merk] ? String(row[colMap.merk]).trim() : '',
                no_seri:       colMap.noSeri !== undefined && row[colMap.noSeri] ? String(row[colMap.noSeri]).trim() : '',
                ukuran:        colMap.ukuran !== undefined && row[colMap.ukuran] ? String(row[colMap.ukuran]).trim() : '',
                bahan:         colMap.bahan !== undefined && row[colMap.bahan] ? String(row[colMap.bahan]).trim() : '',
                tahun:         colMap.tahun !== undefined && row[colMap.tahun] ? String(row[colMap.tahun]).trim() : '',
                jumlah:        1,
                harga:         colMap.harga !== undefined && row[colMap.harga] ? Math.round(parseFloat(row[colMap.harga]) || 0) : 0,
                ruangan:       roomName,
                kondisi:       kondisi,
                keterangan:    colMap.keterangan !== undefined && row[colMap.keterangan] ? String(row[colMap.keterangan]).trim() : '',
                status:        assetStatus,
            });
        }
    });

    if (assets.length === 0) {
        return {
            assets: [],
            skippedSheets,
            error: `Tidak ada data KIR valid! Sheet yang terbaca: ${workbook.SheetNames.join(', ')}. Pastikan nama sheet menyerupai nama ruangan.`,
        };
    }

    return { assets, skippedSheets, error: null };
}

window.ExcelParser = { parseBmdWorkbook, parseKirWorkbook };
