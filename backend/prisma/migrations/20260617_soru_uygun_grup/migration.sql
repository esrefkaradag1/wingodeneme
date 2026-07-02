-- Soru ↔ grup uygunluk (çoklu hedef grup)
CREATE TABLE IF NOT EXISTS "soru_uygun_gruplar" (
  "soruId" TEXT NOT NULL,
  "grupId" TEXT NOT NULL,
  CONSTRAINT "soru_uygun_gruplar_pkey" PRIMARY KEY ("soruId", "grupId")
);

CREATE INDEX IF NOT EXISTS "soru_uygun_gruplar_grupId_idx" ON "soru_uygun_gruplar"("grupId");

ALTER TABLE "soru_uygun_gruplar"
  ADD CONSTRAINT "soru_uygun_gruplar_soruId_fkey"
  FOREIGN KEY ("soruId") REFERENCES "sorular"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "soru_uygun_gruplar"
  ADD CONSTRAINT "soru_uygun_gruplar_grupId_fkey"
  FOREIGN KEY ("grupId") REFERENCES "gruplar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
