-- Paket kategorileri tablosu + enum -> text dönüşümü (veri korunur)

CREATE TABLE IF NOT EXISTS "paket_kategorileri" (
  "id" TEXT NOT NULL,
  "ad" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sira" INTEGER NOT NULL DEFAULT 0,
  "aktif" BOOLEAN NOT NULL DEFAULT true,
  "renk" TEXT,
  "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "paket_kategorileri_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "paket_kategorileri_slug_key" ON "paket_kategorileri"("slug");

INSERT INTO "paket_kategorileri" ("id", "ad", "slug", "sira", "renk", "aktif")
VALUES
  ('pk_cat_tyt', 'TYT', 'TYT', 1, 'bg-sky-100 text-sky-800 border-sky-200', true),
  ('pk_cat_ayt', 'AYT', 'AYT', 2, 'bg-indigo-100 text-indigo-800 border-indigo-200', true),
  ('pk_cat_yks', 'YKS', 'YKS', 3, 'bg-violet-100 text-violet-800 border-violet-200', true),
  ('pk_cat_lgs', 'LGS', 'LGS', 4, 'bg-emerald-100 text-emerald-800 border-emerald-200', true),
  ('pk_cat_kpss', 'KPSS', 'KPSS', 5, 'bg-amber-100 text-amber-800 border-amber-200', true),
  ('pk_cat_genel', 'Genel', 'GENEL', 99, 'bg-gray-100 text-gray-700 border-gray-200', true)
ON CONFLICT ("slug") DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paketler' AND column_name = 'kategori'
      AND udt_name = 'PaketKategori'
  ) THEN
    ALTER TABLE "paketler" ALTER COLUMN "kategori" DROP DEFAULT;
    ALTER TABLE "paketler" ALTER COLUMN "kategori" TYPE TEXT USING "kategori"::TEXT;
    ALTER TABLE "paketler" ALTER COLUMN "kategori" SET DEFAULT 'GENEL';
  END IF;
END $$;

DROP TYPE IF EXISTS "PaketKategori";

CREATE INDEX IF NOT EXISTS "paketler_aktif_kategori_idx" ON "paketler"("aktif", "kategori");
