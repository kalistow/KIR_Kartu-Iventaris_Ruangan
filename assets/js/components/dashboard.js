let conditionChartInstance = null;
let modalChartInstance = null;
let dashboardCachedAssets = [];
let currentDashboardAssetFilter = 'special'; // 'special' means Kurang Baik & Rusak Berat

function updateDashboardStats(assets) {
    const counts = { total: 0, baik: 0, kurang: 0, rusak: 0 };

    // Dynamically get active rooms from KIR management (OFFICIAL_ROOMS + custom rooms from localStorage)
    // This automatically adapts when the pengurus adds or removes rooms in Manajemen KIR
    const activeRooms = new Set(getActiveRooms(assets));

    assets.forEach(a => {
        if (a.status === 'Dimusnahkan' || a.status === 'Dihibahkan' || a.status === 'Dilelang') return;

        // Only count assets whose room is registered in the active KIR room list
        const room = a.ruangan;
        if (!room || !activeRooms.has(room)) return;

        const qty = a.jumlah || 1;
        counts.total += qty;

        if (a.kondisi === 'Baik') counts.baik += qty;
        else if (a.kondisi === 'Kurang Baik') counts.kurang += qty;
        else if (a.kondisi === 'Rusak Berat') counts.rusak += qty;
    });
    
    const totalEl = document.getElementById('total-count');
    const goodEl = document.getElementById('good-count');
    const lessGoodEl = document.getElementById('lessgood-count');
    const damagedEl = document.getElementById('damaged-count');
    
    if (totalEl) totalEl.textContent = fmt(counts.total);
    if (goodEl) goodEl.textContent = fmt(counts.baik);
    if (lessGoodEl) lessGoodEl.textContent = fmt(counts.kurang);
    if (damagedEl) damagedEl.textContent = fmt(counts.rusak);

    // Update Charts if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
        renderConditionChart(counts);
    }

    // Cache assets and render the detailed list in the bottom panel
    dashboardCachedAssets = assets;
    renderDashboardAssets(assets);
}

function renderConditionChart(counts) {
    const ctx = document.getElementById('conditionChart')?.getContext('2d');
    if (!ctx) return;

    const dataVals = [counts.baik, counts.kurang, counts.rusak];

    if (conditionChartInstance) {
        conditionChartInstance.data.datasets[0].data = dataVals;
        conditionChartInstance.update();
    } else {
        conditionChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Baik', 'Kurang Baik', 'Rusak Berat'],
                datasets: [{
                    data: dataVals,
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Roboto Flex',
                                size: 11,
                                weight: 'bold'
                            },
                            color: '#4b6680',
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: 'Roboto Flex', weight: 'bold' },
                        bodyFont: { family: 'Roboto Flex', weight: 'bold' },
                        padding: 10,
                        cornerRadius: 8
                    }
                },
                cutout: '70%'
            }
        });
    }
}

window.setDashboardAssetFilter = function(filterValue) {
    currentDashboardAssetFilter = filterValue;
    
    // Update active button styles
    const filterIds = ['special', 'all', 'Baik', 'Kurang Baik', 'Rusak Berat'];
    filterIds.forEach(id => {
        // Convert to ID safe selector
        const idSafe = id.replace(/\s+/g, '-');
        
        // Update main page buttons
        const btn = document.getElementById(`filter-btn-${idSafe}`);
        if (btn) {
            if (id === filterValue) {
                btn.className = "clay-btn px-3 py-1.5 font-extrabold bg-blue-500 text-white shadow-clay-blue";
            } else {
                btn.className = "clay-btn px-3 py-1.5 font-extrabold bg-surface text-textMain border border-slate-300 shadow-sm hover:bg-slate-50";
            }
        }

        // Update modal buttons
        const mBtn = document.getElementById(`modal-filter-btn-${idSafe}`);
        if (mBtn) {
            if (id === filterValue) {
                mBtn.className = "clay-btn px-3 py-1.5 font-extrabold bg-blue-500 text-white shadow-clay-blue";
            } else {
                mBtn.className = "clay-btn px-3 py-1.5 font-extrabold bg-surface text-textMain border border-slate-300 shadow-sm hover:bg-slate-50";
            }
        }
    });

    // Update subtitle
    const subtitle = document.getElementById('asset-list-subtitle');
    if (subtitle) {
        if (filterValue === 'special') {
            subtitle.textContent = 'Menampilkan aset dengan kondisi khusus (Kurang Baik & Rusak Berat)';
        } else if (filterValue === 'all') {
            subtitle.textContent = 'Menampilkan semua aset KIR aktif';
        } else {
            subtitle.textContent = `Menampilkan aset dengan kondisi: ${filterValue}`;
        }
    }

    renderDashboardAssets(dashboardCachedAssets);
};

function renderDashboardAssets(assets) {
    const tbody = document.getElementById('dashboard-assets-tbody');
    const modalTbody = document.getElementById('modal-assets-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (modalTbody) modalTbody.innerHTML = '';

    if (!assets || assets.length === 0) {
        const noDataHtml = '<tr><td colspan="9" class="text-center py-6 text-textMuted">Tidak ada data aset.</td></tr>';
        tbody.innerHTML = noDataHtml;
        if (modalTbody) modalTbody.innerHTML = noDataHtml;
        return;
    }

    const activeRooms = new Set(getActiveRooms(assets));
    
    // Filter assets by current rules
    const filtered = assets.filter(a => {
        // Exclude removed assets
        if (a.status === 'Dimusnahkan' || a.status === 'Dihibahkan' || a.status === 'Dilelang') return false;

        // Must be in active rooms
        const room = a.ruangan;
        if (!room || !activeRooms.has(room)) return false;

        if (currentDashboardAssetFilter === 'special') {
            return a.kondisi === 'Kurang Baik' || a.kondisi === 'Rusak Berat';
        }
        if (currentDashboardAssetFilter === 'all') {
            return true;
        }
        return a.kondisi === currentDashboardAssetFilter;
    });

    if (filtered.length === 0) {
        const emptyHtml = '<tr><td colspan="9" class="text-center py-10 text-textMuted">Tidak ada aset dengan kondisi terpilih.</td></tr>';
        tbody.innerHTML = emptyHtml;
        if (modalTbody) modalTbody.innerHTML = emptyHtml;
        return;
    }

    filtered.forEach((a, index) => {
        let conditionBadge = '';
        if (a.kondisi === 'Baik') {
            conditionBadge = `<span class="bg-pastel-green text-green-800 py-1 px-3 rounded-full text-xs font-black border border-green-200">Baik</span>`;
        } else if (a.kondisi === 'Kurang Baik') {
            conditionBadge = `<span class="bg-pastel-yellow text-yellow-800 py-1 px-3 rounded-full text-xs font-black border border-yellow-200">Kurang Baik</span>`;
        } else if (a.kondisi === 'Rusak Berat') {
            conditionBadge = `<span class="bg-pastel-red text-red-800 py-1 px-3 rounded-full text-xs font-black border border-red-200">Rusak Berat</span>`;
        }

        const priceFormatted = a.harga ? `Rp ${a.harga.toLocaleString('id-ID')}` : '-';

        // Main table rows
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/30 hover:bg-white/20 transition-colors';
        tr.innerHTML = `
            <td class="py-4 px-3 text-center text-textMuted font-normal">${index + 1}</td>
            <td class="py-4 px-3 text-gray-900 font-extrabold max-w-[150px] truncate" title="${a.ruangan || ''}">${a.ruangan || '-'}</td>
            <td class="py-4 px-3 text-gray-900 font-extrabold max-w-[200px] truncate" title="${a.nama_barang || ''}">${a.nama_barang || '-'}</td>
            <td class="py-4 px-3 text-textMuted font-mono text-xs">${a.kode_barang || '-'}</td>
            <td class="py-4 px-3 text-textMuted max-w-[150px] truncate" title="${a.merk_model || ''}">${a.merk_model || '-'}</td>
            <td class="py-4 px-3 text-center">${a.jumlah || 1}</td>
            <td class="py-4 px-3 text-right font-mono">${priceFormatted}</td>
            <td class="py-4 px-3 text-center">${conditionBadge}</td>
            <td class="py-4 px-3 text-xs italic text-textMuted max-w-[150px] truncate" title="${a.keterangan || ''}">${a.keterangan || '-'}</td>
        `;
        tbody.appendChild(tr);

        // Modal table rows (more spacious, no truncate)
        if (modalTbody) {
            const mTr = document.createElement('tr');
            mTr.className = 'border-b border-white/30 hover:bg-white/20 transition-colors';
            mTr.innerHTML = `
                <td class="py-5 px-3 text-center text-textMuted font-normal">${index + 1}</td>
                <td class="py-5 px-3 text-gray-900 font-extrabold">${a.ruangan || '-'}</td>
                <td class="py-5 px-3 text-gray-900 font-extrabold">${a.nama_barang || '-'}</td>
                <td class="py-5 px-3 text-textMuted font-mono text-xs">${a.kode_barang || '-'}</td>
                <td class="py-5 px-3 text-textMuted">${a.merk_model || '-'}</td>
                <td class="py-5 px-3 text-center">${a.jumlah || 1}</td>
                <td class="py-5 px-3 text-right font-mono">${priceFormatted}</td>
                <td class="py-5 px-3 text-center">${conditionBadge}</td>
                <td class="py-5 px-3 text-xs italic text-textMuted">${a.keterangan || '-'}</td>
            `;
            modalTbody.appendChild(mTr);
        }
    });
}

// ── Dashboard Details Modal Operations ────────────────────────────

window.openDashboardModal = function(type) {
    const modal = document.getElementById(`modal-dashboard-${type}`);
    if (!modal) return;
    
    // Perform type-specific rendering
    if (type === 'chart') {
        renderModalChartData();
    } else if (type === 'riwayat') {
        renderModalRiwayatData();
    } else if (type === 'aset') {
        renderModalAsetData();
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeDashboardModal = function(type) {
    const modal = document.getElementById(`modal-dashboard-${type}`);
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        if (type === 'chart' && modalChartInstance) {
            modalChartInstance.destroy();
            modalChartInstance = null;
        }
    }, 300);
};

function renderModalChartData() {
    // 1. Calculate stats counts
    const counts = { total: 0, baik: 0, kurang: 0, rusak: 0 };
    const activeRooms = new Set(getActiveRooms(dashboardCachedAssets));

    dashboardCachedAssets.forEach(a => {
        if (a.status === 'Dimusnahkan' || a.status === 'Dihibahkan' || a.status === 'Dilelang') return;
        const room = a.ruangan;
        if (!room || !activeRooms.has(room)) return;

        const qty = a.jumlah || 1;
        counts.total += qty;
        if (a.kondisi === 'Baik') counts.baik += qty;
        else if (a.kondisi === 'Kurang Baik') counts.kurang += qty;
        else if (a.kondisi === 'Rusak Berat') counts.rusak += qty;
    });

    // 2. Render chart
    const ctx = document.getElementById('modalConditionChart')?.getContext('2d');
    if (ctx) {
        if (modalChartInstance) modalChartInstance.destroy();
        modalChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Baik', 'Kurang Baik', 'Rusak Berat'],
                datasets: [{
                    data: [counts.baik, counts.kurang, counts.rusak],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Roboto Flex', size: 12, weight: 'bold' },
                            color: '#4b6680',
                            padding: 20
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // 3. Render table
    const tbody = document.getElementById('modal-chart-tbody');
    if (tbody) {
        const total = counts.total || 1;
        const pctBaik = ((counts.baik / total) * 100).toFixed(1);
        const pctKurang = ((counts.kurang / total) * 100).toFixed(1);
        const pctRusak = ((counts.rusak / total) * 100).toFixed(1);

        tbody.innerHTML = `
            <tr class="border-b border-slate-100">
                <td class="py-3 px-4 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-emerald-500"></span> Baik
                </td>
                <td class="py-3 px-4 text-center text-emerald-600 font-extrabold">${fmt(counts.baik)}</td>
                <td class="py-3 px-4 text-right text-textMuted">${pctBaik}%</td>
            </tr>
            <tr class="border-b border-slate-100">
                <td class="py-3 px-4 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-yellow-400"></span> Kurang Baik
                </td>
                <td class="py-3 px-4 text-center text-yellow-600 font-extrabold">${fmt(counts.kurang)}</td>
                <td class="py-3 px-4 text-right text-textMuted">${pctKurang}%</td>
            </tr>
            <tr class="border-b border-slate-100">
                <td class="py-3 px-4 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-red-500"></span> Rusak Berat
                </td>
                <td class="py-3 px-4 text-center text-red-600 font-extrabold">${fmt(counts.rusak)}</td>
                <td class="py-3 px-4 text-right text-textMuted">${pctRusak}%</td>
            </tr>
            <tr class="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                <td class="py-3 px-4">TOTAL ASET</td>
                <td class="py-3 px-4 text-center">${fmt(counts.total)}</td>
                <td class="py-3 px-4 text-right">100.0%</td>
            </tr>
        `;
    }
}

function renderModalRiwayatData() {
    const mainTbody = document.getElementById('riwayat-tbody');
    const modalTbody = document.getElementById('modal-riwayat-tbody');
    if (mainTbody && modalTbody) {
        modalTbody.innerHTML = mainTbody.innerHTML;
        modalTbody.querySelectorAll('td').forEach(td => {
            td.className = td.className.replace(/py-2|px-2/g, '').trim();
            td.className = (td.className + ' py-4 px-4').trim();
            td.classList.remove('max-w-[120px]', 'max-w-[150px]', 'truncate');
        });
        modalTbody.querySelectorAll('.clay-btn').forEach(btn => {
            btn.className = btn.className.replace(/text-\[10px\]|px-2|py-0.5/g, '').trim();
            btn.className = (btn.className + ' text-xs px-3 py-1').trim();
        });
    }
}

function renderModalAsetData() {
    // Already synchronized by renderDashboardAssets()!
}
