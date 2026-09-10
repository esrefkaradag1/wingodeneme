-- İndirim kodu ve öğretmen komisyonu
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IndirimTipi') THEN
    CREATE TYPE "IndirimTipi" AS ENUM ('YUZDE', 'TUTAR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KomisyonDurumu') THEN
    CREATE TYPE "KomisyonDurumu" AS ENUM ('BEKLEMEDE', 'ONAYLANDI', 'ODENDI', 'IPTAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IndirimPlatformu') THEN
    CREATE TYPE "IndirimPlatformu" AS ENUM ('HEPSI', 'YKS_LGS', 'KPSS');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "indirim_kodlari" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "aciklama" TEXT,
    "ogretmenId" TEXT,
    "indirimTipi" "IndirimTipi" NOT NULL DEFAULT 'YUZDE',
    "indirimDegeri" DOUBLE PRECISION NOT NULL,
    "komisyonTipi" "IndirimTipi" NOT NULL DEFAULT 'YUZDE',
    "komisyonDegeri" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platform" "IndirimPlatformu" NOT NULL DEFAULT 'HEPSI',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "baslangic" TIMESTAMP(3),
    "bitis" TIMESTAMP(3),
    "maksKullanim" INTEGER,
    "kullaniciLimiti" INTEGER DEFAULT 1,
    "minTutar" DOUBLE PRECISION,
    "kullanimSayisi" INTEGER NOT NULL DEFAULT 0,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indirim_kodlari_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "indirim_kodlari_kod_key" ON "indirim_kodlari"("kod");
CREATE INDEX IF NOT EXISTS "indirim_kodlari_aktif_kod_idx" ON "indirim_kodlari"("aktif", "kod");
CREATE INDEX IF NOT EXISTS "indirim_kodlari_ogretmenId_idx" ON "indirim_kodlari"("ogretmenId");

CREATE TABLE IF NOT EXISTS "indirim_kodu_kullanimlari" (
    "id" TEXT NOT NULL,
    "kodId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "satinAlimId" TEXT NOT NULL,
    "ogretmenId" TEXT,
    "brutTutar" DOUBLE PRECISION NOT NULL,
    "indirimTutari" DOUBLE PRECISION NOT NULL,
    "netTutar" DOUBLE PRECISION NOT NULL,
    "komisyonTutari" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "komisyonDurumu" "KomisyonDurumu" NOT NULL DEFAULT 'BEKLEMEDE',
    "odemeTarihi" TIMESTAMP(3),
    "odemeNotu" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indirim_kodu_kullanimlari_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "indirim_kodu_kullanimlari_satinAlimId_key" ON "indirim_kodu_kullanimlari"("satinAlimId");
CREATE INDEX IF NOT EXISTS "indirim_kodu_kullanimlari_ogretmenId_komisyonDurumu_idx" ON "indirim_kodu_kullanimlari"("ogretmenId", "komisyonDurumu");
CREATE INDEX IF NOT EXISTS "indirim_kodu_kullanimlari_kodId_idx" ON "indirim_kodu_kullanimlari"("kodId");
CREATE INDEX IF NOT EXISTS "indirim_kodu_kullanimlari_olusturuldu_idx" ON "indirim_kodu_kullanimlari"("olusturuldu" DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'indirim_kodlari_ogretmenId_fkey') THEN
    ALTER TABLE "indirim_kodlari" ADD CONSTRAINT "indirim_kodlari_ogretmenId_fkey"
      FOREIGN KEY ("ogretmenId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'indirim_kodu_kullanimlari_kodId_fkey') THEN
    ALTER TABLE "indirim_kodu_kullanimlari" ADD CONSTRAINT "indirim_kodu_kullanimlari_kodId_fkey"
      FOREIGN KEY ("kodId") REFERENCES "indirim_kodlari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'indirim_kodu_kullanimlari_kullaniciId_fkey') THEN
    ALTER TABLE "indirim_kodu_kullanimlari" ADD CONSTRAINT "indirim_kodu_kullanimlari_kullaniciId_fkey"
      FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'indirim_kodu_kullanimlari_ogretmenId_fkey') THEN
    ALTER TABLE "indirim_kodu_kullanimlari" ADD CONSTRAINT "indirim_kodu_kullanimlari_ogretmenId_fkey"
      FOREIGN KEY ("ogretmenId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'indirim_kodu_kullanimlari_satinAlimId_fkey') THEN
    ALTER TABLE "indirim_kodu_kullanimlari" ADD CONSTRAINT "indirim_kodu_kullanimlari_satinAlimId_fkey"
      FOREIGN KEY ("satinAlimId") REFERENCES "satin_alimlar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
