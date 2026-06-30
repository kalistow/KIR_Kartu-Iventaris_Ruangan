// assets/js/components/rekap.js

function renderRekapTable(assets) {
    const tbody = document.getElementById('rekap-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Group assets by room
    const rekapMap = {};
    const rooms = [...getActiveRooms(), "Gudang Transit"];
    rooms.forEach(room => {
        rekapMap[room] = { qty: 0, price: 0, baik: 0, kurang: 0, rusak: 0 };
    });
    
    assets.forEach(a => {
        const room = a.ruangan || 'Gudang Transit';
        if (!rekapMap[room]) {
            rekapMap[room] = { qty: 0, price: 0, baik: 0, kurang: 0, rusak: 0 };
        }
        const qty = a.jumlah || 1;
        rekapMap[room].qty += qty;
        rekapMap[room].price += (a.harga || 0) * qty;
        
        if (a.kondisi === 'Baik') rekapMap[room].baik += qty;
        else if (a.kondisi === 'Kurang Baik') rekapMap[room].kurang += qty;
        else if (a.kondisi === 'Rusak Berat') rekapMap[room].rusak += qty;
    });
    
    // Initialize selectedRekapRooms with all rooms if it's empty
    if (selectedRekapRooms.size === 0) {
        rooms.forEach(r => selectedRekapRooms.add(r));
    }
    
    let index = 1;
    let totalAllQty = 0;
    let totalAllVal = 0;
    
    rooms.forEach(room => {
        const data = rekapMap[room];
        totalAllQty += data.qty;
        totalAllVal += data.price;
        
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/20 hover:bg-white/10 transition-colors';
        tr.innerHTML = `
            <td class="py-3 px-4 text-center">
                <input type="checkbox" onchange="toggleRoomRekap(this, '${room}')" ${selectedRekapRooms.has(room) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500">
            </td>
            <td class="py-3 px-4 text-center">${index++}</td>
            <td class="py-3 px-4 font-bold text-gray-900">${room}</td>
            <td class="py-3 px-4 text-center">${data.qty}</td>
            <td class="py-3 px-4 text-right font-extrabold text-blue-900">Rp ${fmt(data.price)}</td>
            <td class="py-3 px-4 text-center text-green-700">${data.baik}</td>
            <td class="py-3 px-4 text-center text-yellow-700">${data.kurang}</td>
            <td class="py-3 px-4 text-center text-red-600">${data.rusak}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Add total row
    const trTotal = document.createElement('tr');
    trTotal.className = 'bg-white/30 border-t-2 border-white/60 font-extrabold text-gray-900';
    trTotal.innerHTML = `
        <td colspan="3" class="py-4 px-4 text-right">TOTAL:</td>
        <td class="py-4 px-4 text-center">${totalAllQty}</td>
        <td class="py-4 px-4 text-right font-black text-blue-950">Rp ${fmt(totalAllVal)}</td>
        <td colspan="3" class="py-4 px-4"></td>
    `;
    tbody.appendChild(trTotal);
    
    // Update button display count and state
    updateRekapButtonsState();
}

window.toggleRoomRekap = function(checkbox, roomName) {
    if (checkbox.checked) {
        selectedRekapRooms.add(roomName);
    } else {
        selectedRekapRooms.delete(roomName);
    }
    updateRekapButtonsState();
};

window.toggleSelectAllRekap = function(masterCheckbox) {
    const rooms = [...getActiveRooms(), "Gudang Transit"];
    if (masterCheckbox.checked) {
        rooms.forEach(r => selectedRekapRooms.add(r));
    } else {
        selectedRekapRooms.clear();
    }
    
    // Re-render table checkboxes
    const tbody = document.getElementById('rekap-tbody');
    if (tbody) {
        const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = masterCheckbox.checked;
        });
    }
    updateRekapButtonsState();
};

window.updateRekapButtonsState = function() {
    const btn = document.getElementById('btn-print-rekap-selected');
    const countEl = document.getElementById('rekap-selected-count');
    const masterCheck = document.getElementById('select-all-rekap');
    
    const activeRoomsCount = [...getActiveRooms(), "Gudang Transit"].length;
    
    if (countEl) countEl.textContent = selectedRekapRooms.size;
    if (btn) {
        if (selectedRekapRooms.size === 0) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    if (masterCheck) {
        if (selectedRekapRooms.size === activeRoomsCount) {
            masterCheck.checked = true;
            masterCheck.indeterminate = false;
        } else if (selectedRekapRooms.size === 0) {
            masterCheck.checked = false;
            masterCheck.indeterminate = false;
        } else {
            masterCheck.checked = false;
            masterCheck.indeterminate = true;
        }
    }
};

window.triggerPrintRekap = function() {
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Group assets by room
    const rekapMap = {};
    OFFICIAL_ROOMS.forEach(room => {
        rekapMap[room] = { qty: 0, price: 0, baik: 0, kurang: 0, rusak: 0 };
    });
    
    globalAssets.forEach(a => {
        const room = a.ruangan || 'Gudang Transit';
        if (!rekapMap[room]) rekapMap[room] = { qty: 0, price: 0, baik: 0, kurang: 0, rusak: 0 };
        const qty = a.jumlah || 1;
        rekapMap[room].qty += qty;
        rekapMap[room].price += (a.harga || 0) * qty;
        if (a.kondisi === 'Baik') rekapMap[room].baik += qty;
        else if (a.kondisi === 'Kurang Baik') rekapMap[room].kurang += qty;
        else if (a.kondisi === 'Rusak Berat') rekapMap[room].rusak += qty;
    });

    let totalAllQty = 0;
    let totalAllVal = 0;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Rekapitulasi Aset Ruangan</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; font-size: 12px; }
        h2, h3 { text-align: center; margin: 3px 0; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { text-align: center; font-weight: bold; background-color: #f2f2f2; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .footer-sig { width: 100%; margin-top: 40px; }
        .footer-sig table { border: none !important; width: 100%; }
        .footer-sig td { border: none !important; width: 50%; padding: 5px; }
      </style>
    </head>
    <body>
      <h2>LAPORAN REKAPITULASI ASET KARTU INVENTARIS RUANGAN (KIR)</h2>
      <h3>BADAN KESATUAN BANGSA DAN POLITIK KOTA BANJARMASIN</h3>
      <h3 style="margin-bottom: 20px;">TAHUN ANGGARAN 2026</h3>

      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Ruangan / Lokasi</th>
            <th>Jumlah Item Aset</th>
            <th>Total Nilai Perolehan (Rp)</th>
            <th>Kondisi Baik</th>
            <th>Kondisi Kurang Baik</th>
            <th>Kondisi Rusak Berat</th>
          </tr>
        </thead>
        <tbody>
          ${OFFICIAL_ROOMS.map((room, index) => {
            const data = rekapMap[room];
            totalAllQty += data.qty;
            totalAllVal += data.price;
            return `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td><strong>${room}</strong></td>
                <td class="text-center">${data.qty}</td>
                <td class="text-right">${fmt(data.price)}</td>
                <td class="text-center">${data.baik}</td>
                <td class="text-center">${data.kurang}</td>
                <td class="text-center">${data.rusak}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background-color: #e5e5e5; font-weight: bold;">
            <td colspan="2" class="text-right">TOTAL KESELURUHAN:</td>
            <td class="text-center">${totalAllQty}</td>
            <td class="text-right">Rp ${fmt(totalAllVal)}</td>
            <td colspan="3"></td>
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
              <u><strong>Ahmad Muzaiyin, S.Sos, M.A</strong></u><br>
              NIP. 19740328 199311 1 001
            </td>
            <td class="text-center" style="vertical-align: top;">
              Banjarmasin, ${dateStr}<br>
              <strong>Pengurus Barang</strong>
              <br><br><br><br>
              <u><strong>TRISNAWATI M ULYO HAPSARI, SE</strong></u><br>
              NIP. 19721124 200604 2 005
            </td>
          </tr>
        </table>
      </div>
      
      <script>
        window.print();
        window.onafterprint = function() { window.close(); };
      </script>
    </body>
    </html>
    `);
    printWindow.document.close();
};

window.triggerPrintRekapSelected = function() {
    if (selectedRekapRooms.size === 0) {
        alert('Silakan pilih minimal satu ruangan untuk dicetak!');
        return;
    }
    
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Group assets by room
    const rekapMap = {};
    const selectedRoomsArr = Array.from(selectedRekapRooms);
    selectedRoomsArr.forEach(room => {
        rekapMap[room] = { qty: 0, price: 0, baik: 0, kurang: 0, rusak: 0 };
    });
    
    globalAssets.forEach(a => {
        const room = a.ruangan || 'Gudang Transit';
        if (rekapMap[room]) { // Only sum for selected rooms!
            const qty = a.jumlah || 1;
            rekapMap[room].qty += qty;
            rekapMap[room].price += (a.harga || 0) * qty;
            if (a.kondisi === 'Baik') rekapMap[room].baik += qty;
            else if (a.kondisi === 'Kurang Baik') rekapMap[room].kurang += qty;
            else if (a.kondisi === 'Rusak Berat') rekapMap[room].rusak += qty;
        }
    });

    let totalAllQty = 0;
    let totalAllVal = 0;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Rekapitulasi Aset Ruangan (Terpilih)</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; font-size: 12px; }
        h2, h3 { text-align: center; margin: 3px 0; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { text-align: center; font-weight: bold; background-color: #f2f2f2; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .footer-sig { width: 100%; margin-top: 40px; }
        .footer-sig table { border: none !important; width: 100%; }
        .footer-sig td { border: none !important; width: 50%; padding: 5px; }
      </style>
    </head>
    <body>
      <h2>LAPORAN REKAPITULASI ASET KARTU INVENTARIS RUANGAN (KIR)</h2>
      <h3>BADAN KESATUAN BANGSA DAN POLITIK KOTA BANJARMASIN</h3>
      <h3 style="margin-bottom: 20px;">TAHUN ANGGARAN 2026</h3>
      <p style="font-weight: bold; margin-bottom: 10px; font-style: italic;">Laporan Rekapitulasi untuk Ruangan Terpilih</p>

      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Ruangan / Lokasi</th>
            <th>Jumlah Item Aset</th>
            <th>Total Nilai Perolehan (Rp)</th>
            <th>Kondisi Baik</th>
            <th>Kondisi Kurang Baik</th>
            <th>Kondisi Rusak Berat</th>
          </tr>
        </thead>
        <tbody>
          ${selectedRoomsArr.map((room, index) => {
            const data = rekapMap[room];
            totalAllQty += data.qty;
            totalAllVal += data.price;
            return `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td><strong>${room}</strong></td>
                <td class="text-center">${data.qty}</td>
                <td class="text-right">${fmt(data.price)}</td>
                <td class="text-center">${data.baik}</td>
                <td class="text-center">${data.kurang}</td>
                <td class="text-center">${data.rusak}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background-color: #e5e5e5; font-weight: bold;">
            <td colspan="2" class="text-right">TOTAL KESELURUHAN:</td>
            <td class="text-center">${totalAllQty}</td>
            <td class="text-right">Rp ${fmt(totalAllVal)}</td>
            <td colspan="3"></td>
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
              <u><strong>Ahmad Muzaiyin, S.Sos, M.A</strong></u><br>
              NIP. 19740328 199311 1 001
            </td>
            <td class="text-center" style="vertical-align: top;">
              Banjarmasin, ${dateStr}<br>
              <strong>Pengurus Barang</strong>
              <br><br><br><br>
              <u><strong>TRISNAWATI M ULYO HAPSARI, SE</strong></u><br>
              NIP. 19721124 200604 2 005
            </td>
          </tr>
        </table>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
    `);
    printWindow.document.close();
};

window.triggerPrintKIR = function() {
    const roomFiltered = globalAssets.filter(a => a.ruangan === selectedRoom);
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>KIR - ${selectedRoom}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.2; font-size: 10px; }
        h3 { text-align: center; margin: 2px 0; font-size: 14px; text-transform: uppercase; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .meta-table { width: 100%; border: none; margin-bottom: 15px; font-size: 11px; }
        .meta-table td { padding: 2px; font-weight: bold; border: none !important; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; word-wrap: break-word; }
        table.data-table th, table.data-table td { border: 1px solid #000; padding: 3px; overflow-wrap: break-word; word-break: break-word; }
        table.data-table th { text-align: center; font-weight: bold; background-color: #e5e5e5; }
        .footer-sig { width: 100%; margin-top: 30px; }
        .footer-sig table { border: none !important; width: 100%; }
        .footer-sig td { border: none !important; width: 50%; padding: 5px; font-size: 12px; }
        @media print {
           @page { size: landscape; margin: 1cm; }
           body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h3>KARTU INVENTARIS RUANGAN (KIR)</h3>
      <h3 style="margin-bottom: 20px;">BADAN KESATUAN BANGSA DAN POLITIK KOTA BANJARMASIN</h3>
      
      <table class="meta-table">
        <tr>
          <td style="width: 15%;">SKPD</td><td style="width: 2%;">:</td><td style="width: 35%;">Badan Kesatuan Bangsa dan Politik</td>
          <td style="width: 15%;">Kode Lokasi</td><td style="width: 2%;">:</td><td style="width: 31%;">97.00.00</td>
        </tr>
        <tr>
          <td>Ruangan</td><td>:</td><td>${selectedRoom}</td>
          <td>Tahun</td><td>:</td><td>2026</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="2">No. Urut</th>
            <th rowspan="2">NIBAR</th>
            <th rowspan="2">Kode Barang</th>
            <th rowspan="2">Nama/Jenis Barang</th>
            <th rowspan="2">Merk/Model</th>
            <th rowspan="2">No. Seri Pabrik</th>
            <th rowspan="2">Ukuran</th>
            <th rowspan="2">Bahan</th>
            <th rowspan="2">Tahun</th>
            <th rowspan="2">Jml</th>
            <th rowspan="2">Harga (Rp)</th>
            <th colspan="3">Keadaan Barang</th>
            <th rowspan="2">Keterangan</th>
          </tr>
          <tr>
            <th>B</th>
            <th>KB</th>
            <th>RB</th>
          </tr>
        </thead>
        <tbody>
          ${roomFiltered.map((a, i) => {
              let nibar = '-';
              if (a.master_bmd_id) {
                  const linked = globalMasterBmd.find(b => b.id === a.master_bmd_id);
                  if (linked) nibar = linked.nibar || '-';
              }
              return `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td class="text-center" style="font-family: monospace; font-size: 9px;">${nibar}</td>
                  <td class="text-center">${a.kode_barang || '-'}</td>
                  <td>${a.nama_barang || '-'}</td>
                  <td>${a.merk_model || '-'}</td>
                  <td class="text-center">${a.no_seri || '-'}</td>
                  <td class="text-center">${a.ukuran || '-'}</td>
                  <td class="text-center">${a.bahan || '-'}</td>
                  <td class="text-center">${a.tahun || '-'}</td>
                  <td class="text-center">${a.jumlah || 1}</td>
                  <td class="text-right">${fmt(a.harga)}</td>
                  <td class="text-center">${a.kondisi === 'Baik' ? '✓' : ''}</td>
                  <td class="text-center">${a.kondisi === 'Kurang Baik' ? '✓' : ''}</td>
                  <td class="text-center">${a.kondisi === 'Rusak Berat' ? '✓' : ''}</td>
                  <td style="font-size: 9px; font-style: italic;">${a.keterangan || '-'}</td>
                </tr>
              `;
          }).join('')}
          ${roomFiltered.length === 0 ? '<tr><td colspan="15" class="text-center">Aset tidak tersedia</td></tr>' : ''}
        </tbody>
      </table>

      <div class="footer-sig">
        <table>
          <tr>
            <td class="text-center" style="vertical-align: top;">
              Mengetahui:<br>
              <strong>Pengguna Barang</strong>
              <br><br><br><br>
              <u><strong>Ahmad Muzaiyin, S.Sos, M.A</strong></u><br>
              NIP. 19740328 199311 1 001
            </td>
            <td class="text-center" style="vertical-align: top;">
              Banjarmasin, ${dateStr}<br>
              <strong>Pengurus Barang</strong>
              <br><br><br><br>
              <u><strong>TRISNAWATI M ULYO HAPSARI, SE</strong></u><br>
              NIP. 19721124 200604 2 005
            </td>
          </tr>
        </table>
      </div>
      
      <script>
        window.print();
        window.onafterprint = function() { window.close(); };
      </script>
    </body>
    </html>
    `);
    printWindow.document.close();
};
