CREATE TABLE IF NOT EXISTS "soru_konu_etiketleri" (
  "soruId" TEXT NOT NULL,
  "konuId" TEXT NOT NULL,
  CONSTRAINT "soru_konu_etiketleri_pkey" PRIMARY KEY ("soruId", "konuId")
);

DO $$ BEGIN
  ALTER TABLE "soru_konu_etiketleri" ADD CONSTRAINT "soru_konu_etiketleri_soruId_fkey"
    FOREIGN KEY ("soruId") REFERENCES "sorular"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "soru_konu_etiketleri" ADD CONSTRAINT "soru_konu_etiketleri_konuId_fkey"
    FOREIGN KEY ("konuId") REFERENCES "konular"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "soru_konu_etiketleri_konuId_idx" ON "soru_konu_etiketleri"("konuId");
