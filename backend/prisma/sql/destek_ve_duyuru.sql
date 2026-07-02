-- =====================================================================
-- WingoDeneme — Destek (ticket) + Duyuru sistemi
-- Supabase SQL Editor'de çalıştırın.
-- =====================================================================

-- Enums (Prisma enum isimleriyle aynı)
DO $$ BEGIN
  CREATE TYPE "DestekTalebiDurum" AS ENUM ('ACIK','BEKLEMEDE','COZULDU','KAPANDI');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DuyuruHedefTuru" AS ENUM ('TUMU','ROL','KULLANICI');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Destek talepleri
CREATE TABLE IF NOT EXISTS "destek_talepleri" (
  "id" text PRIMARY KEY,
  "ogrenciId" text NOT NULL REFERENCES "ogrenci_profiller"("id") ON DELETE CASCADE,
  "baslik" text NOT NULL,
  "durum" "DestekTalebiDurum" NOT NULL DEFAULT 'ACIK',
  "oncelik" integer NOT NULL DEFAULT 1,
  "sonMesajAt" timestamptz NOT NULL DEFAULT now(),
  "olusturuldu" timestamptz NOT NULL DEFAULT now(),
  "guncellendi" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "destek_talepleri_ogrenci_durum_idx" ON "destek_talepleri" ("ogrenciId","durum");
CREATE INDEX IF NOT EXISTS "destek_talepleri_sonMesajAt_idx" ON "destek_talepleri" ("sonMesajAt");

-- Destek mesajları
CREATE TABLE IF NOT EXISTS "destek_mesajlari" (
  "id" text PRIMARY KEY,
  "talepId" text NOT NULL REFERENCES "destek_talepleri"("id") ON DELETE CASCADE,
  "gonderenId" text NOT NULL REFERENCES "kullanicilar"("id") ON DELETE CASCADE,
  "gonderenRol" "Rol" NOT NULL,
  "mesaj" text NOT NULL,
  "olusturuldu" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "destek_mesajlari_talep_olusturuldu_idx" ON "destek_mesajlari" ("talepId","olusturuldu");

-- Duyurular
CREATE TABLE IF NOT EXISTS "duyurular" (
  "id" text PRIMARY KEY,
  "baslik" text NOT NULL,
  "mesaj" text NOT NULL,
  "hedefTuru" "DuyuruHedefTuru" NOT NULL DEFAULT 'TUMU',
  "hedefRoller" "Rol"[] NOT NULL DEFAULT ARRAY[]::"Rol"[],
  "olusturanId" text NULL REFERENCES "kullanicilar"("id") ON DELETE SET NULL,
  "olusturuldu" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "duyurular_hedefTuru_olusturuldu_idx" ON "duyurular" ("hedefTuru","olusturuldu");

-- Duyuru alıcıları
CREATE TABLE IF NOT EXISTS "duyuru_alicilari" (
  "id" text PRIMARY KEY,
  "duyuruId" text NOT NULL REFERENCES "duyurular"("id") ON DELETE CASCADE,
  "kullaniciId" text NOT NULL REFERENCES "kullanicilar"("id") ON DELETE CASCADE,
  "okundu" boolean NOT NULL DEFAULT false,
  "okunduAt" timestamptz NULL,
  "olusturuldu" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("duyuruId","kullaniciId")
);
CREATE INDEX IF NOT EXISTS "duyuru_alicilari_kullanici_okundu_idx" ON "duyuru_alicilari" ("kullaniciId","okundu");

-- updated_at trigger helper
-- NOT: İç içe $$ kullanımı Supabase'de parse hatası verebiliyor, bu yüzden doğrudan CREATE OR REPLACE yapıyoruz.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $func$
BEGIN
  NEW."guncellendi" = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_destek_talepleri_updated_at" ON "destek_talepleri";
CREATE TRIGGER "trg_destek_talepleri_updated_at"
BEFORE UPDATE ON "destek_talepleri"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

