-- Koç / özel ders / kurumsal hesap sistemi
-- Bu şema canlıya `prisma db push` ile uygulandığı için tüm ifadeler idempotenttir:
-- migration'ın mevcut veritabanında yeniden çalışması güvenlidir.

-- Rol enum'una KOC değeri
ALTER TYPE "Rol" ADD VALUE IF NOT EXISTS 'KOC';

-- KocTipi enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KocTipi') THEN
    CREATE TYPE "KocTipi" AS ENUM ('BIREYSEL', 'KURUMSAL');
  END IF;
END
$$;

-- Koç profilleri
CREATE TABLE IF NOT EXISTS "koc_profiller" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "telefon" TEXT,
    "tip" "KocTipi" NOT NULL DEFAULT 'BIREYSEL',
    "kurumAdi" TEXT,
    "referansKod" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koc_profiller_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "koc_profiller_kullaniciId_key" ON "koc_profiller"("kullaniciId");
CREATE UNIQUE INDEX IF NOT EXISTS "koc_profiller_referansKod_key" ON "koc_profiller"("referansKod");
CREATE INDEX IF NOT EXISTS "koc_profiller_ad_soyad_idx" ON "koc_profiller"("ad", "soyad");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'koc_profiller_kullaniciId_fkey') THEN
    ALTER TABLE "koc_profiller"
      ADD CONSTRAINT "koc_profiller_kullaniciId_fkey"
      FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Öğrenci → koç bağlantısı
ALTER TABLE "ogrenci_profiller" ADD COLUMN IF NOT EXISTS "kocId" TEXT;
CREATE INDEX IF NOT EXISTS "ogrenci_profiller_kocId_idx" ON "ogrenci_profiller"("kocId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ogrenci_profiller_kocId_fkey') THEN
    ALTER TABLE "ogrenci_profiller"
      ADD CONSTRAINT "ogrenci_profiller_kocId_fkey"
      FOREIGN KEY ("kocId") REFERENCES "koc_profiller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Satın alım → koç atribüsyonu
ALTER TABLE "satin_alimlar" ADD COLUMN IF NOT EXISTS "kocProfilId" TEXT;
CREATE INDEX IF NOT EXISTS "satin_alimlar_kocProfilId_durum_idx" ON "satin_alimlar"("kocProfilId", "durum");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'satin_alimlar_kocProfilId_fkey') THEN
    ALTER TABLE "satin_alimlar"
      ADD CONSTRAINT "satin_alimlar_kocProfilId_fkey"
      FOREIGN KEY ("kocProfilId") REFERENCES "koc_profiller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
