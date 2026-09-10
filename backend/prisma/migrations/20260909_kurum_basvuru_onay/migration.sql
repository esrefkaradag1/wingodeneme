-- Kurumsal hesap başvuru / onay akışı (süper admin onayı ile panel erişimi)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KurumBasvuruDurum') THEN
    CREATE TYPE "KurumBasvuruDurum" AS ENUM ('BEKLEMEDE', 'AKTIF', 'REDDEDILDI', 'PASIF');
  END IF;
END
$$;

ALTER TABLE "koc_profiller" ADD COLUMN IF NOT EXISTS "basvuruDurum" "KurumBasvuruDurum" NOT NULL DEFAULT 'AKTIF';
ALTER TABLE "koc_profiller" ADD COLUMN IF NOT EXISTS "kararTarihi" TIMESTAMP(3);
ALTER TABLE "koc_profiller" ADD COLUMN IF NOT EXISTS "demoBitis" TIMESTAMP(3);
ALTER TABLE "koc_profiller" ADD COLUMN IF NOT EXISTS "kararNotu" TEXT;
ALTER TABLE "koc_profiller" ADD COLUMN IF NOT EXISTS "sehir" TEXT;
ALTER TABLE "koc_profiller" ADD COLUMN IF NOT EXISTS "beklenenOgrenci" INTEGER;
ALTER TABLE "koc_profiller" ADD COLUMN IF NOT EXISTS "basvuruNotu" TEXT;

CREATE INDEX IF NOT EXISTS "koc_profiller_basvuruDurum_idx" ON "koc_profiller"("basvuruDurum");
