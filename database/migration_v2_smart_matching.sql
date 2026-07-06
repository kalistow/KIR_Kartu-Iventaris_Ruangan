-- ═══════════════════════════════════════════════════════════════════════════
-- SIMBAR Smart Matching Engine v2.0 — Database Migration
-- Jalankan di Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Tabel: import_sessions
--    Mencatat metadata setiap sesi impor file Excel.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name       TEXT NOT NULL,
    file_type       TEXT NOT NULL CHECK (file_type IN ('BMD', 'KIR')),
    total_rows      INT  DEFAULT 0,
    matched_auto    INT  DEFAULT 0,
    need_review     INT  DEFAULT 0,
    new_assets      INT  DEFAULT 0,
    missing         INT  DEFAULT 0,
    status          TEXT DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'DONE', 'PARTIAL', 'ERROR')),
    imported_at     TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Tabel: asset_versions
--    Snapshot data aset sebelum setiap perubahan (audit trail versi).
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_versions (
    id              BIGSERIAL PRIMARY KEY,
    master_bmd_id   BIGINT REFERENCES master_bmd(id) ON DELETE SET NULL,
    import_session  UUID   REFERENCES import_sessions(id) ON DELETE SET NULL,
    nama_barang     TEXT,
    kode_barang     TEXT,
    merek_tipe      TEXT,
    spesifikasi     TEXT,
    harga           NUMERIC(20, 2),
    jumlah          INT,
    satuan          TEXT,
    snapshot_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Tabel: verification_queue
--    Antrian kasus ambigu (confidence 80-94%) menunggu keputusan admin.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_queue (
    id              BIGSERIAL PRIMARY KEY,
    import_session  UUID   NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
    incoming_data   JSONB  NOT NULL,
    candidate_data  JSONB,
    confidence      INT    NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    status          TEXT   DEFAULT 'REVIEW' CHECK (status IN ('REVIEW', 'APPROVED', 'REJECTED')),
    decision_by     TEXT,
    decision_at     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Kolom tambahan di tabel master_bmd yang sudah ada
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE master_bmd
    ADD COLUMN IF NOT EXISTS fingerprint         TEXT,
    ADD COLUMN IF NOT EXISTS last_import_session UUID  REFERENCES import_sessions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS confidence_score    INT   CHECK (confidence_score BETWEEN 0 AND 100);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Kolom tambahan di tabel riwayat_barang (jika belum ada)
--    Untuk menyimpan snapshot sebelum/sesudah perubahan.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE riwayat_barang
    ADD COLUMN IF NOT EXISTS detail_before TEXT,
    ADD COLUMN IF NOT EXISTS detail_after  TEXT;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Index untuk performa query cepat
-- ───────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_master_bmd_fingerprint
    ON master_bmd(fingerprint);

CREATE INDEX IF NOT EXISTS idx_master_bmd_last_session
    ON master_bmd(last_import_session);

CREATE INDEX IF NOT EXISTS idx_asset_versions_bmd_id
    ON asset_versions(master_bmd_id);

CREATE INDEX IF NOT EXISTS idx_asset_versions_session
    ON asset_versions(import_session);

CREATE INDEX IF NOT EXISTS idx_vq_session
    ON verification_queue(import_session);

CREATE INDEX IF NOT EXISTS idx_vq_status
    ON verification_queue(status);

CREATE INDEX IF NOT EXISTS idx_assets_master_bmd_id
    ON assets(master_bmd_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Row Level Security (RLS) — sesuaikan dengan policy yang sudah ada
-- ───────────────────────────────────────────────────────────────────────────
-- Aktifkan RLS pada tabel baru
ALTER TABLE import_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_queue ENABLE ROW LEVEL SECURITY;

-- Policy: hanya pengguna terautentikasi yang bisa akses
-- (DROP dulu jika sudah ada, agar script bisa dijalankan ulang)
DROP POLICY IF EXISTS "authenticated_import_sessions" ON import_sessions;
CREATE POLICY "authenticated_import_sessions"
    ON import_sessions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_asset_versions" ON asset_versions;
CREATE POLICY "authenticated_asset_versions"
    ON asset_versions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_verification_queue" ON verification_queue;
CREATE POLICY "authenticated_verification_queue"
    ON verification_queue FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────────
-- Verifikasi: tampilkan semua tabel yang baru dibuat
-- ───────────────────────────────────────────────────────────────────────────
SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('import_sessions', 'asset_versions', 'verification_queue', 'master_bmd', 'assets', 'riwayat_barang')
ORDER BY table_name;
