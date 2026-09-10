-- Sınıf bazlı deneme dağıtımı (6-7-8 ve 9-10-11-12)
ALTER TABLE "gruplar" ADD COLUMN IF NOT EXISTS "sinifSeviyesi" INTEGER;
CREATE INDEX IF NOT EXISTS "gruplar_tur_sinifSeviyesi_idx" ON "gruplar"("tur", "sinifSeviyesi");
