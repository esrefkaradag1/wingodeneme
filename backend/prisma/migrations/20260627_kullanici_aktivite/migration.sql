-- CreateEnum
CREATE TYPE "KullaniciAktiviteTuru" AS ENUM ('GIRIS', 'CIKIS', 'SORU_OLUSTUR', 'SORU_GUNCELLE', 'SORU_SIL', 'AI_SORU_URET', 'PANEL_ERISIM');

-- CreateTable
CREATE TABLE "kullanici_oturumlari" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitis" TIMESTAMP(3),
    "sonAktivite" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sureSaniye" INTEGER,
    "ipAdresi" TEXT,
    "userAgent" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kullanici_oturumlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kullanici_aktiviteleri" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "oturumId" TEXT,
    "tur" "KullaniciAktiviteTuru" NOT NULL,
    "aciklama" TEXT,
    "meta" JSONB,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kullanici_aktiviteleri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kullanici_oturumlari_kullaniciId_baslangic_idx" ON "kullanici_oturumlari"("kullaniciId", "baslangic" DESC);

-- CreateIndex
CREATE INDEX "kullanici_oturumlari_bitis_idx" ON "kullanici_oturumlari"("bitis");

-- CreateIndex
CREATE INDEX "kullanici_aktiviteleri_kullaniciId_olusturuldu_idx" ON "kullanici_aktiviteleri"("kullaniciId", "olusturuldu" DESC);

-- CreateIndex
CREATE INDEX "kullanici_aktiviteleri_tur_olusturuldu_idx" ON "kullanici_aktiviteleri"("tur", "olusturuldu" DESC);

-- CreateIndex
CREATE INDEX "kullanici_aktiviteleri_oturumId_idx" ON "kullanici_aktiviteleri"("oturumId");

-- AddForeignKey
ALTER TABLE "kullanici_oturumlari" ADD CONSTRAINT "kullanici_oturumlari_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici_aktiviteleri" ADD CONSTRAINT "kullanici_aktiviteleri_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici_aktiviteleri" ADD CONSTRAINT "kullanici_aktiviteleri_oturumId_fkey" FOREIGN KEY ("oturumId") REFERENCES "kullanici_oturumlari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
