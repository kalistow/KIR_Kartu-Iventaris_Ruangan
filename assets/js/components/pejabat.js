// assets/js/components/pejabat.js
// ═══════════════════════════════════════════════════════════════
// Modul Pengelolaan Data Pejabat Penandatangan
// Data disimpan di localStorage sehingga bisa diubah tanpa
// menyentuh kode — cukup update lewat panel Pengaturan di UI.
// ═══════════════════════════════════════════════════════════════

const PEJABAT_KEY = 'simbar_pejabat_config';

/** Nilai default (data awal saat pertama kali digunakan) */
const PEJABAT_DEFAULT = {
    pengguna_nama: 'Ahmad Muzaiyin, S.Sos, M.A',
    pengguna_nip:  '19740328 199311 1 001',
    pengurus_nama: 'TRISNAWATI M ULYO HAPSARI, SE',
    pengurus_nip:  '19721124 200604 2 005',
};

/**
 * Ambil data pejabat dari localStorage.
 * Jika belum ada, kembalikan nilai default.
 * @returns {{ pengguna_nama, pengguna_nip, pengurus_nama, pengurus_nip }}
 */
window.getPejabat = function() {
    try {
        const raw = localStorage.getItem(PEJABAT_KEY);
        if (raw) return { ...PEJABAT_DEFAULT, ...JSON.parse(raw) };
    } catch (e) {
        console.warn('[Pejabat] Gagal membaca localStorage:', e);
    }
    return { ...PEJABAT_DEFAULT };
};

/**
 * Simpan data pejabat ke localStorage.
 * @param {{ pengguna_nama, pengguna_nip, pengurus_nama, pengurus_nip }} data
 */
window.savePejabat = function(data) {
    try {
        localStorage.setItem(PEJABAT_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('[Pejabat] Gagal menyimpan localStorage:', e);
    }
};

/**
 * Perbarui tampilan UI di semua elemen yang menampilkan data pejabat
 * (kartu info KIR, panel Rekap, dll).
 */
window.applyPejabatToUI = function() {
    const p = window.getPejabat();

    // ── Kartu Info KIR (index.html #kir-room-info-card) ──
    const elPenggunaNama = document.getElementById('display-pengguna-nama');
    const elPenggunaNip  = document.getElementById('display-pengguna-nip');
    const elPengurusNama = document.getElementById('display-pengurus-nama');
    const elPengurusNip  = document.getElementById('display-pengurus-nip');
    if (elPenggunaNama) elPenggunaNama.textContent = p.pengguna_nama;
    if (elPenggunaNip)  elPenggunaNip.textContent  = 'NIP: ' + p.pengguna_nip;
    if (elPengurusNama) elPengurusNama.textContent = p.pengurus_nama;
    if (elPengurusNip)  elPengurusNip.textContent  = 'NIP: ' + p.pengurus_nip;

    // ── Panel "Penandatangan Laporan Resmi" (rekap section) ──
    const elPreviewPenggunaNama = document.getElementById('preview-pengguna-nama');
    const elPreviewPenggunaNip  = document.getElementById('preview-pengguna-nip');
    const elPreviewPengurusNama = document.getElementById('preview-pengurus-nama');
    const elPreviewPengurusNip  = document.getElementById('preview-pengurus-nip');
    if (elPreviewPenggunaNama) elPreviewPenggunaNama.textContent = p.pengguna_nama;
    if (elPreviewPenggunaNip)  elPreviewPenggunaNip.textContent  = 'NIP. ' + p.pengguna_nip;
    if (elPreviewPengurusNama) elPreviewPengurusNama.textContent = p.pengurus_nama;
    if (elPreviewPengurusNip)  elPreviewPengurusNip.textContent  = 'NIP. ' + p.pengurus_nip;

    // ── Form input di panel Pengaturan Pejabat ──
    const fPenggunaNama = document.getElementById('set-pengguna-nama');
    const fPenggunaNip  = document.getElementById('set-pengguna-nip');
    const fPengurusNama = document.getElementById('set-pengurus-nama');
    const fPengurusNip  = document.getElementById('set-pengurus-nip');
    if (fPenggunaNama) fPenggunaNama.value = p.pengguna_nama;
    if (fPenggunaNip)  fPenggunaNip.value  = p.pengguna_nip;
    if (fPengurusNama) fPengurusNama.value = p.pengurus_nama;
    if (fPengurusNip)  fPengurusNip.value  = p.pengurus_nip;
};

/**
 * Handler tombol Simpan di panel Pengaturan Pejabat.
 * Dipanggil dari onclick di HTML.
 */
window.savePejabatSettings = function() {
    const pengguna_nama = document.getElementById('set-pengguna-nama')?.value.trim();
    const pengguna_nip  = document.getElementById('set-pengguna-nip')?.value.trim();
    const pengurus_nama = document.getElementById('set-pengurus-nama')?.value.trim();
    const pengurus_nip  = document.getElementById('set-pengurus-nip')?.value.trim();

    if (!pengguna_nama || !pengguna_nip || !pengurus_nama || !pengurus_nip) {
        if (typeof showToast === 'function') showToast('Semua kolom pejabat wajib diisi!', 'warning');
        return;
    }

    window.savePejabat({ pengguna_nama, pengguna_nip, pengurus_nama, pengurus_nip });
    window.applyPejabatToUI();
    if (typeof showToast === 'function') showToast('Data pejabat berhasil disimpan!', 'success');
};

// Terapkan data pejabat ke UI saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    window.applyPejabatToUI();
});
