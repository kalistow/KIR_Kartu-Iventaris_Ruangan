// assets/js/modules/import/matchingEngine.js
// Orkestrator utama pipeline Smart Matching Engine v2.0.
// Menggabungkan semua modul: fingerprint → rule-based → fuzzy → confidence.
// ─────────────────────────────────────────────────────────────────

/**
 * Proses pipeline pencocokan BMD lengkap.
 *
 * Pipeline:
 *   1. Normalisasi (DataCleaner)
 *   2. Build fingerprint incoming records
 *   3. Exact fingerprint match (O(1) lookup)
 *   4. Rule-based scoring untuk yang belum match
 *   5. Fuzzy matching untuk score < 80
 *   6. Confidence classification
 *   7. Detect MISSING items (ada di DB, tidak ada di Excel)
 *
 * @param {Array}  incomingRecords  - Raw records dari Excel (belum dibersihkan)
 * @param {Array}  existingBmds     - Master BMD yang ada di database (globalMasterBmd)
 * @param {Function} [onProgress]   - Callback (pct: number, msg: string) untuk update progress bar
 *
 * @returns {Promise<{
 *   autoMatch:    Array,   // status MATCHED atau UPDATED → commit langsung
 *   reviewQueue:  Array,   // status REVIEW → masuk antrian verifikasi
 *   newAssets:    Array,   // status NEW → insert master_bmd baru
 *   missing:      Array,   // status MISSING → tandai Perlu Verifikasi
 *   stats:        Object,  // ringkasan statistik
 * }>}
 */
async function runBmdMatchingPipeline(incomingRecords = [], existingBmds = [], onProgress = () => {}) {
    onProgress(5, 'Membersihkan data Excel...');

    // ── Tahap 1: Normalisasi ──────────────────────────────────────────────
    const cleanedIncoming  = window.DataCleaner.cleanRecords(incomingRecords || [], 'bmd');
    const cleanedExisting  = window.DataCleaner.cleanRecords(existingBmds || [], 'bmd');

    onProgress(15, 'Membangun indeks fingerprint database...');

    // ── Tahap 2: Build fingerprint map dari existing DB (O(1) lookup) ────
    const fingerprintMap = window.Fingerprint.buildFingerprintMap(cleanedExisting);

    onProgress(25, 'Menjalankan exact matching...');

    const autoMatch   = [];
    const toRuleCheck = [];
    const foundDbIds  = new Set();

    // ── Tahap 3: Exact Fingerprint Match ─────────────────────────────────
    for (const incoming of cleanedIncoming) {
        const fp = window.Fingerprint.buildFingerprint(incoming);
        if (fp && fingerprintMap.has(fp)) {
            const candidate = fingerprintMap.get(fp);
            const isModified = window.Confidence.hasSignificantChange(incoming, candidate);
            const { status, score, label } = window.Confidence.classifyMatch(100, isModified, false);
            autoMatch.push({ incoming, candidate, status, score, label, method: 'EXACT_FINGERPRINT' });
            foundDbIds.add(candidate.id);
        } else {
            toRuleCheck.push(incoming);
        }
    }

    onProgress(40, `Exact match: ${autoMatch.length}. Menjalankan rule-based scoring untuk ${toRuleCheck.length} item...`);

    const reviewQueue = [];
    const newAssets   = [];
    const toFuzzy     = [];

    // ── Tahap 4: Rule-Based Scoring ───────────────────────────────────────
    for (const incoming of toRuleCheck) {
        const { candidate, score } = window.RuleEngine.findBestRuleMatch(incoming, cleanedExisting);

        if (!candidate) {
            newAssets.push({ incoming, candidate: null, status: 'NEW', score: 0, label: 'Aset Baru', method: 'NO_CANDIDATE' });
            continue;
        }

        if (score >= window.Confidence.CONFIDENCE_THRESHOLDS.AUTO_MATCH) {
            const isModified = window.Confidence.hasSignificantChange(incoming, candidate);
            const classification = window.Confidence.classifyMatch(score, isModified, false);
            autoMatch.push({ incoming, candidate, ...classification, method: 'RULE_BASED' });
            foundDbIds.add(candidate.id);
        } else if (score >= window.Confidence.CONFIDENCE_THRESHOLDS.NEED_REVIEW) {
            // Langsung ke REVIEW tanpa fuzzy (rule sudah cukup untuk 80-94)
            reviewQueue.push({ incoming, candidate, status: 'REVIEW', score, label: 'Perlu Verifikasi', method: 'RULE_BASED' });
            foundDbIds.add(candidate.id);
        } else {
            // Score < 80 → coba fuzzy matching lebih lanjut
            toFuzzy.push({ incoming, ruleBestCandidate: candidate, ruleScore: score });
        }
    }

    onProgress(60, `Rule-based: ${autoMatch.length} auto, ${reviewQueue.length} review. Menjalankan fuzzy untuk ${toFuzzy.length} item...`);

    // ── Tahap 5: Fuzzy Matching (hanya untuk skor < 80) ─────────────────
    for (const { incoming, ruleBestCandidate, ruleScore } of toFuzzy) {
        const incomingName = incoming._norm_nama || incoming.nama_barang || '';
        const fuzzyResults = window.Similarity.findFuzzyMatches(incomingName, cleanedExisting, 50);

        let finalCandidate = ruleBestCandidate;
        let finalScore     = ruleScore;

        if (fuzzyResults.length > 0) {
            const topFuzzy = fuzzyResults[0];
            const combined = window.Confidence.combineScores(ruleScore, topFuzzy.fuseScore);
            if (combined > finalScore) {
                finalCandidate = topFuzzy.candidate;
                finalScore     = combined;
            }
        }

        const isNew = finalScore < window.Confidence.CONFIDENCE_THRESHOLDS.NEED_REVIEW;
        const isModified = !isNew && window.Confidence.hasSignificantChange(incoming, finalCandidate);
        const { status, score: confScore, label } = window.Confidence.classifyMatch(finalScore, isModified, isNew);

        const result = { incoming, candidate: isNew ? null : finalCandidate, status, score: confScore, label, method: 'FUZZY' };

        if (status === 'MATCHED' || status === 'UPDATED') {
            autoMatch.push(result);
            if (finalCandidate) foundDbIds.add(finalCandidate.id);
        } else if (status === 'REVIEW') {
            reviewQueue.push(result);
            if (finalCandidate) foundDbIds.add(finalCandidate.id);
        } else {
            newAssets.push(result);
        }
    }

    onProgress(80, 'Mendeteksi aset yang hilang dari file BMD terbaru...');

    // ── Tahap 6: Detect MISSING items ────────────────────────────────────
    const missing = cleanedExisting
        .filter(ex => ex.id && !foundDbIds.has(ex.id) && ex.status_penggunaan !== 'Nonaktif/Usul Penghapusan')
        .map(ex => ({
            incoming:  null,
            candidate: ex,
            status:    'MISSING',
            score:     0,
            label:     'Tidak Ditemukan di File Terbaru',
            method:    'MISSING_DETECTION',
        }));

    onProgress(95, 'Pipeline selesai. Menyiapkan hasil...');

    const stats = {
        total_incoming: incomingRecords.length,
        auto_match:     autoMatch.length,
        need_review:    reviewQueue.length,
        new_assets:     newAssets.length,
        missing:        missing.length,
    };

    console.log('[MatchingEngine] Pipeline selesai:', stats);

    return { autoMatch, reviewQueue, newAssets, missing, stats };
}

/**
 * Commit hasil autoMatch ke database:
 * - Update existing records (UPDATED)
 * - Keep MATCHED tanpa perubahan data
 * - Insert new records (NEW)
 * - Mark MISSING sebagai Perlu Verifikasi
 *
 * @param {Object}  pipelineResult - Hasil dari runBmdMatchingPipeline()
 * @param {string}  importSession  - UUID sesi impor
 * @param {Function} [onProgress]  - Callback progress
 * @returns {Promise<Object>} statistik commit
 */
async function commitMatchResults(pipelineResult, importSession, onProgress = () => {}) {
    const { autoMatch, newAssets, missing } = pipelineResult;
    const commitStats = { updated: 0, inserted: 0, marked_missing: 0, errors: [] };

    onProgress(5, 'Menyimpan data yang diperbarui ke database...');

    // ── Update UPDATED records ────────────────────────────────────────────
    const toUpdate = autoMatch.filter(r => r.status === 'UPDATED' && r.candidate?.id);
    if (toUpdate.length > 0) {
        const updatePayloads = toUpdate.map(r => ({
            id:                  r.candidate.id,
            jumlah:              r.incoming.jumlah,
            harga:               r.incoming.harga,
            nilai:               r.incoming.nilai || 0,
            keterangan:          r.incoming.keterangan || r.candidate.keterangan,
            status_penggunaan:   r.incoming.status_penggunaan || r.candidate.status_penggunaan || 'Aktif',
            fingerprint:         window.Fingerprint.buildFingerprint(r.incoming),
            last_import_session: importSession,
            confidence_score:    r.score,
        }));
        await _batchUpsert('master_bmd', updatePayloads, commitStats);
        commitStats.updated += toUpdate.length;
    }

    onProgress(40, `Update ${commitStats.updated} aset. Menyimpan ${newAssets.length} aset baru...`);

    // ── Insert NEW records ────────────────────────────────────────────────
    if (newAssets.length > 0) {
        const insertPayloads = newAssets.map(r => ({
            ...r.incoming,
            fingerprint:         window.Fingerprint.buildFingerprint(r.incoming),
            last_import_session: importSession,
            confidence_score:    r.score,
            status_penggunaan:   r.incoming.status_penggunaan || 'Aktif',
            // Hapus field _norm_* agar tidak masuk ke DB
            _norm_nama:   undefined,
            _norm_merk:   undefined,
            _norm_spek:   undefined,
            _norm_kode:   undefined,
            _norm_satuan: undefined,
        }));
        await _batchInsert('master_bmd', cleanPayloads(insertPayloads), commitStats);
        commitStats.inserted += newAssets.length;
    }

    onProgress(70, `Insert ${commitStats.inserted} baru. Menandai ${missing.length} aset hilang...`);

    // ── Mark MISSING sebagai Perlu Verifikasi ────────────────────────────
    if (missing.length > 0) {
        const missingPayloads = missing.map(r => ({
            id:               r.candidate.id,
            status_penggunaan: 'Perlu Verifikasi',
        }));
        await _batchUpsert('master_bmd', missingPayloads, commitStats);
        commitStats.marked_missing += missing.length;
    }

    onProgress(90, 'Menghubungkan data KIR ruangan dengan Master BMD...');
    await autoLinkAssetsToMasterBmd();

    onProgress(95, 'Commit selesai.');
    console.log('[MatchingEngine] Commit stats:', commitStats);
    return commitStats;
}

/**
 * Otomatis menghubungkan baris data KIR ruangan di tabel assets yang master_bmd_id-nya masih NULL
 * ke master_bmd yang sesuai berdasarkan pencocokan multi-pass (Nama, Harga, Register).
 */
async function autoLinkAssetsToMasterBmd() {
    try {
        // 1. Ambil data aset yang master_bmd_id-nya masih NULL
        const { data: assets, error: assetErr } = await supabaseClient
            .from('assets')
            .select('id, kode_barang, nama_barang, merk_model, no_seri, ukuran, harga')
            .is('master_bmd_id', null);

        if (assetErr) throw assetErr;
        if (!assets || assets.length === 0) return;

        // 2. Ambil seluruh data master_bmd
        const { data: bmdList, error: bmdErr } = await supabaseClient
            .from('master_bmd')
            .select('id, kode_barang, no_register, nama_barang, merek_tipe, spesifikasi_nama, spesifikasi_lainnya, harga');

        if (bmdErr) throw bmdErr;
        if (!bmdList || bmdList.length === 0) return;

        // 3. Normalisasi data menggunakan DataCleaner
        const cleanedBmd = window.DataCleaner.cleanRecords(bmdList, 'bmd');
        const cleanedAssets = window.DataCleaner.cleanRecords(assets, 'kir');

        // Helper fungsi ekstraksi register
        const getAssetRegister = (code) => {
            if (!code) return null;
            const idx = code.lastIndexOf('-');
            if (idx === -1) return null;
            const regStr = code.substring(idx + 1);
            const regNum = parseInt(regStr);
            return isNaN(regNum) ? regStr : regNum;
        };

        const getBmdRegister = (noRegister) => {
            if (!noRegister) return null;
            const str = String(noRegister).trim();
            if (str.length > 10) {
                const regStr = str.substring(str.length - 6);
                const regNum = parseInt(regStr);
                return isNaN(regNum) ? regStr : regNum;
            } else {
                const regNum = parseInt(str);
                return isNaN(regNum) ? str : regNum;
            }
        };

        const assignedBmdIds = new Set();
        const updates = [];

        // Kumpulkan semua master_bmd_id yang SUDAH terpakai di tabel assets (agar tidak double link ke BMD yang sama)
        const { data: alreadyLinked, error: linkErr } = await supabaseClient
            .from('assets')
            .select('master_bmd_id')
            .not('master_bmd_id', 'is', null);

        if (!linkErr && alreadyLinked) {
            alreadyLinked.forEach(al => {
                if (al.master_bmd_id) assignedBmdIds.add(al.master_bmd_id);
            });
        }

        // Jalankan Multi-Pass Matching
        // PASS 1: Exact Name + Exact Price + Matching Register Number
        cleanedAssets.forEach(a => {
            if (a.master_bmd_id) return;
            const aReg = getAssetRegister(a.kode_barang);
            if (aReg === null) return;

            const available = cleanedBmd.filter(b => !assignedBmdIds.has(b.id));
            const match = available.find(b => {
                const bReg = getBmdRegister(b.no_register);
                return bReg !== null && bReg === aReg &&
                       b._norm_nama === a._norm_nama &&
                       Math.round(b.harga) === Math.round(a.harga);
            });

            if (match) {
                assignedBmdIds.add(match.id);
                a.master_bmd_id = match.id;
                updates.push({ id: a.id, master_bmd_id: match.id });
            }
        });

        // PASS 2: Exact Name + Price range (±25%) + Matching Register Number
        cleanedAssets.forEach(a => {
            if (a.master_bmd_id) return;
            const aReg = getAssetRegister(a.kode_barang);
            if (aReg === null) return;

            const available = cleanedBmd.filter(b => !assignedBmdIds.has(b.id));
            const match = available.find(b => {
                const bReg = getBmdRegister(b.no_register);
                if (bReg === null || bReg !== aReg) return false;
                if (b._norm_nama !== a._norm_nama) return false;
                const diff = Math.abs(b.harga - a.harga) / Math.max(b.harga, a.harga || 1);
                return diff <= 0.25;
            });

            if (match) {
                assignedBmdIds.add(match.id);
                a.master_bmd_id = match.id;
                updates.push({ id: a.id, master_bmd_id: match.id });
            }
        });

        // PASS 3: Name Similarity (>= 0.75) + Price range (±25%) + Matching Register Number
        cleanedAssets.forEach(a => {
            if (a.master_bmd_id) return;
            const aReg = getAssetRegister(a.kode_barang);
            if (aReg === null) return;

            const available = cleanedBmd.filter(b => !assignedBmdIds.has(b.id));
            const match = available.find(b => {
                const bReg = getBmdRegister(b.no_register);
                if (bReg === null || bReg !== aReg) return false;
                const sim = window.Similarity.getSimilarity(a.nama_barang, b.nama_barang);
                if (sim < 0.75) return false;
                const diff = Math.abs(b.harga - a.harga) / Math.max(b.harga, a.harga || 1);
                return diff <= 0.25;
            });

            if (match) {
                assignedBmdIds.add(match.id);
                a.master_bmd_id = match.id;
                updates.push({ id: a.id, master_bmd_id: match.id });
            }
        });

        // PASS 4: Exact Name + Exact Price (arbitrary register pairing among identical items)
        cleanedAssets.forEach(a => {
            if (a.master_bmd_id) return;

            const available = cleanedBmd.filter(b => !assignedBmdIds.has(b.id));
            const match = available.find(b => {
                return b._norm_nama === a._norm_nama &&
                       Math.round(b.harga) === Math.round(a.harga);
            });

            if (match) {
                assignedBmdIds.add(match.id);
                a.master_bmd_id = match.id;
                updates.push({ id: a.id, master_bmd_id: match.id });
            }
        });

        // PASS 5: Exact Name + Price range (±25%) (arbitrary register pairing)
        cleanedAssets.forEach(a => {
            if (a.master_bmd_id) return;

            const available = cleanedBmd.filter(b => !assignedBmdIds.has(b.id));
            const match = available.find(b => {
                if (b._norm_nama !== a._norm_nama) return false;
                const diff = Math.abs(b.harga - a.harga) / Math.max(b.harga, a.harga || 1);
                return diff <= 0.25;
            });

            if (match) {
                assignedBmdIds.add(match.id);
                a.master_bmd_id = match.id;
                updates.push({ id: a.id, master_bmd_id: match.id });
            }
        });

        // PASS 5.5: Exact Name (ignoring price, arbitrary pairing)
        cleanedAssets.forEach(a => {
            if (a.master_bmd_id) return;

            const available = cleanedBmd.filter(b => !assignedBmdIds.has(b.id));
            const match = available.find(b => {
                return b._norm_nama === a._norm_nama;
            });

            if (match) {
                assignedBmdIds.add(match.id);
                a.master_bmd_id = match.id;
                updates.push({ id: a.id, master_bmd_id: match.id });
            }
        });

        // PASS 6: Fuzzy Name (>= 0.7) + Price range (±30%)
        cleanedAssets.forEach(a => {
            if (a.master_bmd_id) return;

            const available = cleanedBmd.filter(b => !assignedBmdIds.has(b.id));
            const candidates = available
                .map(b => {
                    const sim = window.Similarity.getSimilarity(a.nama_barang, b.nama_barang);
                    const diff = Math.abs(b.harga - a.harga) / Math.max(b.harga, a.harga || 1);
                    return { bmd: b, sim, diff };
                })
                .filter(c => c.sim >= 0.7 && c.diff <= 0.3)
                .sort((x, y) => y.sim - x.sim || x.diff - y.diff);

            if (candidates.length > 0) {
                const match = candidates[0].bmd;
                assignedBmdIds.add(match.id);
                a.master_bmd_id = match.id;
                updates.push({ id: a.id, master_bmd_id: match.id });
            }
        });

        // PASS 7: Loose Fuzzy Name (>= 0.55) + Price range (±50%)
        cleanedAssets.forEach(a => {
            if (a.master_bmd_id) return;

            const available = cleanedBmd.filter(b => !assignedBmdIds.has(b.id));
            const candidates = available
                .map(b => {
                    const sim = window.Similarity.getSimilarity(a.nama_barang, b.nama_barang);
                    const diff = Math.abs(b.harga - a.harga) / Math.max(b.harga, a.harga || 1);
                    return { bmd: b, sim, diff };
                })
                .filter(c => c.sim >= 0.55 && c.diff <= 0.5)
                .sort((x, y) => y.sim - x.sim || x.diff - y.diff);

            if (candidates.length > 0) {
                const match = candidates[0].bmd;
                assignedBmdIds.add(match.id);
                a.master_bmd_id = match.id;
                updates.push({ id: a.id, master_bmd_id: match.id });
            }
        });

        // 4. Update data aset secara individual/row-by-row menggunakan batching paralel (karena RLS/identitas id)
        if (updates.length > 0) {
            console.log(`[MatchingEngine] Smart Auto-linking: updating ${updates.length} assets...`);
            const batchSize = 10;
            for (let i = 0; i < updates.length; i += batchSize) {
                const batch = updates.slice(i, i + batchSize);
                await Promise.all(batch.map(async (upd) => {
                    const { error: updateErr } = await supabaseClient
                        .from('assets')
                        .update({ master_bmd_id: upd.master_bmd_id })
                        .eq('id', upd.id);
                    if (updateErr) {
                        console.error(`[MatchingEngine] Update link error for asset ID ${upd.id}:`, updateErr);
                    }
                }));
            }
            console.log(`[MatchingEngine] Smart Auto-linking successfully updated ${updates.length} assets!`);
        }
    } catch (err) {
        console.error('[MatchingEngine] Error in autoLinkAssetsToMasterBmd:', err);
    }
}

/** Hapus field _norm_* sebelum insert ke DB */
function cleanPayloads(records) {
    return records.map(r => {
        const clean = { ...r };
        delete clean._norm_nama;
        delete clean._norm_merk;
        delete clean._norm_spek;
        delete clean._norm_kode;
        delete clean._norm_satuan;
        return clean;
    });
}

/** Batch upsert helper dengan chunk size 100 */
async function _batchUpsert(table, records, stats) {
    const chunkSize = 100;
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        try {
            const { error } = await supabaseClient.from(table).upsert(chunk);
            if (error) { stats.errors.push(error.message); console.error(`[MatchingEngine] Upsert ${table} error:`, error); }
        } catch (err) {
            stats.errors.push(err.message);
        }
    }
}

/** Batch insert helper dengan chunk size 100 */
async function _batchInsert(table, records, stats) {
    const chunkSize = 100;
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        try {
            const { error } = await supabaseClient.from(table).insert(chunk);
            if (error) { stats.errors.push(error.message); console.error(`[MatchingEngine] Insert ${table} error:`, error); }
        } catch (err) {
            stats.errors.push(err.message);
        }
    }
}

window.MatchingEngine = { runBmdMatchingPipeline, commitMatchResults };
