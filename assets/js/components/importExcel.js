// assets/js/components/importExcel.js

window.openImportModal = function() {
    document.getElementById('excel-file-input').value = '';
    document.getElementById('file-drag-label').textContent = 'Seret file Excel Anda ke sini atau klik untuk memilih file';
    document.getElementById('file-name-label').textContent = 'Mendukung format .xlsx dan .xls';
    document.getElementById('import-progress').classList.add('hidden');
    document.getElementById('start-import-btn').disabled = true;
    document.getElementById('start-import-btn').className = "clay-btn px-8 py-3 bg-pastel-blue text-blue-900 opacity-50 cursor-not-allowed !shadow-clay-blue";
    uploadedFileObject = null;
    
    const modal = document.getElementById('import-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeImportModal = function() {
    const modal = document.getElementById('import-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.toggleImportLabel = function(type) {
    const lblBmd = document.getElementById('lbl-type-bmd');
    const lblKir = document.getElementById('lbl-type-kir');
    const txtBmd = document.getElementById('txt-type-bmd');
    const txtKir = document.getElementById('txt-type-kir');
    const aiContainer = document.getElementById('ai-mapping-container');
    
    if (type === 'bmd') {
        lblBmd.className = "clay-btn p-4 flex flex-col items-center justify-center gap-2 cursor-pointer text-center !shadow-clay-pressed !bg-surface/85";
        lblKir.className = "clay-btn p-4 flex flex-col items-center justify-center gap-2 cursor-pointer text-center hover:bg-white/20";
        txtBmd.className = "text-sm font-extrabold text-blue-900";
        txtKir.className = "text-sm font-bold text-textMuted";
        if (aiContainer) aiContainer.classList.add('hidden');
    } else {
        lblKir.className = "clay-btn p-4 flex flex-col items-center justify-center gap-2 cursor-pointer text-center !shadow-clay-pressed !bg-surface/85";
        lblBmd.className = "clay-btn p-4 flex flex-col items-center justify-center gap-2 cursor-pointer text-center hover:bg-white/20";
        txtKir.className = "text-sm font-extrabold text-blue-900";
        txtBmd.className = "text-sm font-bold text-textMuted";
        if (aiContainer) aiContainer.classList.remove('hidden');
    }
};

window.handleFileSelect = function(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    uploadedFileObject = files[0];
    document.getElementById('file-drag-label').textContent = 'File siap diunggah!';
    document.getElementById('file-name-label').innerHTML = `<strong class="text-blue-900">${uploadedFileObject.name}</strong> (${(uploadedFileObject.size / 1024).toFixed(1)} KB)`;
    
    // Enable start import button
    const btn = document.getElementById('start-import-btn');
    btn.disabled = false;
    btn.className = "clay-btn px-8 py-3 bg-pastel-blue text-blue-900 !shadow-clay-blue hover:bg-blue-100";
};

window.startImportProcess = function() {
    if (!uploadedFileObject) return;
    
    const type = document.querySelector('input[name="import-type"]:checked').value;
    const progressDiv = document.getElementById('import-progress');
    const progressBar = document.getElementById('import-progress-bar');
    const statusText = document.getElementById('import-status-text');
    const percentText = document.getElementById('import-percent');
    
    progressDiv.classList.remove('hidden');
    progressBar.style.width = '10%';
    percentText.textContent = '10%';
    statusText.textContent = 'Membaca data berkas Excel...';
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            
            if (type === 'bmd') {
                await processBmdUpload(workbook, progressBar, statusText, percentText);
            } else {
                await processKirUpload(workbook, progressBar, statusText, percentText);
            }
        } catch (err) {
            console.error(err);
            statusText.innerHTML = '<span class="text-red-600">Error: Gagal memproses data. Cek format!</span>';
        }
    };
    reader.readAsArrayBuffer(uploadedFileObject);
};

async function processBmdUpload(workbook, progressBar, statusText, percentText) {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    statusText.textContent = 'Validasi struktur file Excel...';
    progressBar.style.width = '20%';
    percentText.textContent = '20%';

    if (!rows || rows.length < 12) {
        statusText.innerHTML = '<span class="text-red-600">Error: Format file salah atau kosong!</span>';
        return;
    }

    // Validasi template BMD: cek ketersediaan keyword penting di baris header (sekitar baris 10-12)
    const headerRow = (rows[10] || []).concat(rows[11] || []);
    const headerStr = headerRow.join('').toLowerCase();
    if (!headerStr.includes('kode') && !headerStr.includes('nama') && !headerStr.includes('harga')) {
        statusText.innerHTML = '<span class="text-red-600">Error: Struktur file tidak sesuai template Master BMD (Kode Barang, Nama Barang, Harga tidak ditemukan).</span>';
        return;
    }

    statusText.textContent = 'Validasi baris data BMD...';
    progressBar.style.width = '30%';
    percentText.textContent = '30%';
    
    const bmdRecords = [];
    
    // Data rows in BMD start around index 12 or 13
    for (let i = 12; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 10) continue;
        
        // Filter: Row must have valid NIBAR at index 9, and Name at index 8
        const nibar = row[9] ? String(row[9]).trim() : '';
        const name = row[8] ? String(row[8]).trim() : '';
        const qty = parseInt(row[19]);
        
        if (nibar.startsWith('12') && name && !isNaN(qty) && qty > 0) {
            // Concatenate kode_barang components if possible (Col 1 to 5 + 7)
            const codeParts = [row[1], row[2], row[3], row[4], row[5], row[7]].filter(x => x !== undefined && x !== null && x !== '');
            const combinedCode = codeParts.length > 3 ? codeParts.map(x => String(x).replace('.0','').padStart(2,'0')).join('.') : (row[0] || '');
            
            bmdRecords.push({
                nibar: nibar,
                no_register: row[10] ? String(row[10]).trim() : '',
                kode_barang: combinedCode,
                nama_barang: name,
                spesifikasi_nama: row[11] ? String(row[11]).trim() : name,
                spesifikasi_lainnya: row[12] ? String(row[12]).trim() : '',
                merek_tipe: row[14] ? String(row[14]).trim() : '',
                nomor_polisi: row[16] ? String(row[16]).trim() : '',
                nomor_rangka: row[17] ? String(row[17]).trim() : '',
                nomor_bpkb: row[18] ? String(row[18]).trim() : '',
                jumlah: qty,
                satuan: row[20] ? String(row[20]).trim() : 'Buah',
                harga: parseFloat(row[22]) || 0,
                nilai: parseFloat(row[23]) || 0,
                cara_perolehan: row[24] ? String(row[24]).trim() : '',
                tanggal_perolehan: row[25] instanceof Date ? row[25].toISOString() : null,
                status_penggunaan: row[26] ? String(row[26]).trim() : '',
                keterangan: row[28] ? String(row[28]).trim() : ''
            });
        } else if ((row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '') && name && (!nibar || String(nibar).trim() === '')) {
            // Parse category header rows (e.g. ALAT ANGKUTAN, ALAT KANTOR, KOMPUTER)
            const catCodeParts = [row[1], row[2], row[3], row[4], row[5]].filter(x => x !== undefined && x !== null && String(x).trim() !== '');
            if (catCodeParts.length >= 2) {
                const catCode = catCodeParts.map(x => String(x).replace('.0','').padStart(2,'0')).join('.');
                bmdRecords.push({
                    nibar: 'CAT_' + catCode,
                    no_register: 'CAT_' + catCode,
                    kode_barang: catCode,
                    nama_barang: name,
                    spesifikasi_nama: name,
                    spesifikasi_lainnya: '',
                    merek_tipe: '',
                    nomor_polisi: '',
                    nomor_rangka: '',
                    nomor_bpkb: '',
                    jumlah: 0,
                    satuan: 'Kategori',
                    harga: 0,
                    nilai: 0,
                    cara_perolehan: '',
                    tanggal_perolehan: null,
                    status_penggunaan: 'Kategori',
                    keterangan: ''
                });
            }
        }
    }
    
    if (bmdRecords.length === 0) {
        statusText.innerHTML = '<span class="text-red-600">Error: Tidak ada baris aset valid ditemukan! Periksa kolom kosong atau format angka.</span>';
        return;
    }
    
    statusText.textContent = `Membandingkan data dengan Master BMD lama...`;
    progressBar.style.width = '40%';
    percentText.textContent = '40%';

    let newBmds = [];
    let existingBmdsToUpdate = [];
    let foundOldItemIds = new Set();

    bmdRecords.forEach(record => {
        let bestMatch = null;
        let bestScore = -1;

        globalMasterBmd.forEach(oldItem => {
            const score = calculateMatchScore(record, oldItem);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = oldItem;
            }
        });

        if (bestScore > 90 && bestMatch) {
            // High Match -> Same item
            existingBmdsToUpdate.push({
                ...bestMatch, // to retain id
                jumlah: record.jumlah,
                harga: record.harga,
                nilai: record.nilai,
                keterangan: record.keterangan || bestMatch.keterangan
            });
            foundOldItemIds.add(bestMatch.id);
        } else if (bestScore >= 60 && bestMatch) {
            // Medium Match -> Treat as new but flag for review
            newBmds.push({
                ...record,
                status_penggunaan: 'Menunggu Review',
                keterangan: (record.keterangan ? record.keterangan + ' | ' : '') + `[Sistem: Kemungkinan sama dengan NIBAR ${bestMatch.nibar} - Skor: ${bestScore}%]`
            });
        } else {
            // Low Match -> Completely new item
            newBmds.push(record);
        }
    });

    let missingBmdsToUpdate = [];
    globalMasterBmd.forEach(oldItem => {
        if (!foundOldItemIds.has(oldItem.id) && oldItem.status_penggunaan !== 'Nonaktif/Usul Penghapusan' && oldItem.status_penggunaan !== 'Perlu Verifikasi') {
            missingBmdsToUpdate.push({
                ...oldItem,
                status_penggunaan: 'Perlu Verifikasi'
            });
        }
    });

    statusText.textContent = `Update ${existingBmdsToUpdate.length} lama, ${missingBmdsToUpdate.length} hilang, Insert ${newBmds.length} baru...`;
    progressBar.style.width = '60%';
    percentText.textContent = '60%';

    try {
        if (newBmds.length > 0) {
            const { data: insertedBmds, error: insertError } = await supabaseClient.from('master_bmd').insert(newBmds).select();
            if (insertError) throw insertError;
            
            const transitAssets = insertedBmds.map((b, index) => ({
                master_bmd_id: b.id,
                no_urut: globalAssets.length + index + 1,
                kode_barang: b.kode_barang || '',
                nama_barang: b.nama_barang,
                merk_model: b.merek_tipe || '',
                no_seri: b.nomor_polisi || b.nomor_rangka || '',
                ukuran: '',
                bahan: '',
                tahun: b.tanggal_perolehan ? String(new Date(b.tanggal_perolehan).getFullYear()) : '',
                jumlah: b.jumlah,
                harga: b.harga,
                ruangan: 'Gudang Transit',
                kondisi: 'Baik',
                keterangan: b.keterangan || 'Dari Master BMD',
                status: b.status_penggunaan === 'Menunggu Review' ? 'Menunggu Review' : 'Pesan Masuk'
            }));

            // Hanya otomatis masuk Gudang Transit (Pesan Masuk) jika ini BUKAN import pertama kali
            // Jika ini import pertama (database Master BMD masih kosong), biarkan semuanya "Belum Terpetakan"
            if (transitAssets.length > 0 && globalMasterBmd.length > 0) {
                const { data: insertedAssets, error: assetError } = await supabaseClient.from('assets').insert(transitAssets).select();
                if (assetError) throw assetError;

                const riwayat = insertedAssets.map(a => ({
                    asset_id: a.id,
                    jenis_perubahan: a.status === 'Menunggu Review' ? 'Barang Baru (Review Diperlukan)' : 'Aset Baru (Dari BMD)',
                    keterangan: a.status === 'Menunggu Review' ? 'Masuk ke Gudang Transit dengan status Menunggu Review karena kecocokan parsial.' : 'Masuk otomatis ke Gudang Transit',
                    tanggal: new Date().toISOString()
                }));
                await supabaseClient.from('riwayat_barang').insert(riwayat);
            }
        }

        const allUpdates = [...existingBmdsToUpdate, ...missingBmdsToUpdate];
        if (allUpdates.length > 0) {
            const { error: updateError } = await supabaseClient.from('master_bmd').upsert(allUpdates);
            if (updateError) throw updateError;
        }

        if (missingBmdsToUpdate.length > 0) {
            // Update related assets for missing bmds to 'Perlu Verifikasi' and move to Gudang Transit
            const missingBmdIds = missingBmdsToUpdate.map(b => b.id);
            const assetsToVerify = globalAssets.filter(a => missingBmdIds.includes(a.master_bmd_id));
            
            if (assetsToVerify.length > 0) {
                const assetUpdates = assetsToVerify.map(a => ({
                    id: a.id,
                    // Tetap di ruangan asal, jangan pindahkan ke Gudang Transit
                    status: 'Perlu Verifikasi'
                }));
                const { error: assetUpdateError } = await supabaseClient.from('assets').upsert(assetUpdates);
                if (assetUpdateError) throw assetUpdateError;
                
                const historyUpdates = assetsToVerify.map(a => ({
                    asset_id: a.id,
                    jenis_perubahan: 'Sinkronisasi Master BMD (Barang Hilang)',
                    keterangan: `Aset dibiarkan di ${a.ruangan || 'Ruang Sebelumnya'} namun ditandai Perlu Verifikasi (Hilang dari file Master BMD terbaru).`,
                    tanggal: new Date().toISOString()
                }));
                await supabaseClient.from('riwayat_barang').insert(historyUpdates);
            }
        }

        if (newBmds.length > 0 || missingBmdsToUpdate.length > 0) {
            let msg = `Perubahan Master BMD: ${newBmds.length} aset baru masuk Gudang Transit, ${missingBmdsToUpdate.length} aset dipindah untuk diverifikasi.`;
            await supabaseClient.from('riwayat_barang').insert([{
                asset_id: null,
                jenis_perubahan: 'Sinkronisasi Master BMD',
                keterangan: msg,
                tanggal: new Date().toISOString()
            }]);
        }
        
        progressBar.style.width = '100%';
        percentText.textContent = '100%';
        statusText.innerHTML = `<span class="text-green-700 font-extrabold">Sukses sinkronisasi data BMD!</span>`;
        
        setTimeout(() => {
            closeImportModal();
            loadAllData();
        }, 1500);

    } catch (error) {
        console.error('Import process error:', error);
        
        // Log detail error ke database (jika ada hak akses log)
        try {
            await supabaseClient.from('import_logs').insert([{
                jenis_file: 'Master BMD',
                pesan_error: error.message || 'Unknown Import Error',
                detail: error
            }]);
        } catch (logErr) {
            console.warn('Gagal mencatat log error (tabel import_logs mungkin belum dibuat):', logErr);
        }

        // Cek jika error adalah permission denied
        if (error.message && error.message.toLowerCase().includes('permission denied')) {
            statusText.innerHTML = `<span class="text-red-600 font-black uppercase">ERROR GAGAL UPLOAD: User tidak memiliki hak akses ke MASTER_BMD</span>`;
        } else {
            statusText.innerHTML = `<span class="text-red-600">Error Gagal Upload: ${error.message}</span>`;
        }
    }
}

async function processKirUpload(workbook, progressBar, statusText, percentText) {
    statusText.textContent = 'Memuat database Master BMD...';
    // Fetch latest master bmd for linking
    await fetchMasterBmd();
    
    progressBar.style.width = '30%';
    percentText.textContent = '30%';
    
    const parsedAssets = [];
    const sheets = workbook.SheetNames;
    
    sheets.forEach(sheetName => {
        const blacklist = ['REKAP', 'REKAP BARANG ALL RUANGAN', 'KENDARAAN BERDASARKAN KIB', 'Sheet1'];
        if (blacklist.includes(sheetName)) {
            console.log(`[KIR Import] Skipping blacklisted sheet "${sheetName}"`);
            return;
        }
        
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Scan for columns mapping in first 12 rows to see if we have RUANGAN
        let hasRoomColumn = false;
        for (let h = 0; h < Math.min(rows.length, 12); h++) {
            const headerRow = rows[h];
            if (!headerRow) continue;
            
            const filledCells = headerRow.filter(c => c !== undefined && c !== null && String(c).trim() !== '');
            if (filledCells.length < 5) continue;
            
            headerRow.forEach(cell => {
                if (!cell) return;
                const val = String(cell).toLowerCase().trim();
                if (val.includes('ruang') || val === 'ruangan') hasRoomColumn = true;
            });
        }
        
        const standardRoom = getStandardRoomName(sheetName);
        
        // We process the sheet if it either maps to a standard room, OR it contains a "RUANGAN" column!
        if (!standardRoom && !hasRoomColumn) {
            console.log(`[KIR Import] Skipping sheet "${sheetName}" (no room match and no RUANGAN column)`);
            return; 
        }
        
        // AUTO-DETECT column positions by scanning header rows (rows 0-11)
        let colMap = {};
        let dataStartRow = 0;
        
        for (let h = 0; h < Math.min(rows.length, 12); h++) {
            const headerRow = rows[h];
            if (!headerRow) continue;
            
            const filledCells = headerRow.filter(c => c !== undefined && c !== null && String(c).trim() !== '');
            if (filledCells.length < 5) continue;
            
            // Look for the numbering row (1, 2, 3, 4, 5...) which is just before data
            if (filledCells.length >= 5 && filledCells.every(c => !isNaN(Number(c)))) {
                dataStartRow = h + 1;
                continue;
            }
            
            headerRow.forEach((cell, idx) => {
                if (cell === undefined || cell === null || cell === '') return;
                const val = String(cell).toLowerCase().trim();
                if (val.includes('urut') || val === 'no' || val === 'no.') colMap.urut = idx;
                if (val.includes('ruang') || val === 'ruangan') colMap.ruangan = idx;
                if (val.includes('nama') && (val.includes('barang') || val.includes('jenis'))) colMap.nama = idx;
                if (val.includes('merk') || val.includes('model') || val.includes('merek')) colMap.merk = idx;
                if (val.includes('seri') || val.includes('pabrik')) colMap.noSeri = idx;
                if (val.includes('ukuran')) colMap.ukuran = idx;
                if (val.includes('bahan')) colMap.bahan = idx;
                if (val.includes('tahun') || val.includes('pembuatan')) colMap.tahun = idx;
                if (val.includes('kode') && val.includes('barang')) colMap.kodeBarang = idx;
                if (val.includes('jumlah') || val.includes('register')) colMap.jumlah = idx;
                if (val.includes('harga') || val.includes('perolehan') || val.includes('beli')) colMap.harga = idx;
                if (val.includes('kondisi') || val.includes('keadaan')) colMap.kondisi = idx;
                if (val === 'baik' || val === 'b' || (val.includes('baik') && !val.includes('kurang'))) colMap.baik = idx;
                if (val.includes('kurang')) colMap.kurangBaik = idx;
                if (val.includes('rusak')) colMap.rusakBerat = idx;
                if (val.includes('keterangan') || val.includes('mutasi')) colMap.keterangan = idx;
            });
            
            const headerStr = headerRow.map(c => String(c || '').toLowerCase()).join('|');
            if (headerStr.includes('nama') && (headerStr.includes('barang') || headerStr.includes('jenis'))) {
                if (!dataStartRow) dataStartRow = h + 1;
            }
        }
        
        // Fallback: if no header detected, use default positions
        if (Object.keys(colMap).length === 0) {
            colMap = { urut: 0, nama: 1, merk: 2, noSeri: 3, ukuran: 4, bahan: 5, tahun: 6, kodeBarang: 7, jumlah: 8, harga: 9, baik: 10, kurangBaik: 11, rusakBerat: 12, keterangan: 13 };
        }
        if (!dataStartRow || dataStartRow < 5) dataStartRow = 8;
        
        // Ensure critical columns exist
        if (colMap.nama === undefined) colMap.nama = 1;
        
        console.log(`[KIR Import] Sheet "${sheetName}" | Columns:`, colMap, `| Data starts at row ${dataStartRow}`);
        
        // Parse data rows
        for (let i = dataStartRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 3) continue;
            
            // Get No. Urut
            const urutIdx = colMap.urut !== undefined ? colMap.urut : 0;
            const urut = parseInt(row[urutIdx]);
            if (isNaN(urut)) continue;
            
            const name = row[colMap.nama] ? String(row[colMap.nama]).trim() : '';
            
            // Skip header numbering rows
            if (!name || !isNaN(Number(name))) continue;
            
            const merk = colMap.merk !== undefined && row[colMap.merk] ? String(row[colMap.merk]).trim() : '';
            const noSeri = colMap.noSeri !== undefined && row[colMap.noSeri] ? String(row[colMap.noSeri]).trim() : '';
            const ukuran = colMap.ukuran !== undefined && row[colMap.ukuran] ? String(row[colMap.ukuran]).trim() : '';
            const bahan = colMap.bahan !== undefined && row[colMap.bahan] ? String(row[colMap.bahan]).trim() : '';
            const tahun = colMap.tahun !== undefined && row[colMap.tahun] ? String(row[colMap.tahun]).trim() : '';
            
            // Determine Room
            let roomName = standardRoom;
            if (colMap.ruangan !== undefined && row[colMap.ruangan]) {
                const rawRoom = String(row[colMap.ruangan]).trim();
                const standardRoomFromRow = getStandardRoomName(rawRoom);
                if (standardRoomFromRow) {
                    roomName = standardRoomFromRow;
                } else {
                    roomName = "Gudang Transit";
                }
            } else if (!roomName) {
                roomName = "Gudang Transit";
            }
            
            // Decode Kode Barang & Nomor Register
            const rawKode = colMap.kodeBarang !== undefined && row[colMap.kodeBarang] ? String(row[colMap.kodeBarang]).trim() : '';
            const rawReg = colMap.jumlah !== undefined && row[colMap.jumlah] ? String(row[colMap.jumlah]).trim() : '';
            
            let kodeBarangCombined = rawKode;
            if (rawKode && rawReg) {
                const paddedReg = isNaN(Number(rawReg)) ? rawReg : String(rawReg).padStart(4, '0');
                kodeBarangCombined = `${rawKode}-${paddedReg}`;
            }
            
            const jumlah = 1; // set actual quantity of unit to 1
            const price = colMap.harga !== undefined && row[colMap.harga] ? (parseFloat(row[colMap.harga]) || 0) : 0;
            
            // Keadaan / Condition
            let kondisi = 'Baik';
            if (colMap.kondisi !== undefined && row[colMap.kondisi]) {
                const rawKondisi = String(row[colMap.kondisi]).trim().toLowerCase();
                if (rawKondisi.includes('kurang')) kondisi = 'Kurang Baik';
                else if (rawKondisi.includes('rusak') || rawKondisi.includes('berat')) kondisi = 'Rusak Berat';
                else kondisi = 'Baik';
            } else {
                if (colMap.kurangBaik !== undefined) {
                    const colKB = row[colMap.kurangBaik];
                    if (colKB !== undefined && colKB !== null && String(colKB).trim() !== '') kondisi = 'Kurang Baik';
                }
                if (colMap.rusakBerat !== undefined) {
                    const colRB = row[colMap.rusakBerat];
                    if (colRB !== undefined && colRB !== null && String(colRB).trim() !== '') kondisi = 'Rusak Berat';
                }
            }
            
            const keterangan = colMap.keterangan !== undefined && row[colMap.keterangan] ? String(row[colMap.keterangan]).trim() : '';
            
            let assetStatus = 'KIR';
            if (roomName === 'Aset Non-KIR' || roomName === 'Kendaraan Dinas' || roomName === 'Inventaris Kantor' || roomName === 'Depan Bidang') {
                assetStatus = 'Non-KIR';
            } else if (roomName === 'Masih Harus Dicari') {
                assetStatus = 'Masih Harus Dicari';
            } else if (roomName === 'Barang yang Dihibahkan') {
                assetStatus = 'Dihibahkan';
            } else if (roomName === 'Gudang Transit') {
                assetStatus = 'Pesan Masuk';
            }
            
            parsedAssets.push({
                master_bmd_id: null,
                no_urut: urut,
                kode_barang: kodeBarangCombined,
                nama_barang: name,
                merk_model: merk,
                no_seri: noSeri,
                ukuran: ukuran,
                bahan: bahan,
                tahun: tahun,
                jumlah: jumlah,
                harga: price,
                ruangan: roomName,
                kondisi: kondisi,
                keterangan: keterangan,
                status: assetStatus
            });
        }
    });
    
    if (parsedAssets.length === 0) {
        statusText.innerHTML = `<span class="text-red-600 text-xs">Error: Tidak ada data ruangan KIR yang valid!<br>Pastikan nama Sheet excel menyerupai nama ruangan (Kaban, Sekretaris, dll) dan format tabel benar.<br>Sheet yang terbaca: ${sheets.join(', ')}</span>`;
        return;
    }
    
    // Check if Gemini AI matching is enabled
    const useGemini = document.getElementById('use-gemini-ai')?.checked;
    const apiKey = document.getElementById('gemini-api-key')?.value?.trim();
    
    let aiFailed = false;
    
    if (useGemini && apiKey) {
        statusText.textContent = 'Menganalisis kecocokan barang dengan Master BMD menggunakan Gemini AI...';
        progressBar.style.width = '40%';
        percentText.textContent = '40%';
        
        // Build queue of assets that have potential candidates
        const matchQueue = [];
        parsedAssets.forEach((asset, idx) => {
            const candidates = getBmdCandidates(asset.nama_barang, asset.harga, globalMasterBmd);
            if (candidates.length > 0) {
                matchQueue.push({
                    assetIndex: idx,
                    batchIndex: matchQueue.length,
                    nama_barang: asset.nama_barang,
                    merk_model: asset.merk_model,
                    harga: asset.harga,
                    tahun: asset.tahun,
                    kode_barang: asset.kode_barang,
                    candidates: candidates
                });
            }
        });
        
        console.log(`[KIR Import AI] Found ${matchQueue.length} items with candidate BMDs out of ${parsedAssets.length} total items.`);
        
        if (matchQueue.length > 0) {
            const totalBatches = Math.ceil(matchQueue.length / 20);
            for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
                const batch = matchQueue.slice(bIdx * 20, (bIdx + 1) * 20);
                statusText.textContent = `Menghubungkan ke Gemini AI (Batch ${bIdx + 1}/${totalBatches})...`;
                
                const progressVal = 40 + Math.floor((bIdx / totalBatches) * 20);
                progressBar.style.width = `${progressVal}%`;
                percentText.textContent = `${progressVal}%`;
                
                try {
                    const matches = await matchBatchWithGemini(batch, apiKey);
                    matches.forEach(m => {
                        const queueItem = batch.find(item => item.batchIndex === m.index);
                        if (queueItem && m.matched_bmd_id !== undefined) {
                            parsedAssets[queueItem.assetIndex].master_bmd_id = m.matched_bmd_id;
                        }
                    });
                } catch (apiErr) {
                    console.error(`Gemini Matching Error at Batch ${bIdx + 1}:`, apiErr);
                    aiFailed = true;
                    break;
                }
            }
        }
    }
    
    // Fallback or Normal Fuzzy Matching:
    // If Gemini is disabled, OR if Gemini API failed and user chooses fallback
    if (!useGemini || aiFailed) {
        if (aiFailed) {
            const confirmFallback = confirm(
                "Pencocokan menggunakan Gemini AI gagal (API Key salah, kuota habis, atau masalah jaringan).\n\n" +
                "Apakah Anda ingin melanjutkan import dengan mencocokkan menggunakan algoritma lokal/fuzzy offline biasa?"
            );
            if (!confirmFallback) {
                statusText.innerHTML = `<span class="text-red-600 font-extrabold">Import dibatalkan.</span>`;
                return;
            }
        }
        
        statusText.textContent = 'Mencocokkan barang secara lokal (Fuzzy)...';
        progressBar.style.width = '55%';
        percentText.textContent = '55%';
        
        parsedAssets.forEach(asset => {
            if (asset.master_bmd_id) return;
            
            // Gunakan getBmdCandidates yang sudah menggunakan algoritma Token Set Ratio + Levenshtein
            const candidates = window.getBmdCandidates(asset.nama_barang, asset.harga, globalMasterBmd);
            if (candidates && candidates.length > 0) {
                // Pilih yang terbaik (index 0)
                asset.master_bmd_id = candidates[0].id;
            } else {
                asset.master_bmd_id = null;
            }
        });
    }
    
    statusText.textContent = `Menyimpan ${parsedAssets.length} data KIR ruangan ke database...`;
    progressBar.style.width = '60%';
    percentText.textContent = '60%';
    
    // Clean old assets if we are overwriting, or just insert new ones
    // For simplicity, we bulk insert/upsert
    let successCount = 0;
    const batchSize = 50;
    for (let start = 0; start < parsedAssets.length; start += batchSize) {
        const batch = parsedAssets.slice(start, start + batchSize);
        const { error } = await supabaseClient.from('assets').insert(batch);
        if (error) {
            console.error('Assets insert error:', error);
            statusText.innerHTML = `<span class="text-red-600">Error: ${error.message}</span>`;
            return;
        }
        successCount += batch.length;
        const progress = Math.min(60 + Math.floor((successCount / parsedAssets.length) * 35), 95);
        progressBar.style.width = `${progress}%`;
        percentText.textContent = `${progress}%`;
    }
    
    progressBar.style.width = '100%';
    percentText.textContent = '100%';
    statusText.innerHTML = `<span class="text-green-700 font-extrabold">Sukses! Berhasil memetakan ${successCount} KIR ke ruangan.</span>`;
    
    setTimeout(() => {
        closeImportModal();
        loadAllData();
    }, 1500);
}

async function matchBatchWithGemini(batch, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const promptData = batch.map(item => {
        return {
            index: item.batchIndex,
            kir_item: {
                nama_barang: item.nama_barang,
                merk_model: item.merk_model,
                harga: item.harga,
                tahun: item.tahun,
                kode_barang: item.kode_barang
            },
            candidates: item.candidates.map(c => ({
                id: c.id,
                nibar: c.nibar,
                nama_barang: c.nama_barang,
                merek_tipe: c.merek_tipe,
                harga: c.harga,
                tahun: c.tanggal_perolehan ? String(c.tanggal_perolehan).substring(0, 4) : ''
            }))
        };
    });
    
    const promptText = `Anda adalah sistem AI pencocokan inventaris daerah (SIMBAR).
Tugas Anda: memetakan barang KIR (Kartu Inventaris Ruangan) ke satu barang Master BMD (Barang Milik Daerah) yang paling sesuai dari daftar kandidat yang disediakan.

Aturan pencocokan:
1. Kemiripan nama barang (contoh: "AC Split" dan "Pengondisi Udara/AC Split" cocok).
2. Kemiripan harga perolehan. Selisih harga kecil sangat disukai.
3. Kemiripan merek/tipe (contoh: "Lion" dan "Merek: LION" cocok).
4. Kemiripan tahun perolehan.
5. Jika tidak ada kandidat yang cocok secara rasional (contoh nama barang dan kategori jauh berbeda), set "matched_bmd_id" menjadi null.

Wajib respon dalam format JSON objek dengan struktur berikut:
{
  "matches": [
    { "index": 0, "matched_bmd_id": 123 },
    { "index": 1, "matched_bmd_id": null }
  ]
}

Data KIR dan kandidat Master BMD untuk dicocokkan:
${JSON.stringify(promptData, null, 2)}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: promptText }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        })
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
    }
    
    const resData = await response.json();
    const textContent = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
        throw new Error("Respon kosong dari Gemini API");
    }
    
    try {
        const result = JSON.parse(textContent.trim());
        return result.matches || [];
    } catch (e) {
        console.error("Gagal parse JSON respon Gemini:", textContent);
        throw new Error("Format JSON respon dari AI tidak valid");
    }
}
