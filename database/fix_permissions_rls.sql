-- ───────────────────────────────────────────────────────────────────────────
-- SQL FIX: Menghapus/Menonaktifkan Row Level Security (RLS) pada tabel impor
-- ───────────────────────────────────────────────────────────────────────────
-- Karena tabel bawaan SIMBAR lainnya (seperti assets dan master_bmd) tidak mengaktifkan RLS
-- dan diakses menggunakan anon key (tanpa harus login penuh di level database),
-- mengaktifkan RLS pada tabel baru menyebabkan error "permission denied".
-- 
-- Jalankan query berikut di Supabase SQL Editor Anda untuk memperbaikinya:

ALTER TABLE import_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE asset_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_queue DISABLE ROW LEVEL SECURITY;
