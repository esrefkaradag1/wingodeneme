-- WingoSınav — boş Supabase (PostgreSQL) veritabanı için şema
-- Oluşturma: Prisma şemasından: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- Supabase: SQL Editor → New query → yapıştır → Run (public şeması, boş DB)
-- Mevcut veriyi taşımak için: eski DB'den pg_dump --data-only veya tablo bazlı COPY / INSERT
-- Bağlantı: Project Settings → Database → Connection string (Transaction veya Session pooler)
-- Sonra: DATABASE_URL=postgresql://...@... prisma db push (opsiyonel) veya bu dosya yeterli

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('OGRENCI', 'VELI', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OgretimTuru" AS ENUM ('YKS', 'LGS', 'SINIF_6', 'SINIF_7', 'SINIF_10', 'SINIF_11');

-- CreateEnum
CREATE TYPE "SinavTuru" AS ENUM ('TYT', 'AYT', 'AYT_TYT', 'LGS');

-- CreateEnum
CREATE TYPE "YksKonuSegmenti" AS ENUM ('TYT', 'AYT_MATEMATIK', 'AYT_FEN_BILIMLERI', 'AYT_EDEBIYAT', 'AYT_TARIH1', 'AYT_COG1', 'AYT_TARIH2', 'AYT_COG2', 'AYT_FELSEFE_GRUBU', 'AYT_DIN');

-- CreateEnum
CREATE TYPE "SoruZorlugu" AS ENUM ('KOLAY', 'ORTA', 'ZOR');

-- CreateEnum
CREATE TYPE "SoruOnayDurumu" AS ENUM ('ONAY_BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI');

-- CreateEnum
CREATE TYPE "KatilimDurumu" AS ENUM ('BEKLIYOR', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'IPTAL');

-- CreateEnum
CREATE TYPE "CevapYontemi" AS ENUM ('DIJITAL', 'OPTIK_FORM');

-- CreateEnum
CREATE TYPE "ArkadaslikDurumu" AS ENUM ('BEKLIYOR', 'KABUL_EDILDI', 'REDDEDILDI', 'ENGELLENDI');

-- CreateEnum
CREATE TYPE "DuelloDurumu" AS ENUM ('DAVET_GONDERILDI', 'KABUL_EDILDI', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'IPTAL');

-- CreateEnum
CREATE TYPE "OdemeDurumu" AS ENUM ('BEKLEMEDE', 'TAMAMLANDI', 'IPTAL_EDILDI', 'HATA');

-- CreateTable
CREATE TABLE "kullanicilar" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefon" TEXT,
    "sifre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'OGRENCI',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "emailDogrulandi" BOOLEAN NOT NULL DEFAULT false,
    "dogrulamaKodu" TEXT,
    "refreshToken" TEXT,
    "fcmToken" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kullanicilar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ogrenci_profiller" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "okul" TEXT,
    "sehir" TEXT,
    "ilce" TEXT,
    "sinif" TEXT,
    "ogretimTuru" "OgretimTuru" NOT NULL DEFAULT 'YKS',
    "avatarUrl" TEXT,
    "hedefUniversite" TEXT,
    "hedefBolum" TEXT,
    "puan" INTEGER NOT NULL DEFAULT 0,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,
    "veliId" TEXT,

    CONSTRAINT "ogrenci_profiller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veli_profiller" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "telefon" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veli_profiller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_profiller" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "yetkiSeviye" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "admin_profiller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gruplar" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tur" "OgretimTuru" NOT NULL,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gruplar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grup_uyelikler" (
    "id" TEXT NOT NULL,
    "grupId" TEXT NOT NULL,
    "ogrenciId" TEXT NOT NULL,
    "katilimTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grup_uyelikler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sinavlar" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "tur" "SinavTuru" NOT NULL,
    "grupId" TEXT NOT NULL,
    "baslangicZamani" TIMESTAMP(3) NOT NULL,
    "bitisZamani" TIMESTAMP(3) NOT NULL,
    "sureDakika" INTEGER NOT NULL DEFAULT 120,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "yayinlandi" BOOLEAN NOT NULL DEFAULT false,
    "kitapcikUrl" TEXT,
    "kitapcikBolumAdi" TEXT,
    "kitapcikTarihMetni" TEXT,
    "konuDagilimi" JSONB,
    "cevapAnahtari" JSONB,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sinavlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "konular" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "ders" TEXT NOT NULL,
    "sinifSeviyesi" TEXT,
    "ogretimTuru" "OgretimTuru" NOT NULL,
    "uniteAdi" TEXT,
    "yksSegment" "YksKonuSegmenti",
    "kazanimlar" TEXT[],
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "konular_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "konular_ogretimTuru_yksSegment_idx" ON "konular"("ogretimTuru", "yksSegment");
CREATE INDEX "konular_ders_uniteAdi_idx" ON "konular"("ders", "uniteAdi");

-- CreateTable
CREATE TABLE "sorular" (
    "id" TEXT NOT NULL,
    "sinavId" TEXT,
    "konuId" TEXT NOT NULL,
    "siraNo" INTEGER NOT NULL,
    "metinHtml" TEXT NOT NULL,
    "gorselUrl" TEXT,
    "secenekler" JSONB NOT NULL,
    "dogruCevap" TEXT NOT NULL,
    "zorluk" "SoruZorlugu" NOT NULL DEFAULT 'ORTA',
    "kazanim" TEXT,
    "aiUretildi" BOOLEAN NOT NULL DEFAULT false,
    "aiModeli" TEXT,
    "onayDurumu" "SoruOnayDurumu" NOT NULL DEFAULT 'ONAYLANDI',
    "aiMeta" JSONB,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sorular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sinav_katilimlar" (
    "id" TEXT NOT NULL,
    "sinavId" TEXT NOT NULL,
    "ogrenciId" TEXT NOT NULL,
    "durum" "KatilimDurumu" NOT NULL DEFAULT 'BEKLIYOR',
    "cevapYontemi" "CevapYontemi" NOT NULL DEFAULT 'DIJITAL',
    "baslangicZamani" TIMESTAMP(3),
    "bitisZamani" TIMESTAMP(3),
    "dogruSayisi" INTEGER NOT NULL DEFAULT 0,
    "yanlisSayisi" INTEGER NOT NULL DEFAULT 0,
    "bosSayisi" INTEGER NOT NULL DEFAULT 0,
    "netPuan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hamPuan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ulusalSiralama" INTEGER,
    "yuzdelik" DOUBLE PRECISION,
    "optikFormUrl" TEXT,
    "optikOkundu" BOOLEAN NOT NULL DEFAULT false,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sinav_katilimlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ogrenci_cevaplar" (
    "id" TEXT NOT NULL,
    "katilimId" TEXT NOT NULL,
    "soruId" TEXT NOT NULL,
    "secilen" TEXT,
    "dogru" BOOLEAN,
    "sureMs" INTEGER,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ogrenci_cevaplar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "konu_performanslari" (
    "id" TEXT NOT NULL,
    "ogrenciId" TEXT NOT NULL,
    "konuId" TEXT NOT NULL,
    "toplamSoru" INTEGER NOT NULL DEFAULT 0,
    "dogruSayisi" INTEGER NOT NULL DEFAULT 0,
    "yanlisSayisi" INTEGER NOT NULL DEFAULT 0,
    "basariYuzdesi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sonGuncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "konu_performanslari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analizler" (
    "id" TEXT NOT NULL,
    "ogrenciId" TEXT NOT NULL,
    "sinavId" TEXT,
    "analizTipi" TEXT NOT NULL,
    "icerik" JSONB NOT NULL,
    "oneriler" JSONB,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analizler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_planlar" (
    "id" TEXT NOT NULL,
    "ogrenciId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "hedefler" JSONB NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "aiUretildi" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_planlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_gorevler" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "ders" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "sureDakika" INTEGER NOT NULL,
    "tamamlandi" BOOLEAN NOT NULL DEFAULT false,
    "gun" INTEGER NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_gorevler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arkadasliklar" (
    "id" TEXT NOT NULL,
    "ogrenciId" TEXT NOT NULL,
    "arkadasId" TEXT NOT NULL,
    "durum" "ArkadaslikDurumu" NOT NULL DEFAULT 'BEKLIYOR',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arkadasliklar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duellolar" (
    "id" TEXT NOT NULL,
    "davetedenId" TEXT NOT NULL,
    "davetEdilenId" TEXT NOT NULL,
    "konuId" TEXT,
    "soruSayisi" INTEGER NOT NULL DEFAULT 10,
    "sureDakika" INTEGER NOT NULL DEFAULT 15,
    "durum" "DuelloDurumu" NOT NULL DEFAULT 'DAVET_GONDERILDI',
    "davetciPuan" DOUBLE PRECISION,
    "davetEdilenPuan" DOUBLE PRECISION,
    "kazanan" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tamamlandi" TIMESTAMP(3),

    CONSTRAINT "duellolar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sosyal_davetler" (
    "id" TEXT NOT NULL,
    "gondericId" TEXT NOT NULL,
    "aliciId" TEXT,
    "aliciEmail" TEXT,
    "davetKodu" TEXT NOT NULL,
    "kabul" BOOLEAN NOT NULL DEFAULT false,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sosyal_davetler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universiteler" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kisaAd" TEXT,
    "sehir" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "logo" TEXT,

    CONSTRAINT "universiteler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universite_bolumler" (
    "id" TEXT NOT NULL,
    "universiteId" TEXT NOT NULL,
    "bolumAdi" TEXT NOT NULL,
    "sinavTuru" "SinavTuru" NOT NULL,
    "yil" INTEGER NOT NULL,
    "minPuan" DOUBLE PRECISION,
    "maxPuan" DOUBLE PRECISION,
    "minSiralama" INTEGER,
    "maxSiralama" INTEGER,
    "kontenjan" INTEGER,
    "dolulukOrani" DOUBLE PRECISION,

    CONSTRAINT "universite_bolumler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universite_hedefler" (
    "id" TEXT NOT NULL,
    "ogrenciId" TEXT NOT NULL,
    "bolumId" TEXT NOT NULL,
    "oncelik" INTEGER NOT NULL DEFAULT 1,
    "tahminPuan" DOUBLE PRECISION,
    "tahminSiralama" INTEGER,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "universite_hedefler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takvim_etkinlikler" (
    "id" TEXT NOT NULL,
    "grupId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL,
    "renk" TEXT NOT NULL DEFAULT '#4F46E5',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "takvim_etkinlikler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bildirimler" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "okundu" BOOLEAN NOT NULL DEFAULT false,
    "veriJson" JSONB,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bildirimler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ogretmenler" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "ders" TEXT NOT NULL,
    "konular" TEXT[],
    "biyografi" TEXT,
    "fotoUrl" TEXT,
    "fiyatSaat" DOUBLE PRECISION,
    "puan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ogretmenler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kurslar" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "ders" TEXT NOT NULL,
    "konular" TEXT[],
    "fiyat" DOUBLE PRECISION,
    "url" TEXT,
    "platform" TEXT,
    "puan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kurslar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oneriler" (
    "id" TEXT NOT NULL,
    "ogrenciId" TEXT NOT NULL,
    "ogretmenId" TEXT,
    "kursId" TEXT,
    "neden" TEXT NOT NULL,
    "oncelik" INTEGER NOT NULL DEFAULT 1,
    "tiklandimi" BOOLEAN NOT NULL DEFAULT false,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oneriler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paketler" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "fiyat" DOUBLE PRECISION NOT NULL,
    "indirimliFiyat" DOUBLE PRECISION,
    "sinavSayisi" INTEGER NOT NULL DEFAULT 0,
    "ozellikler" JSONB,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "populer" BOOLEAN NOT NULL DEFAULT false,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paketler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satin_alimlar" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "paketId" TEXT NOT NULL,
    "miktar" DOUBLE PRECISION NOT NULL,
    "durum" "OdemeDurumu" NOT NULL DEFAULT 'BEKLEMEDE',
    "referansNo" TEXT,
    "notlar" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "satin_alimlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_genel_icerik" (
    "id" TEXT NOT NULL,
    "icerik" JSONB NOT NULL DEFAULT '{}',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_genel_icerik_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kullanicilar_email_key" ON "kullanicilar"("email");

-- CreateIndex
CREATE UNIQUE INDEX "kullanicilar_telefon_key" ON "kullanicilar"("telefon");

-- CreateIndex
CREATE UNIQUE INDEX "ogrenci_profiller_kullaniciId_key" ON "ogrenci_profiller"("kullaniciId");

-- CreateIndex
CREATE UNIQUE INDEX "veli_profiller_kullaniciId_key" ON "veli_profiller"("kullaniciId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiller_kullaniciId_key" ON "admin_profiller"("kullaniciId");

-- CreateIndex
CREATE UNIQUE INDEX "grup_uyelikler_grupId_ogrenciId_key" ON "grup_uyelikler"("grupId", "ogrenciId");

-- CreateIndex
CREATE UNIQUE INDEX "sinav_katilimlar_sinavId_ogrenciId_key" ON "sinav_katilimlar"("sinavId", "ogrenciId");

-- CreateIndex
CREATE UNIQUE INDEX "ogrenci_cevaplar_katilimId_soruId_key" ON "ogrenci_cevaplar"("katilimId", "soruId");

-- CreateIndex
CREATE UNIQUE INDEX "konu_performanslari_ogrenciId_konuId_key" ON "konu_performanslari"("ogrenciId", "konuId");

-- CreateIndex
CREATE UNIQUE INDEX "arkadasliklar_ogrenciId_arkadasId_key" ON "arkadasliklar"("ogrenciId", "arkadasId");

-- CreateIndex
CREATE UNIQUE INDEX "sosyal_davetler_davetKodu_key" ON "sosyal_davetler"("davetKodu");

-- CreateIndex
CREATE UNIQUE INDEX "satin_alimlar_referansNo_key" ON "satin_alimlar"("referansNo");

-- AddForeignKey
ALTER TABLE "ogrenci_profiller" ADD CONSTRAINT "ogrenci_profiller_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_profiller" ADD CONSTRAINT "ogrenci_profiller_veliId_fkey" FOREIGN KEY ("veliId") REFERENCES "veli_profiller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veli_profiller" ADD CONSTRAINT "veli_profiller_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_profiller" ADD CONSTRAINT "admin_profiller_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grup_uyelikler" ADD CONSTRAINT "grup_uyelikler_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "gruplar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grup_uyelikler" ADD CONSTRAINT "grup_uyelikler_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES "ogrenci_profiller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sinavlar" ADD CONSTRAINT "sinavlar_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "gruplar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorular" ADD CONSTRAINT "sorular_sinavId_fkey" FOREIGN KEY ("sinavId") REFERENCES "sinavlar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorular" ADD CONSTRAINT "sorular_konuId_fkey" FOREIGN KEY ("konuId") REFERENCES "konular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sinav_katilimlar" ADD CONSTRAINT "sinav_katilimlar_sinavId_fkey" FOREIGN KEY ("sinavId") REFERENCES "sinavlar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sinav_katilimlar" ADD CONSTRAINT "sinav_katilimlar_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES "ogrenci_profiller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_cevaplar" ADD CONSTRAINT "ogrenci_cevaplar_katilimId_fkey" FOREIGN KEY ("katilimId") REFERENCES "sinav_katilimlar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogrenci_cevaplar" ADD CONSTRAINT "ogrenci_cevaplar_soruId_fkey" FOREIGN KEY ("soruId") REFERENCES "sorular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konu_performanslari" ADD CONSTRAINT "konu_performanslari_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES "ogrenci_profiller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konu_performanslari" ADD CONSTRAINT "konu_performanslari_konuId_fkey" FOREIGN KEY ("konuId") REFERENCES "konular"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_planlar" ADD CONSTRAINT "study_planlar_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES "ogrenci_profiller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_gorevler" ADD CONSTRAINT "study_gorevler_planId_fkey" FOREIGN KEY ("planId") REFERENCES "study_planlar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arkadasliklar" ADD CONSTRAINT "arkadasliklar_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES "ogrenci_profiller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duellolar" ADD CONSTRAINT "duellolar_davetedenId_fkey" FOREIGN KEY ("davetedenId") REFERENCES "ogrenci_profiller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sosyal_davetler" ADD CONSTRAINT "sosyal_davetler_gondericId_fkey" FOREIGN KEY ("gondericId") REFERENCES "kullanicilar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sosyal_davetler" ADD CONSTRAINT "sosyal_davetler_aliciId_fkey" FOREIGN KEY ("aliciId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universite_bolumler" ADD CONSTRAINT "universite_bolumler_universiteId_fkey" FOREIGN KEY ("universiteId") REFERENCES "universiteler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universite_hedefler" ADD CONSTRAINT "universite_hedefler_ogrenciId_fkey" FOREIGN KEY ("ogrenciId") REFERENCES "ogrenci_profiller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universite_hedefler" ADD CONSTRAINT "universite_hedefler_bolumId_fkey" FOREIGN KEY ("bolumId") REFERENCES "universite_bolumler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takvim_etkinlikler" ADD CONSTRAINT "takvim_etkinlikler_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "gruplar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bildirimler" ADD CONSTRAINT "bildirimler_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oneriler" ADD CONSTRAINT "oneriler_ogretmenId_fkey" FOREIGN KEY ("ogretmenId") REFERENCES "ogretmenler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oneriler" ADD CONSTRAINT "oneriler_kursId_fkey" FOREIGN KEY ("kursId") REFERENCES "kurslar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satin_alimlar" ADD CONSTRAINT "satin_alimlar_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satin_alimlar" ADD CONSTRAINT "satin_alimlar_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "paketler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

