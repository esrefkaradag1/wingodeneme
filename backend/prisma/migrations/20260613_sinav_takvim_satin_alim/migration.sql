-- Sınav takvimi + tek sınav satın alma
ALTER TABLE "sinavlar" ADD COLUMN IF NOT EXISTS "ucret" DOUBLE PRECISION;
ALTER TABLE "sinavlar" ADD COLUMN IF NOT EXISTS "indirimliUcret" DOUBLE PRECISION;
ALTER TABLE "sinavlar" ADD COLUMN IF NOT EXISTS "takvimdeGoster" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sinavlar" ADD COLUMN IF NOT EXISTS "satinAlinabilir" BOOLEAN NOT NULL DEFAULT false;

ALTER TYPE "SinavAtamaKaynak" ADD VALUE IF NOT EXISTS 'TEK_SINAV';

ALTER TABLE "satin_alimlar" ALTER COLUMN "paketId" DROP NOT NULL;
ALTER TABLE "satin_alimlar" ADD COLUMN IF NOT EXISTS "sinavId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'satin_alimlar_sinavId_fkey'
  ) THEN
    ALTER TABLE "satin_alimlar"
      ADD CONSTRAINT "satin_alimlar_sinavId_fkey"
      FOREIGN KEY ("sinavId") REFERENCES "sinavlar"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "satin_alimlar_sinavId_durum_idx" ON "satin_alimlar"("sinavId", "durum");
