// assets/js/components/riwayatPenghapusan.js

let currentRiwayatPenghapusanTab = 'Dimusnahkan';

window.switchRiwayatPenghapusanTab = function(tabName) {
    currentRiwayatPenghapusanTab = tabName;
    updateRiwayatPenghapusanTabUI();
    renderRiwayatPenghapusanTable(globalAssets);
};

function updateRiwayatPenghapusanTabUI() {
    const tabs = ['Dimusnahkan', 'Dihibahkan', 'Dilelang'];
    const assetsList = typeof globalAssets !== 'undefined' ? globalAssets : [];

    tabs.forEach(tab => {
        const btn = document.getElementById(`tab-riwayat-${tab.toLowerCase()}`);
        if (btn) {
            const count = assetsList.filter(a => a.status === tab).length;
            let iconColor = 'text-red-500';
            let pathD = 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';
            
            if (tab === 'Dihibahkan') {
                iconColor = 'text-green-500';
                pathD = 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7';
            } else if (tab === 'Dilelang') {
                iconColor = 'text-blue-500';
                pathD = 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z';
            }

            const iconSvg = `<svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${pathD}"></path></svg>`;
            
            btn.innerHTML = `
                ${iconSvg} 
                <span>${tab}</span> 
                <span class="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-slate-100/80 text-slate-700 font-black border border-slate-200">${count}</span>
            `;

            if (tab === currentRiwayatPenghapusanTab) {
                btn.className = "clay-btn py-2 px-5 text-sm flex items-center gap-2 font-bold bg-white shadow-clay text-textMain";
            } else {
                btn.className = "clay-btn py-2 px-5 text-sm flex items-center gap-2 font-bold text-textMuted hover:text-textMain";
            }
        }
    });
}

function renderRiwayatPenghapusanTable(assets) {
    // Jalankan update tab UI agar jumlah counter di badge tombol sinkron
    updateRiwayatPenghapusanTabUI();

    const tbody = document.getElementById('riwayat-penghapusan-tbody');
    const mobileList = document.getElementById('riwayat-penghapusan-mobile-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';
    
    let filteredAssets = assets.filter(a => a.status === currentRiwayatPenghapusanTab);
    
    const searchVal = document.getElementById('search-riwayat-penghapusan')?.value.toLowerCase() || '';
    if (searchVal) {
        filteredAssets = filteredAssets.filter(a => 
            (a.kode_barang && a.kode_barang.toLowerCase().includes(searchVal)) ||
            (a.nama_barang && a.nama_barang.toLowerCase().includes(searchVal)) ||
            (a.merk_model && a.merk_model.toLowerCase().includes(searchVal))
        );
    }
    
    let emptyMsg = "Tidak ada data riwayat penghapusan.";
    let badgeHtml = '';
    
    if (currentRiwayatPenghapusanTab === 'Dimusnahkan') {
        emptyMsg = "Belum ada aset yang dimusnahkan.";
        badgeHtml = '<span class="bg-red-100 text-red-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-red-300">Dimusnahkan</span>';
    } else if (currentRiwayatPenghapusanTab === 'Dihibahkan') {
        emptyMsg = "Belum ada aset yang dihibahkan.";
        badgeHtml = '<span class="bg-green-100 text-green-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-green-300">Dihibahkan</span>';
    } else if (currentRiwayatPenghapusanTab === 'Dilelang') {
        emptyMsg = "Belum ada aset yang dilelang.";
        badgeHtml = '<span class="bg-blue-100 text-blue-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-blue-300">Dilelang</span>';
    }

    if (filteredAssets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-10 text-textMuted">${emptyMsg}</td></tr>`;
        if (mobileList) {
            mobileList.innerHTML = `<div class="text-center py-10 text-textMuted font-bold">${emptyMsg}</div>`;
        }
        return;
    }
    
    filteredAssets.forEach((a, index) => {
        // Table row for Desktop
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/30 hover:bg-white/20 transition-colors';
        tr.innerHTML = `
            <td class="py-4 px-4 whitespace-nowrap text-center">${index + 1}</td>
            <td class="py-4 px-4 whitespace-nowrap">${a.kode_barang || '-'}</td>
            <td class="py-4 px-4 font-extrabold text-gray-900">${a.nama_barang || '-'}</td>
            <td class="py-4 px-4 text-left text-gray-800 font-bold">${a.ruangan || '-'}</td>
            <td class="py-4 px-4 text-textMuted">${a.merk_model || '-'}</td>
            <td class="py-4 px-4">${a.no_seri || '-'}</td>
            <td class="py-4 px-4 text-center">${a.tahun || '-'}</td>
            <td class="py-4 px-4 text-center">${a.jumlah || 1}</td>
            <td class="py-4 px-4 text-right text-blue-900">Rp ${fmt(a.harga)}</td>
            <td class="py-4 px-4 text-center">${badgeHtml}</td>
            <td class="py-4 px-4 text-center">
                <button onclick="openRiwayatSistem('${a.id}')" class="clay-btn px-4 py-2 flex items-center justify-center gap-2 w-full !shadow-clay-sm text-gray-700 hover:text-gray-900 font-extrabold text-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Histori
                </button>
            </td>
        `;
        tbody.appendChild(tr);

        // Card element for Mobile
        if (mobileList) {
            const card = document.createElement('div');
            card.className = 'clay-panel p-5 bg-white/80 border border-slate-200 rounded-2xl shadow-sm space-y-3';
            card.innerHTML = `
                <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                        <span class="text-xs text-textMuted font-mono">No. Urut: ${index + 1}</span>
                        <h4 class="font-extrabold text-slate-900 text-base mt-0.5">${a.nama_barang || '-'}</h4>
                    </div>
                    <div>
                        ${badgeHtml}
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                    <div>
                        <p class="text-[10px] text-textMuted uppercase tracking-wider">Kode Barang</p>
                        <p class="font-mono text-slate-900">${a.kode_barang || '-'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-textMuted uppercase tracking-wider">Ruangan / Kategori</p>
                        <p class="text-slate-900">${a.ruangan || '-'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-textMuted uppercase tracking-wider">Merk / Tipe</p>
                        <p class="text-slate-900">${a.merk_model || '-'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-textMuted uppercase tracking-wider">No. Seri Pabrik</p>
                        <p class="text-slate-900">${a.no_seri || '-'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-textMuted uppercase tracking-wider">Tahun / Jumlah</p>
                        <p class="text-slate-900">${a.tahun || '-'} / ${a.jumlah || 1} unit</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-textMuted uppercase tracking-wider">Harga Beli</p>
                        <p class="text-blue-900 font-extrabold">Rp ${fmt(a.harga)}</p>
                    </div>
                </div>
                <div class="pt-2 border-t border-slate-100 flex justify-end">
                    <button onclick="openRiwayatSistem('${a.id}')" class="clay-btn px-4 py-2.5 flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900 font-extrabold text-xs w-full">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Histori Aktivitas
                    </button>
                </div>
            `;
            mobileList.appendChild(card);
        }
    });
}

window.triggerPrintRiwayatPenghapusan = function() {
    let filteredAssets = globalAssets.filter(a => a.status === currentRiwayatPenghapusanTab);
    
    const searchVal = document.getElementById('search-riwayat-penghapusan')?.value.toLowerCase() || '';
    if (searchVal) {
        filteredAssets = filteredAssets.filter(a => 
            (a.kode_barang && a.kode_barang.toLowerCase().includes(searchVal)) ||
            (a.nama_barang && a.nama_barang.toLowerCase().includes(searchVal)) ||
            (a.merk_model && a.merk_model.toLowerCase().includes(searchVal))
        );
    }
    
    if (filteredAssets.length === 0) {
        if (typeof showToast === 'function') {
            showToast('Tidak ada data riwayat penghapusan untuk dicetak!', 'warning');
        } else {
            alert('Tidak ada data riwayat penghapusan untuk dicetak!');
        }
        return;
    }
    
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const currentYear = new Date().getFullYear();
    const pejabat = window.getPejabat();
    
    let reportTitle = `DAFTAR ASET YANG TELAH DI${currentRiwayatPenghapusanTab.toUpperCase()}`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Cetak Riwayat Penghapusan - ${currentRiwayatPenghapusanTab}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.2; font-size: 10px; }
        h3 { text-align: center; margin: 2px 0; font-size: 14px; text-transform: uppercase; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .meta-table { width: 100%; border: none; margin-bottom: 15px; font-size: 11px; }
        .meta-table td { padding: 2px; font-weight: bold; border: none !important; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; word-wrap: break-word; }
        table.data-table th, table.data-table td { border: 1px solid #000; padding: 5px; overflow-wrap: break-word; word-break: break-word; }
        table.data-table th { text-align: center; font-weight: bold; background-color: #e5e5e5; }
        .footer-sig { width: 100%; margin-top: 30px; }
        .footer-sig table { border: none !important; width: 100%; }
        .footer-sig td { border: none !important; width: 50%; padding: 5px; font-size: 12px; }
        @media print {
           @page { size: landscape; margin: 1cm; }
           body { padding: 0; margin: 0; }
           tr { break-inside: avoid; }
           thead { display: table-header-group; break-inside: avoid; }
           .footer-sig { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h3>${reportTitle}</h3>
      <h3 style="margin-bottom: 20px;">BADAN KESATUAN BANGSA DAN POLITIK KOTA BANJARMASIN</h3>
      
      <table class="meta-table">
        <tr>
          <td style="width: 15%;">SKPD</td><td style="width: 2%;">:</td><td style="width: 35%;">Badan Kesatuan Bangsa dan Politik</td>
          <td style="width: 15%;">Kode Lokasi</td><td style="width: 2%;">:</td><td style="width: 31%;">97.00.00</td>
        </tr>
        <tr>
          <td>Status Penghapusan</td><td>:</td><td>${currentRiwayatPenghapusanTab}</td>
          <td>Tahun Laporan</td><td>:</td><td>${currentYear}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 4%;">No.</th>
            <th style="width: 12%;">Kode Barang</th>
            <th style="width: 22%;">Nama/Jenis Barang</th>
            <th style="width: 13%;">Ruangan/Kategori</th>
            <th style="width: 17%;">Merk/Model</th>
            <th style="width: 11%;">No. Seri Pabrik</th>
            <th style="width: 5%;">Tahun</th>
            <th style="width: 5%;">Jumlah</th>
            <th style="width: 11%;">Harga Beli (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAssets.map((a, i) => `
            <tr>
              <td class="text-center">${i + 1}</td>
              <td class="text-center">${a.kode_barang || '-'}</td>
              <td><strong>${a.nama_barang || '-'}</strong></td>
              <td>${a.ruangan || '-'}</td>
              <td>${a.merk_model || '-'}</td>
              <td class="text-center">${a.no_seri || '-'}</td>
              <td class="text-center">${a.tahun || '-'}</td>
              <td class="text-center">${a.jumlah || 1}</td>
              <td class="text-right">${fmt(a.harga)}</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; background-color: #e5e5e5;">
            <td colspan="7" class="text-right">TOTAL:</td>
            <td class="text-center">${filteredAssets.reduce((sum, a) => sum + (a.jumlah || 1), 0)}</td>
            <td class="text-right">Rp ${fmt(filteredAssets.reduce((sum, a) => sum + ((a.harga || 0) * (a.jumlah || 1)), 0))}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-sig">
        <table>
          <tr>
            <td class="text-center" style="vertical-align: top;">
              Mengetahui:<br>
              <strong>Pengguna Barang</strong>
              <br><br><br><br>
              <u><strong>${pejabat.pengguna_nama}</strong></u><br>
              NIP. ${pejabat.pengguna_nip}
            </td>
            <td class="text-center" style="vertical-align: top;">
              Banjarmasin, ${dateStr}<br>
              <strong>Pengurus Barang</strong>
              <br><br><br><br>
              <u><strong>${pejabat.pengurus_nama}</strong></u><br>
              NIP. ${pejabat.pengurus_nip}
            </td>
          </tr>
        </table>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
        window.onafterprint = function() {
          window.close();
        };
      </script>
    </body>
    </html>
    `);
    printWindow.document.close();
};

window.handleSearchRiwayatPenghapusan = function() {
    renderRiwayatPenghapusanTable(globalAssets);
};

// Ekspos fungsi ke global scope
window.renderRiwayatPenghapusanTable = renderRiwayatPenghapusanTable;

// Initialize UI
updateRiwayatPenghapusanTabUI();
if (typeof globalAssets !== 'undefined' && globalAssets.length > 0) {
    renderRiwayatPenghapusanTable(globalAssets);
}
