-- CreateEnum
CREATE TYPE "IletisimFormuDurum" AS ENUM ('YENI', 'OKUNDU', 'YANITLANDI', 'KAPANDI');

-- CreateTable
CREATE TABLE "iletisim_formlari" (
    "id" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "durum" "IletisimFormuDurum" NOT NULL DEFAULT 'YENI',
    "adminNotu" TEXT,
    "kullaniciId" TEXT,
    "ipAdresi" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iletisim_formlari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "iletisim_formlari_durum_olusturuldu_idx" ON "iletisim_formlari"("durum", "olusturuldu");

-- CreateIndex
CREATE INDEX "iletisim_formlari_eposta_idx" ON "iletisim_formlari"("eposta");

-- AddForeignKey
ALTER TABLE "iletisim_formlari" ADD CONSTRAINT "iletisim_formlari_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
