-- Öğretmen / admin panelden soru metninin veya kazanımın el ile değiştirildiğini işaretler.
-- Eski veritabanlarında sütun yoksa uygulayın (Supabase SQL Editor veya psql).

ALTER TABLE "sorular" ADD COLUMN IF NOT EXISTS "ogretmenGuncelledi" BOOLEAN NOT NULL DEFAULT false;
