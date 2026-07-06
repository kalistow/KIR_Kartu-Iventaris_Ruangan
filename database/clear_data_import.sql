-- ───────────────────────────────────────────────────────────────────────────
-- SQL CLEAN: Mengosongkan data lama untuk impor ulang yang bersih
-- ───────────────────────────────────────────────────────────────────────────
-- Query ini akan mengosongkan semua data aset, master BMD, riwayat, sesi impor,
-- dan antrean verifikasi agar Anda bisa memulai dari nol (bersih).
--
-- Jalankan query berikut di Supabase SQL Editor Anda:

TRUNCATE TABLE 
    import_sessions, 
    asset_versions, 
    verification_queue, 
    master_bmd, 
    assets, 
    riwayat_barang 
RESTART IDENTITY CASCADE;
