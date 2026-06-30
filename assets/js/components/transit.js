// assets/js/components/transit.js

function renderTransitTable(assets) {
    const tbody = document.getElementById('transit-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const transitAssets = assets.filter(a => (a.ruangan === 'Gudang Transit' || a.status === 'Perlu Verifikasi') && (a.status === 'Pesan Masuk' || a.status === 'Perlu Verifikasi'));
    
    const searchVal = document.getElementById('search-transit')?.value.toLowerCase() || '';
    const filtered = transitAssets.filter(a => 
        (a.kode_barang && a.kode_barang.toLowerCase().includes(searchVal)) ||
        (a.nama_barang && a.nama_barang.toLowerCase().includes(searchVal)) ||
        (a.merk_model && a.merk_model.toLowerCase().includes(searchVal))
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center py-10 text-textMuted">Gudang Transit kosong. Semua aset telah terpetakan.</td><td></td></tr>';
        return;
    }
    
    filtered.forEach((a, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-white/30 hover:bg-white/20 transition-colors';
        tr.innerHTML = `
            <td class="py-4 px-4 whitespace-nowrap text-center">${index + 1}</td>
            <td class="py-4 px-4 whitespace-nowrap">${a.kode_barang || '-'}</td>
            <td class="py-4 px-4 font-extrabold text-gray-900">${a.nama_barang || '-'}</td>
            <td class="py-4 px-4 text-textMuted">${a.merk_model || '-'}</td>
            <td class="py-4 px-4">${a.no_seri || '-'}</td>
            <td class="py-4 px-4">${a.ukuran || '-'}</td>
            <td class="py-4 px-4">${a.bahan || '-'}</td>
            <td class="py-4 px-4 text-center">${a.tahun || '-'}</td>
            <td class="py-4 px-4 text-center">${a.jumlah || 1}</td>
            <td class="py-4 px-4 text-right text-blue-900">Rp ${fmt(a.harga)}</td>
            <td class="py-4 px-4 text-center">${badgeForKondisi(a.kondisi)}</td>
            <td class="py-4 px-4 text-center">
                ${a.status === 'Pesan Masuk' ? '<span class="bg-pastel-yellow text-yellow-800 py-1.5 px-3 rounded-full text-xs font-black border border-yellow-300 shadow-sm animate-pulse">Pesan Masuk</span>' :
                  a.status === 'Aktif' ? '<span class="bg-pastel-green text-green-800 py-1.5 px-3 rounded-full text-xs font-black border border-green-300 shadow-sm">Aktif</span>' :
                  a.status === 'Tetap di Non-KIR' || a.status === 'Tetap Non-KIR' ? '<span class="bg-blue-100 text-blue-800 py-1.5 px-3 rounded-full text-xs font-black shadow-sm border border-blue-300">Tetap Non-KIR</span>' :
                  a.status === 'Perlu Verifikasi' ? '<span class="bg-orange-100 text-orange-800 py-1.5 px-3 rounded-full text-xs font-black border border-orange-300 shadow-sm">Perlu Verifikasi</span>' :
                  a.status === 'Usul Penghapusan' ? '<span class="bg-pastel-red text-red-800 py-1.5 px-3 rounded-full text-xs font-black border border-red-300 shadow-sm">Usul Penghapusan</span>' :
                  badgeForKondisi(a.status || 'Aktif')}
            </td>
            <td class="py-4 px-4 text-center">
                <button onclick="openActionModal(${a.id})" class="clay-btn px-4 py-2 flex items-center justify-center gap-2 w-full !shadow-clay-sm text-blue-700 hover:text-blue-950 font-extrabold text-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Tempatkan
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.handleSearchTransit = function() {
    renderTransitTable(globalAssets);
};

window.openActionModal = function(id) {
    document.getElementById('action-asset-id').value = id;
    
    // reset selection
    const radios = document.getElementsByName('transit-action');
    if(radios.length > 0) radios[0].checked = true;
    window.toggleActionConfirm();

    const modal = document.getElementById('action-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.clay-panel').classList.remove('scale-95');
    }, 10);
};

window.closeActionModal = function() {
    const modal = document.getElementById('action-modal');
    modal.classList.add('opacity-0');
    modal.querySelector('.clay-panel').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.toggleActionConfirm = function() {
    const action = document.querySelector('input[name="transit-action"]:checked')?.value;
    const confirmBox = document.getElementById('action-hapus-confirm');
    const indukConfirmBox = document.getElementById('action-induk-confirm');
    
    // Update styling for labels
    document.getElementById('lbl-action-kir').classList.remove('!shadow-clay-pressed', '!bg-surface/85');
    document.getElementById('lbl-action-nonkir').classList.remove('!shadow-clay-pressed', '!bg-surface/85');
    document.getElementById('lbl-action-hapus').classList.remove('!shadow-clay-pressed', '!bg-surface/85');
    const lblInduk = document.getElementById('lbl-action-induk');
    if (lblInduk) lblInduk.classList.remove('!shadow-clay-pressed', '!bg-purple-100/80');
    
    if (action === 'KIR') document.getElementById('lbl-action-kir').classList.add('!shadow-clay-pressed', '!bg-surface/85');
    if (action === 'Non-KIR') document.getElementById('lbl-action-nonkir').classList.add('!shadow-clay-pressed', '!bg-surface/85');
    if (action === 'Hapus') document.getElementById('lbl-action-hapus').classList.add('!shadow-clay-pressed', '!bg-surface/85');
    if (action === 'Data Induk' && lblInduk) lblInduk.classList.add('!shadow-clay-pressed', '!bg-purple-100/80');

    if (action === 'Hapus') {
        confirmBox.classList.remove('hidden');
    } else {
        confirmBox.classList.add('hidden');
    }
    
    if (indukConfirmBox) {
        if (action === 'Data Induk') {
            indukConfirmBox.classList.remove('hidden');
        } else {
            indukConfirmBox.classList.add('hidden');
        }
    }
};

async function executeTransitAction(id, status, ruanganOverride, historyMsg) {
    try {
        const payload = { status: status };
        if (ruanganOverride) payload.ruangan = ruanganOverride;
        
        const { error } = await supabaseClient.from('assets').update(payload).eq('id', id);
        if (error) throw error;
        
        await supabaseClient.from('riwayat_barang').insert([{
            asset_id: id,
            jenis_perubahan: 'Perubahan Status Gudang Transit',
            keterangan: historyMsg,
            tanggal: new Date().toISOString()
        }]);
        
        loadAllData();
    } catch(e) {
        alert('Gagal mengeksekusi aksi: ' + e.message);
    }
}
