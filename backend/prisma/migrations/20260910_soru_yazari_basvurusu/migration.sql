-- «Bizimle çalışmak ister misiniz» — soru yazarı başvuruları
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SoruYazariBasvuruDurum') THEN
    CREATE TYPE "SoruYazariBasvuruDurum" AS ENUM ('YENI', 'INCELENIYOR', 'GORUSULDU', 'KABUL', 'RED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "soru_yazari_basvurulari" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "dogumTarihi" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "universite" TEXT NOT NULL,
    "fakulte" TEXT,
    "bolum" TEXT,
    "mezuniyetYili" INTEGER,
    "deneyimYili" INTEGER,
    "branslar" JSONB NOT NULL,
    "soruBasinaUcret" DOUBLE PRECISION NOT NULL,
    "aylikSoruKapasitesi" INTEGER,
    "ornekCalismaUrl" TEXT,
    "aciklama" TEXT,
    "durum" "SoruYazariBasvuruDurum" NOT NULL DEFAULT 'YENI',
    "adminNotu" TEXT,
    "kararTarihi" TIMESTAMP(3),
    "ipAdresi" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soru_yazari_basvurulari_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "soru_yazari_basvurulari_durum_olusturuldu_idx" ON "soru_yazari_basvurulari"("durum", "olusturuldu" DESC);
CREATE INDEX IF NOT EXISTS "soru_yazari_basvurulari_email_idx" ON "soru_yazari_basvurulari"("email");
