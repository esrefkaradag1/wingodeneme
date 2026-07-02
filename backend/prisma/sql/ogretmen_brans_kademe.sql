-- =====================================================================
-- WingoDeneme — Öğretmen branşı ve kademesi (admin_profiller'a sütun)
-- Supabase SQL Editor'de çalıştırın.
-- =====================================================================

ALTER TABLE "admin_profiller"
  ADD COLUMN IF NOT EXISTS "brans" text;

ALTER TABLE "admin_profiller"
  ADD COLUMN IF NOT EXISTS "ogretimTuru" "OgretimTuru";

CREATE INDEX IF NOT EXISTS "admin_profiller_brans_idx"        ON "admin_profiller" ("brans");
CREATE INDEX IF NOT EXISTS "admin_profiller_ogretimTuru_idx"  ON "admin_profiller" ("ogretimTuru");
