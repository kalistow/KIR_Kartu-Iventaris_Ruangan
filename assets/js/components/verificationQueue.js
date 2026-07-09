// assets/js/components/verificationQueue.js
// Panel Antrian Verifikasi — Smart Matching Engine v2.0
// Menampilkan item REVIEW hasil impor BMD untuk dikonfirmasi admin.
// ════════════════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────────────
let _vqItems            = [];          // data antrian saat ini
let _vqSelectedIds      = new Set();   // ID yang dipilih untuk bulk action
let _vqCurrentFilter    = 'REVIEW';    // filter status aktif
let _vqCurrentSession   = null;        // UUID sesi yang sedang ditampilkan

// ── Public: dipanggil saat tab dibuka ───────────────────────────

window.loadVerificationQueue = async function(sessionId = null) {
    _vqCurrentSession = sessionId;
    _vqSelectedIds.clear();
    await _vqRefresh();
};

// ── Filter Tabs ──────────────────────────────────────────────────

window.vqSetFilter = function(status) {
    _vqCurrentFilter = status;
    _vqSelectedIds.clear();

    // Update tab styling
    ['REVIEW', 'APPROVED', 'REJECTED', 'ALL'].forEach(s => {
        const btn = document.getElementById(`vq-tab-${s}`);
        if (!btn) return;
        if (s === status) {
            btn.className = 'clay-btn px-4 py-2 text-sm font-extrabold text-blue-900 bg-pastel-blue !shadow-clay-pressed';
        } else {
            btn.className = 'clay-btn px-4 py-2 text-sm font-bold text-textMuted hover:text-textMain';
        }
    });

    _vqRefresh();
};

// ── Approve / Reject Single Item ─────────────────────────────────

window.vqApproveItem = async function(queueId) {
    const item = _vqItems.find(i => i.id === queueId);
    if (!item) return;

    _vqSetRowLoading(queueId, true);

    const adminEmail = window._currentAdminEmail || '';
    const resolvedData = item.candidate_data
        ? { candidateId: item.candidate_data.id, ...item.candidate_data, importSession: _vqCurrentSession }
        : { incoming: item.incoming_data, importSession: _vqCurrentSession };

    const ok = await window.Verification.approveVerificationItem(queueId, resolvedData, adminEmail);

    if (ok) {
        showToast('Item disetujui & data diperbarui.', 'success');
        _vqSelectedIds.delete(queueId);
        await _vqRefresh();
    } else {
        showToast('Gagal menyetujui item.', 'error');
        _vqSetRowLoading(queueId, false);
    }
};

window.vqRejectItem = async function(queueId) {
    const adminEmail = window._currentAdminEmail || '';
    _vqSetRowLoading(queueId, true);
    const ok = await window.Verification.rejectVerificationItem(queueId, 'Ditolak oleh admin.', adminEmail);
    if (ok) {
        showToast('Item ditolak.', 'warning');
        _vqSelectedIds.delete(queueId);
        await _vqRefresh();
    } else {
        showToast('Gagal menolak item.', 'error');
        _vqSetRowLoading(queueId, false);
    }
};

window.vqMarkAsNew = async function(queueId) {
    const item = _vqItems.find(i => i.id === queueId);
    if (!item) return;

    _vqSetRowLoading(queueId, true);
    const adminEmail = window._currentAdminEmail || '';

    try {
        // 1. Masukkan incoming_data ke master_bmd sebagai baris barang baru
        const cleanIncoming = { ...item.incoming_data };
        // Bersihkan field temporary pencarian agar tidak eror di DB
        delete cleanIncoming.id;
        delete cleanIncoming._norm_nama;
        delete cleanIncoming._norm_merk;
        delete cleanIncoming._norm_spek;
        delete cleanIncoming._norm_kode;
        delete cleanIncoming._norm_satuan;

        const { error: insertErr } = await supabaseClient
            .from('master_bmd')
            .insert([{ 
                ...cleanIncoming, 
                status_penggunaan: 'Aktif',
                confidence_score: 100 
            }]);

        if (insertErr) throw insertErr;

        // 2. Tandai antrean sebagai APPROVED dengan catatan khusus
        const { error: queueErr } = await supabaseClient
            .from('verification_queue')
            .update({
                status: 'APPROVED',
                decision_by: adminEmail,
                decision_at: new Date().toISOString(),
                notes: 'Ditandai sebagai Aset Baru (Bukan duplikat data lama)'
            })
            .eq('id', queueId);

        if (queueErr) throw queueErr;

        showToast('Barang berhasil didaftarkan sebagai Aset Baru ke Master BMD.', 'success');
        _vqSelectedIds.delete(queueId);
        await _vqRefresh();
    } catch (err) {
        console.error('[VerificationQueue] Gagal menandai aset baru:', err);
        showToast('Gagal menandai aset baru: ' + err.message, 'error');
        _vqSetRowLoading(queueId, false);
    }
};

// ── Checkbox Selection ───────────────────────────────────────────

window.vqToggleSelect = function(queueId) {
    if (_vqSelectedIds.has(queueId)) {
        _vqSelectedIds.delete(queueId);
    } else {
        _vqSelectedIds.add(queueId);
    }
    _vqUpdateBulkBar();
};

window.vqToggleSelectAll = function() {
    const reviewItems = _vqItems.filter(i => i.status === 'REVIEW');
    if (_vqSelectedIds.size === reviewItems.length) {
        _vqSelectedIds.clear();
    } else {
        reviewItems.forEach(i => _vqSelectedIds.add(i.id));
    }
    _vqRender();
};

// ── Bulk Approve ─────────────────────────────────────────────────

window.vqBulkApprove = async function() {
    if (_vqSelectedIds.size === 0) return;
    const ids = [..._vqSelectedIds];
    const adminEmail = window._currentAdminEmail || '';

    const confirmEl = document.getElementById('vq-bulk-bar');
    if (confirmEl) confirmEl.innerHTML = `<span class="text-sm font-bold text-blue-700 animate-pulse">Memproses ${ids.length} item...</span>`;

    const count = await window.Verification.bulkApproveItems(ids, adminEmail);
    _vqSelectedIds.clear();
    showToast(`${count} item berhasil disetujui!`, 'success');
    await _vqRefresh();
};

// ── Internal Helpers ─────────────────────────────────────────────

async function _vqRefresh() {
    const container = document.getElementById('vq-content');
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-center py-16 gap-3">
            <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-textMuted font-bold text-sm">Memuat antrian verifikasi...</span>
        </div>`;

    try {
        _vqItems = await window.Verification.fetchVerificationQueue(_vqCurrentFilter, _vqCurrentSession);
    } catch (err) {
        console.error('[VQ] Fetch error:', err);
        _vqItems = [];
    }

    _vqUpdateCountBadges();
    _vqRender();
}

function _vqRender() {
    const container = document.getElementById('vq-content');
    if (!container) return;

    if (_vqItems.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-24 gap-4">
                <div class="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                    <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <p class="text-xl font-black text-textMain">Tidak ada item</p>
                <p class="text-sm text-textMuted font-bold">Semua item dengan status <strong>${_vqCurrentFilter}</strong> sudah diproses.</p>
            </div>`;
        _vqUpdateBulkBar();
        return;
    }

    const reviewItems = _vqItems.filter(i => i.status === 'REVIEW');
    const allSelected = reviewItems.length > 0 && reviewItems.every(i => _vqSelectedIds.has(i.id));

    let html = `
        <!-- Bulk Action Bar -->
        <div id="vq-bulk-bar" class="flex items-center gap-3 mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 transition-all ${_vqSelectedIds.size > 0 ? '' : 'hidden'}">
            <span class="text-sm font-extrabold text-blue-900">${_vqSelectedIds.size} item dipilih</span>
            <button onclick="vqBulkApprove()" class="clay-btn px-4 py-2 text-xs bg-green-500 text-white font-extrabold !shadow-clay-green hover:bg-green-600 flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                Setujui Semua Terpilih
            </button>
            <button onclick="_vqSelectedIds.clear();_vqRender()" class="clay-btn px-4 py-2 text-xs text-red-600 font-extrabold hover:bg-red-50">
                Batal Pilih
            </button>
        </div>

        <!-- Select All Checkbox (only for REVIEW tab) -->
        ${_vqCurrentFilter === 'REVIEW' && reviewItems.length > 0 ? `
        <div class="flex items-center gap-3 mb-4 px-1">
            <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" id="vq-select-all" onchange="vqToggleSelectAll()" ${allSelected ? 'checked' : ''}
                    class="w-4 h-4 rounded accent-blue-600 cursor-pointer">
                <span class="text-xs font-extrabold text-textMuted uppercase tracking-wider">Pilih Semua (${reviewItems.length} item)</span>
            </label>
        </div>` : ''}

        <!-- Items List -->
        <div class="flex flex-col gap-5">`;

    _vqItems.forEach(item => {
        html += _vqRenderCard(item);
    });

    html += `</div>`;
    container.innerHTML = html;
    _vqUpdateBulkBar();
}

function _vqRenderCard(item) {
    const incoming  = item.incoming_data  || {};
    const candidate = item.candidate_data || null;
    const conf      = item.confidence || 0;
    const isSelected = _vqSelectedIds.has(item.id);

    const { badgeClass, badgeText, borderClass } = _vqConfidenceBadge(conf, item.status);
    const { methodBadge } = _vqStatusBadge(item.status);

    const createdAt = item.created_at
        ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';

    const showCheckbox = item.status === 'REVIEW';
    const showActions  = item.status === 'REVIEW';

    return `
    <div id="vq-card-${item.id}" class="clay-panel p-0 overflow-hidden border ${borderClass} transition-all ${isSelected ? 'ring-2 ring-blue-400' : ''}">
        <!-- Card Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
            <div class="flex items-center gap-3 flex-wrap">
                ${showCheckbox ? `
                <input type="checkbox" onchange="vqToggleSelect(${item.id})" ${isSelected ? 'checked' : ''}
                    class="w-4 h-4 rounded accent-blue-600 cursor-pointer flex-shrink-0">` : ''}
                <span class="text-xs font-black text-textMuted uppercase tracking-wider">ID #${item.id}</span>
                <span class="${badgeClass} text-xs font-extrabold px-3 py-1 rounded-full border">${badgeText}</span>
                ${methodBadge}
            </div>
            <div class="flex items-center gap-3">
                <span class="text-xs text-textMuted font-bold">${createdAt}</span>
                ${item.decision_by ? `<span class="text-xs text-textMuted italic">oleh: ${item.decision_by}</span>` : ''}
            </div>
        </div>

        <!-- Side-by-side Comparison (stacks vertically on mobile, side-by-side from sm breakpoint up) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <!-- Incoming (Data Baru dari Excel) -->
            <div class="p-5">
                <div class="flex items-center gap-2 mb-3">
                    <span class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                    <span class="text-xs font-black text-blue-700 uppercase tracking-wider">Data Baru (Excel)</span>
                </div>
                ${_vqRenderFields(incoming, 'blue')}
            </div>

            <!-- Candidate (Data di Database) -->
            <div class="p-5 ${candidate ? '' : 'bg-slate-50/50'}">
                <div class="flex items-center gap-2 mb-3">
                    <span class="w-2 h-2 rounded-full ${candidate ? 'bg-green-500' : 'bg-slate-400'} flex-shrink-0"></span>
                    <span class="text-xs font-black ${candidate ? 'text-green-700' : 'text-textMuted'} uppercase tracking-wider">
                        ${candidate ? 'Kandidat Database' : 'Tidak Ada Kandidat'}
                    </span>
                </div>
                ${candidate ? _vqRenderFields(candidate, 'green') : `
                    <div class="flex flex-col items-center justify-center py-8 gap-2 text-textMuted">
                        <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-xs font-bold">Tidak ada kandidat — akan diinsert sebagai aset baru</span>
                    </div>`}
            </div>
        </div>

        <!-- Confidence Score Bar -->
        ${conf > 0 ? `
        <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/30">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-extrabold text-textMuted uppercase tracking-wider">Confidence Score</span>
                <span class="text-sm font-black ${conf >= 95 ? 'text-green-700' : conf >= 80 ? 'text-yellow-700' : 'text-red-700'}">${conf}%</span>
            </div>
            <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700 ${conf >= 95 ? 'bg-green-500' : conf >= 80 ? 'bg-yellow-400' : 'bg-red-400'}"
                    style="width: ${conf}%"></div>
            </div>
        </div>` : ''}

        <!-- Action Buttons -->
        ${showActions ? `
        <div class="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-white/50">
            <button onclick="vqApproveItem(${item.id})"
                class="clay-btn px-4 py-2 text-xs bg-green-500 text-white font-extrabold !shadow-clay-green hover:bg-green-600 flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                Setujui Pencocokan
            </button>
            <button onclick="vqMarkAsNew(${item.id})"
                class="clay-btn px-4 py-2 text-xs bg-pastel-blue text-blue-700 font-extrabold hover:bg-blue-100 flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                Tandai Aset Baru
            </button>
            <button onclick="vqRejectItem(${item.id})"
                class="clay-btn px-4 py-2 text-xs text-red-600 font-extrabold hover:bg-red-50 flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                Tolak
            </button>
        </div>` : `
        <div class="px-5 py-3 border-t border-slate-100 text-right">
            ${item.notes ? `<span class="text-xs italic text-textMuted">Catatan: ${item.notes}</span>` : ''}
        </div>`}
    </div>`;
}

function _vqRenderFields(data, color) {
    if (!data || typeof data !== 'object') return '<p class="text-xs text-textMuted italic">Tidak ada data</p>';

    const fields = [
        { key: 'nama_barang',       label: 'Nama Barang' },
        { key: 'kode_barang',       label: 'Kode Barang' },
        { key: 'merek_tipe',        label: 'Merek / Tipe' },
        { key: 'spesifikasi_nama',  label: 'Spesifikasi' },
        { key: 'jumlah',            label: 'Jumlah' },
        { key: 'satuan',            label: 'Satuan' },
        { key: 'harga',             label: 'Harga' },
        { key: 'nibar',             label: 'NIBAR' },
    ];

    const colorMap = {
        blue:  { label: 'text-blue-600',  value: 'text-blue-900',  bg: 'bg-blue-50/50'  },
        green: { label: 'text-green-600', value: 'text-green-900', bg: 'bg-green-50/50' },
    };
    const c = colorMap[color] || colorMap.blue;

    let html = `<div class="flex flex-col gap-2">`;
    fields.forEach(f => {
        const raw = data[f.key];
        if (raw === undefined || raw === null || raw === '') return;
        const val = f.key === 'harga' && !isNaN(raw)
            ? 'Rp ' + Number(raw).toLocaleString('id-ID')
            : String(raw);
        html += `
            <div class="flex items-start gap-2 rounded-lg p-2 ${c.bg}">
                <span class="text-[10px] font-black uppercase tracking-wide ${c.label} w-24 flex-shrink-0 pt-0.5">${f.label}</span>
                <span class="text-xs font-bold ${c.value} break-all">${val}</span>
            </div>`;
    });
    html += `</div>`;
    return html;
}

function _vqConfidenceBadge(conf, status) {
    if (status === 'APPROVED') return {
        badgeClass: 'bg-green-100 text-green-800 border-green-200',
        badgeText:  '✓ DISETUJUI',
        borderClass: 'border-green-200',
    };
    if (status === 'REJECTED') return {
        badgeClass: 'bg-red-100 text-red-700 border-red-200',
        badgeText:  '✗ DITOLAK',
        borderClass: 'border-red-200',
    };
    if (conf >= 95) return {
        badgeClass: 'bg-green-100 text-green-800 border-green-200',
        badgeText:  `🟢 ${conf}% — Sangat Yakin`,
        borderClass: 'border-green-300',
    };
    if (conf >= 80) return {
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        badgeText:  `🟡 ${conf}% — Perlu Review`,
        borderClass: 'border-yellow-300',
    };
    return {
        badgeClass: 'bg-red-100 text-red-700 border-red-200',
        badgeText:  `🔴 ${conf}% — Kurang Yakin`,
        borderClass: 'border-red-200',
    };
}

function _vqStatusBadge(status) {
    const map = {
        REVIEW:   '<span class="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">MENUNGGU</span>',
        APPROVED: '<span class="text-[10px] font-extrabold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">DIPROSES</span>',
        REJECTED: '<span class="text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">DITOLAK</span>',
    };
    return { methodBadge: map[status] || '' };
}

async function _vqUpdateCountBadges() {
    // Fetch counts untuk semua status sekaligus
    try {
        const all = await window.Verification.fetchVerificationQueue('ALL', _vqCurrentSession);
        const counts = { REVIEW: 0, APPROVED: 0, REJECTED: 0, ALL: all.length };
        all.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });

        ['REVIEW', 'APPROVED', 'REJECTED', 'ALL'].forEach(s => {
            const badge = document.getElementById(`vq-badge-${s}`);
            if (badge) badge.textContent = counts[s] || 0;
        });
    } catch (_) {}
}

function _vqUpdateBulkBar() {
    const bar = document.getElementById('vq-bulk-bar');
    if (!bar) return;
    if (_vqSelectedIds.size > 0) {
        bar.classList.remove('hidden');
        const countEl = bar.querySelector('.text-blue-900');
        if (countEl) countEl.textContent = `${_vqSelectedIds.size} item dipilih`;
    } else {
        bar.classList.add('hidden');
    }
}

function _vqSetRowLoading(queueId, loading) {
    const card = document.getElementById(`vq-card-${queueId}`);
    if (!card) return;
    if (loading) {
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
    } else {
        card.style.opacity = '1';
        card.style.pointerEvents = '';
    }
}

// ── Import Session History Panel ─────────────────────────────────

window.loadImportSessions = async function() {
    const container = document.getElementById('vq-sessions-list');
    if (!container) return;
    container.innerHTML = `<div class="text-xs text-textMuted font-bold animate-pulse py-4 text-center">Memuat riwayat sesi...</div>`;

    try {
        const { data, error } = await supabaseClient
            .from('import_sessions')
            .select('*')
            .order('imported_at', { ascending: false })
            .limit(10);

        if (error || !data || data.length === 0) {
            container.innerHTML = `<p class="text-xs text-textMuted font-bold py-4 text-center">Belum ada riwayat sesi impor.</p>`;
            return;
        }

        container.innerHTML = data.map(session => {
            const date = new Date(session.imported_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const statusColor = session.status === 'DONE' ? 'text-green-700 bg-green-50 border-green-200'
                             : session.status === 'PARTIAL' ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
                             : 'text-blue-700 bg-blue-50 border-blue-200';
            return `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
                onclick="loadVerificationQueue('${session.id}'); vqSetFilter('REVIEW')">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${session.file_type === 'BMD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-extrabold text-textMain truncate group-hover:text-blue-700">${session.file_name || 'Unknown file'}</p>
                        <p class="text-xs text-textMuted font-bold">${date} · ${session.file_type}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 sm:ml-3 pl-12 sm:pl-0">
                    <div class="grid grid-cols-4 gap-1.5 text-center flex-1 sm:flex-initial">
                        <div title="Auto-match" class="px-2 py-1 rounded-lg bg-green-50 border border-green-200">
                            <p class="text-xs font-black text-green-700">${session.matched_auto || 0}</p>
                            <p class="text-[9px] text-green-600 font-bold">Auto</p>
                        </div>
                        <div title="Perlu review" class="px-2 py-1 rounded-lg bg-yellow-50 border border-yellow-200">
                            <p class="text-xs font-black text-yellow-700">${session.need_review || 0}</p>
                            <p class="text-[9px] text-yellow-600 font-bold">Review</p>
                        </div>
                        <div title="Aset baru" class="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200">
                            <p class="text-xs font-black text-blue-700">${session.new_assets || 0}</p>
                            <p class="text-[9px] text-blue-600 font-bold">Baru</p>
                        </div>
                        <div title="Tidak ditemukan" class="px-2 py-1 rounded-lg bg-red-50 border border-red-200">
                            <p class="text-xs font-black text-red-700">${session.missing || 0}</p>
                            <p class="text-[9px] text-red-600 font-bold">Hilang</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-extrabold px-2 py-1 rounded-full border ${statusColor} flex-shrink-0">${session.status}</span>
                    <svg class="w-4 h-4 text-textMuted group-hover:text-blue-500 transition-colors flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                    </svg>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('[VQ] Session load error:', err);
        container.innerHTML = `<p class="text-xs text-red-500 font-bold py-4 text-center">Gagal memuat riwayat (tabel import_sessions mungkin belum dibuat).</p>`;
    }
};

// ── Dashboard Stat Widget ─────────────────────────────────────────

window.loadImportSessionStat = async function() {
    const widget = document.getElementById('vq-stat-widget');
    if (!widget) return;

    try {
        const { data, error } = await supabaseClient
            .from('import_sessions')
            .select('*')
            .order('imported_at', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) {
            widget.innerHTML = `<p class="text-xs text-textMuted font-bold">Belum ada sesi impor. Import BMD Excel untuk memulai.</p>`;
            return;
        }

        const s = data[0];
        const date = new Date(s.imported_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const pendingReview = s.need_review || 0;

        widget.innerHTML = `
            <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p class="text-sm font-extrabold text-textMain">Sesi Impor Terakhir: <span class="text-blue-700">${s.file_name || '-'}</span></p>
                    <p class="text-xs text-textMuted font-bold mt-0.5">${date} · ${s.file_type} · Status: <span class="${s.status === 'DONE' ? 'text-green-600' : 'text-yellow-600'} font-extrabold">${s.status}</span></p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 text-xs font-bold">
                        <span class="px-2.5 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">${s.matched_auto || 0} Auto</span>
                        <span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">${s.new_assets || 0} Baru</span>
                        <span class="px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">${s.missing || 0} Hilang</span>
                    </div>
                    ${pendingReview > 0 ? `
                    <button onclick="switchView('verifikasi')" class="clay-btn px-4 py-2 text-xs bg-yellow-400 text-yellow-900 font-extrabold !shadow-clay-yellow hover:bg-yellow-500 flex items-center gap-1.5 animate-pulse">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        ${pendingReview} Perlu Verifikasi
                    </button>` : `<span class="text-xs font-bold text-green-600">✓ Semua terverifikasi</span>`}
                </div>
            </div>`;
    } catch (_) {
        widget.innerHTML = `<p class="text-xs text-textMuted font-bold italic">Statistik impor tidak tersedia (jalankan migrasi database v2 terlebih dahulu).</p>`;
    }
};
