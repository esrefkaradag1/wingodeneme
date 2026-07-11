ALTER TABLE "paketler"
  ADD COLUMN "kademeliFiyatAktif" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tekilSinavFiyati" DOUBLE PRECISION,
  ADD COLUMN "fiyatKademeleriJson" JSONB;

DELETE FROM "ogrenci_sinav_atamalari"
WHERE "kaynak" = 'PAKET'
  AND "satinAlimId" IS NULL;
