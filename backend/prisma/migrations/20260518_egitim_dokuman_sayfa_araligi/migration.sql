-- PDF sayfa aralığı (eğitim materyali)
ALTER TABLE "egitim_dokumanlar"
  ADD COLUMN IF NOT EXISTS "sayfaBaslangic" INTEGER,
  ADD COLUMN IF NOT EXISTS "sayfaBitis" INTEGER;
