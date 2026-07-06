-- ───────────────────────────────────────────────────────────────────────────
-- SQL CLEAN: Mengosongkan data Master BMD saja (mempertahankan data KIR/Ruangan)
-- ───────────────────────────────────────────────────────────────────────────
-- Query ini berguna untuk menghapus data Master BMD yang salah atau terduplikat,
-- tetapi tetap mempertahankan data KIR/Ruangan Anda di tabel assets.
--
-- Jalankan query berikut di Supabase SQL Editor Anda:

TRUNCATE TABLE 
    master_bmd,
    import_sessions, 
    asset_versions, 
    verification_queue 
RESTART IDENTITY CASCADE;
