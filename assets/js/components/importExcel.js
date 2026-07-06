// assets/js/components/importExcel.js
// ═══════════════════════════════════════════════════════════════
// REFACTORED v2.0 — Smart Matching Engine
// Tanggung jawab file ini: UI ONLY (modal, progress bar, toast).
// Semua logika bisnis didelegasikan ke modules/import/*.js
// ═══════════════════════════════════════════════════════════════

// ── Modal Controls ──────────────────────────────────────────────

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
    setTimeout(() => modal.classList.add('hidden'), 300);
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
    document.getElementById('file-name-label').innerHTML =
        `<strong class="text-blue-900">${uploadedFileObject.name}</strong> (${(uploadedFileObject.size / 1024).toFixed(1)} KB)`;
    const btn = document.getElementById('start-import-btn');
    btn.disabled = false;
    btn.className = "clay-btn px-8 py-3 bg-pastel-blue text-blue-900 !shadow-clay-blue hover:bg-blue-100";
};

// ── Progress Bar Helper ─────────────────────────────────────────

function _setProgress(progressBar, percentText, statusText, pct, msg) {
    progressBar.style.width = `${pct}%`;
    percentText.textContent = `${pct}%`;
    if (msg) statusText.textContent = msg;
}

// ── Main Import Dispatcher ─────────────────────────────────────

window.startImportProcess = function() {
    if (!uploadedFileObject) return;

    const progressDiv = document.getElementById('import-progress');
    const progressBar = document.getElementById('import-progress-bar');
    const statusText  = document.getElementById('import-status-text');
    const percentText = document.getElementById('import-percent');

    progressDiv.classList.remove('hidden');
    _setProgress(progressBar, percentText, statusText, 5, 'Membaca berkas Excel...');

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data     = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });

            // ── Auto-Detect File Type (BMD vs KIR) ──
            let detectedType = 'bmd';
            
            // Cek apakah berkas memiliki banyak sheet dan salah satunya bernama ruangan
            const hasRoomSheets = workbook.SheetNames.some(name => {
                const n = name.toUpperCase();
                return n.includes('RUANG') || n.includes('DICARI') || n.includes('HIBAH');
            });

            if (workbook.SheetNames.length > 2 && hasRoomSheets) {
                detectedType = 'kir';
            } else {
                // Alternatif: jika memiliki lebih dari 1 sheet dan sheet pertama adalah "REKAP"
                const firstSheetName = workbook.SheetNames[0].toUpperCase();
                if (firstSheetName.includes('REKAP') && workbook.SheetNames.length > 1) {
                    detectedType = 'kir';
                }
            }

            if (detectedType === 'kir') {
                console.log('[ImportExcel] Auto-detected: KIR Ruangan (berdasarkan nama dan jumlah sheet)');
                _setProgress(progressBar, percentText, statusText, 10, 'Tipe Terdeteksi: KIR Ruangan. Memproses...');
            } else {
                console.log('[ImportExcel] Auto-detected: Master BMD');
                _setProgress(progressBar, percentText, statusText, 10, 'Tipe Terdeteksi: Master BMD. Memproses...');
            }

            if (detectedType === 'bmd') {
                await _handleBmdImport(workbook, progressBar, statusText, percentText);
            } else {
                await _handleKirImport(workbook, progressBar, statusText, percentText);
            }
        } catch (err) {
            console.error('[ImportExcel] Uncaught error:', err);
            statusText.innerHTML = `<span class="text-red-600 font-bold">Error: ${err.message || 'Gagal memproses data.'}</span>`;
        }
    };
    reader.readAsArrayBuffer(uploadedFileObject);
};

// ── BMD Import Handler (delegasi ke Smart Matching Engine) ──────

async function _handleBmdImport(workbook, progressBar, statusText, percentText) {
    const onProgress = (pct, msg) => _setProgress(progressBar, percentText, statusText, pct, msg);

    // Pastikan semua modul sudah load
    if (!window.ExcelParser || !window.MatchingEngine || !window.DataCleaner) {
        statusText.innerHTML = '<span class="text-red-600">Error: Modul Smart Matching Engine belum termuat. Refresh halaman.</span>';
        return;
    }

    onProgress(10, 'Memvalidasi struktur file BMD...');

    // 1. Parse Excel → raw records
    const { records, error: parseError, totalRawRows } = window.ExcelParser.parseBmdWorkbook(workbook);
    if (parseError) {
        statusText.innerHTML = `<span class="text-red-600">${parseError}</span>`;
        return;
    }

    console.log(`[ImportExcel] Parsed ${records.length} BMD records dari ${totalRawRows} baris mentah.`);
    onProgress(15, `${records.length} record valid ditemukan. Memulai Smart Matching Pipeline...`);

    // 2. Buat sesi impor
    const sessionId = await window.HistoryManager.createImportSession({
        file_name:   uploadedFileObject.name,
        file_type:   'BMD',
        total_rows:  records.length,
        status:      'PROCESSING',
    });

    // 3. Jalankan matching pipeline (Fingerprint → Rule-Based → Fuzzy → Confidence)
    let pipelineResult;
    try {
        pipelineResult = await window.MatchingEngine.runBmdMatchingPipeline(
            records,
            globalMasterBmd,
            (pct, msg) => onProgress(15 + Math.floor(pct * 0.55), msg) // skala 15-70%
        );
    } catch (pipeErr) {
        console.error('[ImportExcel] Pipeline error:', pipeErr);
        statusText.innerHTML = `<span class="text-red-600">Error pipeline: ${pipeErr.message}</span>`;
        await window.HistoryManager.updateImportSession(sessionId, { status: 'ERROR' });
        return;
    }

    const { autoMatch, reviewQueue, newAssets, missing, stats } = pipelineResult;

    onProgress(70, `Pipeline selesai. Auto: ${stats.auto_match}, Review: ${stats.need_review}, Baru: ${stats.new_assets}, Hilang: ${stats.missing}. Menyimpan ke database...`);

    // 4. Simpan items REVIEW ke verification_queue
    if (reviewQueue.length > 0) {
        await window.Verification.saveToVerificationQueue(reviewQueue, sessionId);
    }

    // 5. Commit hasil autoMatch, newAssets, dan missing ke database
    let commitStats;
    try {
        commitStats = await window.MatchingEngine.commitMatchResults(
            pipelineResult,
            sessionId,
            (pct, msg) => onProgress(70 + Math.floor(pct * 0.25), msg) // skala 70-95%
        );
    } catch (commitErr) {
        console.error('[ImportExcel] Commit error:', commitErr);
        statusText.innerHTML = `<span class="text-red-600">Error saat menyimpan: ${commitErr.message}</span>`;
        await window.HistoryManager.updateImportSession(sessionId, { status: 'PARTIAL' });
        return;
    }

    // 6. Catat audit trail
    await window.HistoryManager.batchLogImportChanges([...autoMatch, ...newAssets, ...missing], sessionId);

    // 7. Update sesi impor ke DONE
    await window.HistoryManager.updateImportSession(sessionId, {
        matched_auto: stats.auto_match,
        need_review:  stats.need_review,
        new_assets:   stats.new_assets,
        missing:      stats.missing,
        status:       commitStats.errors.length > 0 ? 'PARTIAL' : 'DONE',
    });

    onProgress(100, '');

    // 8. Tampilkan ringkasan hasil
    const reviewBadge = reviewQueue.length > 0
        ? `<span class="text-yellow-700"> | <strong>${reviewQueue.length}</strong> menunggu verifikasi di tab <em>Verifikasi</em></span>`
        : '';

    statusText.innerHTML = `
        <div class="text-green-700 font-extrabold">✅ Sinkronisasi BMD Selesai!</div>
        <div class="text-sm mt-1 text-blue-900">
            <strong>${stats.auto_match}</strong> cocok otomatis &nbsp;|&nbsp;
            <strong>${stats.new_assets}</strong> baru &nbsp;|&nbsp;
            <strong>${stats.missing}</strong> tidak ditemukan${reviewBadge}
        </div>
    `;

    setTimeout(() => {
        closeImportModal();
        loadAllData();
        const msg = reviewQueue.length > 0
            ? `BMD sinkronisasi selesai! ${reviewQueue.length} item perlu verifikasi admin.`
            : `BMD sinkronisasi selesai! ${stats.auto_match} cocok otomatis.`;
        showToast(msg, reviewQueue.length > 0 ? 'warning' : 'success');
    }, 2000);
}

// ── KIR Import Handler (delegasi ke ExcelParser + Similarity) ──

async function _handleKirImport(workbook, progressBar, statusText, percentText) {
    const onProgress = (pct, msg) => _setProgress(progressBar, percentText, statusText, pct, msg);

    if (!window.ExcelParser) {
        statusText.innerHTML = '<span class="text-red-600">Error: ExcelParser belum termuat. Refresh halaman.</span>';
        return;
    }

    onProgress(20, 'Memuat Master BMD terbaru untuk pencocokan...');
    await fetchMasterBmd();

    onProgress(30, 'Mem-parsing sheet KIR dari Excel...');
    const { assets: parsedAssets, skippedSheets, error: parseError } = window.ExcelParser.parseKirWorkbook(workbook);

    if (parseError) {
        statusText.innerHTML = `<span class="text-red-600 text-xs">${parseError}</span>`;
        return;
    }

    console.log(`[ImportExcel] KIR: ${parsedAssets.length} aset dari ${workbook.SheetNames.length - skippedSheets.length} sheet.`);
    onProgress(45, `${parsedAssets.length} barang KIR ditemukan. Mencocokkan ke Master BMD (Rule-Based + Fuzzy)...`);

    // Pencocokan KIR ke master_bmd menggunakan rule-based + fuzzy
    const cleanedBmd = window.DataCleaner.cleanRecords(globalMasterBmd, 'bmd');
    parsedAssets.forEach(asset => {
        if (asset.master_bmd_id) return; // sudah dicocokkan sebelumnya

        const cleanedAsset = window.DataCleaner.cleanKirRecord(asset);

        // Coba Rule-Based dulu
        const { candidate: ruleCandidate, score: ruleScore } = window.RuleEngine.findBestRuleMatch(cleanedAsset, cleanedBmd);
        if (ruleScore >= 80 && ruleCandidate) {
            asset.master_bmd_id = ruleCandidate.id;
            return;
        }

        // Fallback Fuzzy
        const fuzzyResults = window.Similarity.findFuzzyMatches(cleanedAsset._norm_nama || asset.nama_barang, cleanedBmd, 55);
        if (fuzzyResults.length > 0) {
            asset.master_bmd_id = fuzzyResults[0].candidate.id;
        }
    });

    onProgress(60, `Pencocokan selesai. Menyimpan ${parsedAssets.length} data KIR ke database...`);

    // Batch insert ke tabel assets
    let successCount = 0;
    const chunkSize  = 50;
    for (let start = 0; start < parsedAssets.length; start += chunkSize) {
        const batch = parsedAssets.slice(start, start + chunkSize);

        // Hapus field _norm_* agar tidak masuk ke DB
        const cleanBatch = batch.map(a => {
            const c = { ...a };
            delete c._norm_nama; delete c._norm_merk; delete c._norm_spek; delete c._norm_kode;
            return c;
        });

        const { error } = await supabaseClient.from('assets').insert(cleanBatch);
        if (error) {
            console.error('[ImportExcel] KIR insert error:', error);
            statusText.innerHTML = `<span class="text-red-600">Error: ${error.message}</span>`;
            return;
        }
        successCount += batch.length;
        onProgress(60 + Math.floor((successCount / parsedAssets.length) * 35), `Menyimpan... ${successCount}/${parsedAssets.length}`);
    }

    onProgress(100, '');
    statusText.innerHTML = `<span class="text-green-700 font-extrabold">✅ Berhasil memetakan ${successCount} KIR ke ruangan!</span>`;

    setTimeout(() => {
        closeImportModal();
        loadAllData();
        showToast(`Sukses memetakan ${successCount} KIR ke ruangan.`, 'success');
    }, 1500);
}
