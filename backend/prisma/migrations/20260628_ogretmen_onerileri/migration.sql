-- CreateEnum
CREATE TYPE "OgretmenOnerisiDurum" AS ENUM ('YENI', 'OKUNDU', 'INCELENIYOR', 'TAMAMLANDI', 'KAPANDI');

-- CreateTable
CREATE TABLE "ogretmen_onerileri" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "baslik" TEXT,
    "mesaj" TEXT NOT NULL,
    "sayfaYolu" TEXT,
    "gorseller" JSONB NOT NULL DEFAULT '[]',
    "durum" "OgretmenOnerisiDurum" NOT NULL DEFAULT 'YENI',
    "adminNotu" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ogretmen_onerileri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ogretmen_onerileri_durum_olusturuldu_idx" ON "ogretmen_onerileri"("durum", "olusturuldu" DESC);

-- CreateIndex
CREATE INDEX "ogretmen_onerileri_kullaniciId_olusturuldu_idx" ON "ogretmen_onerileri"("kullaniciId", "olusturuldu" DESC);

-- AddForeignKey
ALTER TABLE "ogretmen_onerileri" ADD CONSTRAINT "ogretmen_onerileri_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
