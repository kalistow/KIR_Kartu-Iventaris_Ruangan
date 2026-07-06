// assets/js/components/dashboard.js

function updateDashboardStats(assets) {
    const counts = { total: 0, baik: 0, kurang: 0, rusak: 0 };
    assets.forEach(a => {
        if (a.status === 'Dimusnahkan' || a.status === 'Dihibahkan' || a.status === 'Dilelang') return;
        counts.total += (a.jumlah || 1);
        if (a.kondisi === 'Baik') counts.baik += (a.jumlah || 1);
        else if (a.kondisi === 'Kurang Baik') counts.kurang += (a.jumlah || 1);
        else if (a.kondisi === 'Rusak Berat') counts.rusak += (a.jumlah || 1);
    });
    
    const totalEl = document.getElementById('total-count');
    const goodEl = document.getElementById('good-count');
    const lessGoodEl = document.getElementById('lessgood-count');
    const damagedEl = document.getElementById('damaged-count');
    
    if (totalEl) totalEl.textContent = fmt(counts.total);
    if (goodEl) goodEl.textContent = fmt(counts.baik);
    if (lessGoodEl) lessGoodEl.textContent = fmt(counts.kurang);
    if (damagedEl) damagedEl.textContent = fmt(counts.rusak);
}

