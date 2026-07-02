-- Soru düzenleyen / oluşturan öğretmen takibi
ALTER TABLE "sorular" ADD COLUMN IF NOT EXISTS "olusturanId" TEXT;
ALTER TABLE "sorular" ADD COLUMN IF NOT EXISTS "duzenleyenId" TEXT;

DO $$ BEGIN
  ALTER TABLE "sorular" ADD CONSTRAINT "sorular_olusturanId_fkey"
    FOREIGN KEY ("olusturanId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "sorular" ADD CONSTRAINT "sorular_duzenleyenId_fkey"
    FOREIGN KEY ("duzenleyenId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "sorular_duzenleyenId_idx" ON "sorular"("duzenleyenId");
CREATE INDEX IF NOT EXISTS "sorular_olusturanId_idx" ON "sorular"("olusturanId");
