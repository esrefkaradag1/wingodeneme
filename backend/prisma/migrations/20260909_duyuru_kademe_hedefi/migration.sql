-- Duyuruların kademeye (YKS / LGS / KPSS) göre hedeflenmesi
ALTER TABLE "duyurular"
  ADD COLUMN IF NOT EXISTS "hedefOgretimTurleri" "OgretimTuru"[] DEFAULT ARRAY[]::"OgretimTuru"[];
