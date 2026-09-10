-- Kurumsal hesaplar için sınıf / şube ve kurum öğretmeni yapısı
-- Tüm ifadeler idempotenttir (canlıya `db push` ile de uygulanabilmesi için).

-- Kurum öğretmeni tipi
ALTER TYPE "KocTipi" ADD VALUE IF NOT EXISTS 'KURUM_OGRETMENI';

-- Koç profili → bağlı olduğu kurum
ALTER TABLE "koc_profiller" ADD COLUMN IF NOT EXISTS "ustKurumId" TEXT;
CREATE INDEX IF NOT EXISTS "koc_profiller_ustKurumId_idx" ON "koc_profiller"("ustKurumId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'koc_profiller_ustKurumId_fkey') THEN
    ALTER TABLE "koc_profiller"
      ADD CONSTRAINT "koc_profiller_ustKurumId_fkey"
      FOREIGN KEY ("ustKurumId") REFERENCES "koc_profiller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Kurum sınıfları
CREATE TABLE IF NOT EXISTS "kurum_siniflar" (
    "id" TEXT NOT NULL,
    "kurumId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "seviye" TEXT,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kurum_siniflar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kurum_siniflar_kurumId_idx" ON "kurum_siniflar"("kurumId");
CREATE UNIQUE INDEX IF NOT EXISTS "kurum_siniflar_kurumId_ad_key" ON "kurum_siniflar"("kurumId", "ad");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kurum_siniflar_kurumId_fkey') THEN
    ALTER TABLE "kurum_siniflar"
      ADD CONSTRAINT "kurum_siniflar_kurumId_fkey"
      FOREIGN KEY ("kurumId") REFERENCES "koc_profiller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Sınıf ↔ kurum öğretmeni
CREATE TABLE IF NOT EXISTS "kurum_sinif_ogretmenler" (
    "sinifId" TEXT NOT NULL,
    "kocProfilId" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kurum_sinif_ogretmenler_pkey" PRIMARY KEY ("sinifId", "kocProfilId")
);

CREATE INDEX IF NOT EXISTS "kurum_sinif_ogretmenler_kocProfilId_idx" ON "kurum_sinif_ogretmenler"("kocProfilId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kurum_sinif_ogretmenler_sinifId_fkey') THEN
    ALTER TABLE "kurum_sinif_ogretmenler"
      ADD CONSTRAINT "kurum_sinif_ogretmenler_sinifId_fkey"
      FOREIGN KEY ("sinifId") REFERENCES "kurum_siniflar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kurum_sinif_ogretmenler_kocProfilId_fkey') THEN
    ALTER TABLE "kurum_sinif_ogretmenler"
      ADD CONSTRAINT "kurum_sinif_ogretmenler_kocProfilId_fkey"
      FOREIGN KEY ("kocProfilId") REFERENCES "koc_profiller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Öğrenci → sınıf
ALTER TABLE "ogrenci_profiller" ADD COLUMN IF NOT EXISTS "kurumSinifId" TEXT;
CREATE INDEX IF NOT EXISTS "ogrenci_profiller_kurumSinifId_idx" ON "ogrenci_profiller"("kurumSinifId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ogrenci_profiller_kurumSinifId_fkey') THEN
    ALTER TABLE "ogrenci_profiller"
      ADD CONSTRAINT "ogrenci_profiller_kurumSinifId_fkey"
      FOREIGN KEY ("kurumSinifId") REFERENCES "kurum_siniflar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
