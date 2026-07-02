-- =====================================================================
-- WingoDeneme — RAG / Eğitim Materyali Tabloları
-- Supabase SQL Editor'de çalıştırın.
-- pgvector + iki yeni tablo + similarity index + güncelleme trigger'ı.
-- =====================================================================

-- 1) pgvector extension (yoksa)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) EgitimDokumanDurum enum
DO $$ BEGIN
  CREATE TYPE "EgitimDokumanDurum" AS ENUM ('BEKLIYOR', 'ISLENIYOR', 'HAZIR', 'HATA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2b) EgitimDokumanTuru enum
DO $$ BEGIN
  CREATE TYPE "EgitimDokumanTuru" AS ENUM ('KONU_ANLATIMI','DENEME_SINAVI','SORU_ORNEKLERI','COZUM','DIGER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) egitim_dokumanlar tablosu
CREATE TABLE IF NOT EXISTS "egitim_dokumanlar" (
  "id"            text PRIMARY KEY,
  "baslik"        text NOT NULL,
  "ders"          text,
  "konuId"        text,
  "ogretimTuru"   "OgretimTuru",
  "tur"           "EgitimDokumanTuru" NOT NULL DEFAULT 'DIGER',
  "dosyaAd"       text NOT NULL,
  "dosyaTipi"     text NOT NULL,
  "dosyaBoyut"    integer NOT NULL,
  "dosyaUrl"      text,
  "sayfaBaslangic" integer,
  "sayfaBitis"     integer,
  "hamMetin"      text,
  "durum"         "EgitimDokumanDurum" NOT NULL DEFAULT 'BEKLIYOR',
  "hataMetni"     text,
  "chunkSayisi"   integer NOT NULL DEFAULT 0,
  "yukleyenId"    text,
  "olusturuldu"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "guncellendi"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Var olan kurulumlarda sütun yoksa önce ekle (index'ten önce!)
ALTER TABLE "egitim_dokumanlar"
  ADD COLUMN IF NOT EXISTS "tur" "EgitimDokumanTuru" NOT NULL DEFAULT 'DIGER';

ALTER TABLE "egitim_dokumanlar"
  ADD COLUMN IF NOT EXISTS "sayfaBaslangic" INTEGER,
  ADD COLUMN IF NOT EXISTS "sayfaBitis" INTEGER;

ALTER TABLE "egitim_dokumanlar"
  ADD COLUMN IF NOT EXISTS "egitimOzeti" TEXT;

CREATE INDEX IF NOT EXISTS "egitim_dokumanlar_ders_idx"   ON "egitim_dokumanlar" ("ders");
CREATE INDEX IF NOT EXISTS "egitim_dokumanlar_konuId_idx" ON "egitim_dokumanlar" ("konuId");
CREATE INDEX IF NOT EXISTS "egitim_dokumanlar_tur_idx"    ON "egitim_dokumanlar" ("tur");
CREATE INDEX IF NOT EXISTS "egitim_dokumanlar_durum_idx"  ON "egitim_dokumanlar" ("durum");

-- 4) egitim_chunklar tablosu (embedding vector kolonu DAHİL)
CREATE TABLE IF NOT EXISTS "egitim_chunklar" (
  "id"           text PRIMARY KEY,
  "dokumanId"    text NOT NULL REFERENCES "egitim_dokumanlar"("id") ON DELETE CASCADE,
  "sira"         integer NOT NULL,
  "metin"        text NOT NULL,
  "baslangic"    integer,
  "bitis"        integer,
  "tokenSayisi"  integer,
  "embedding"    vector(1536),
  "olusturuldu"  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "egitim_chunklar_dokumanId_sira_idx" ON "egitim_chunklar" ("dokumanId", "sira");

-- 5) IVFFlat similarity index (cosine)
-- Not: "lists" değeri ~ chunk sayısının kareköküdür. Başlangıç için 100 yeterli.
CREATE INDEX IF NOT EXISTS "egitim_chunklar_embedding_idx"
  ON "egitim_chunklar" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);

-- 6) updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION egitim_dokuman_set_guncellendi()
RETURNS TRIGGER AS $$
BEGIN
  NEW."guncellendi" := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_egitim_dokuman_guncellendi ON "egitim_dokumanlar";
CREATE TRIGGER trg_egitim_dokuman_guncellendi
  BEFORE UPDATE ON "egitim_dokumanlar"
  FOR EACH ROW EXECUTE FUNCTION egitim_dokuman_set_guncellendi();

-- 7) Supabase Storage Bucket'ı (manuel oluştur):
-- Storage → New bucket → name: "egitim-materyali" → Public: ON (veya private + signed URL kullanın)
-- Bu SQL bunu otomatik oluşturmaz; Supabase paneline gir.

-- 8) (Opsiyonel) Temizlik: tabloları silmek istersen:
--   DROP TABLE IF EXISTS "egitim_chunklar" CASCADE;
--   DROP TABLE IF EXISTS "egitim_dokumanlar" CASCADE;
--   DROP TYPE  IF EXISTS "EgitimDokumanDurum";
