-- AYT Sosyal Bilimler-2: Felsefe, Psikoloji, Sosyoloji, Mantık konuları (şablon 12 soru-slotu).
-- Prisma seed ile aynı id’ler (konuIdStable) — Supabase SQL Editor’de bir kez çalıştırın.
--
-- Önce enum’da etiket yoksa ekleyin (zaten ekliyse “already exists” benzeri hata görülebilir, yoksayın):
ALTER TYPE "YksKonuSegmenti" ADD VALUE IF NOT EXISTS 'AYT_FELSEFE_GRUBU';

-- Not: Postgres 14 ve öncesi IF NOT EXISTS desteklemiyorsa şu iki satırı elle deneyin, hata olursa atlayın:
-- ALTER TYPE "YksKonuSegmenti" ADD VALUE 'AYT_FELSEFE_GRUBU';

INSERT INTO public.konular (id, ad, ders, "sinifSeviyesi", "ogretimTuru", "uniteAdi", "yksSegment", kazanimlar)
VALUES
  ('k_9a053db2de5bf751ab46f43626', 'Bilgi Üzerine Yaklaşımlar', 'Felsefe', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_5115be61673dbf13df56944db2', 'Bilimin Doğası ve Yöntemi', 'Felsefe', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_e317052cedce5aef756903349f', 'Klasik Ahlak Yaklaşımları', 'Felsefe', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_870ba5958ea7b2ac3364e6f9df', 'Psikolojinin Temelleri ve Biyopsikososyal Aktarım Modeli', 'Psikoloji', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_9bc5e1d636d67cacaa16c2d4b9', 'Öğrenme Kuramları ile İlgili Kısa Kavram Çerçevesi', 'Psikoloji', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_69b1ffa7238d22e4af066405b4', 'Duygu ve Dinamik Süreçlere Yaklaşım', 'Psikoloji', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_ae5de6fd36d9581be533a6b12d', 'Toplumu Anlamak İçin Temel Kavramlar', 'Sosyoloji', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_0c81cf421fa8730d78169b002c', 'Toplumsal Tabakalaşma', 'Sosyoloji', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_d9bb0f7233d9b5665e94c5264e', 'Toplumsal Kurumlara Yaklaşım', 'Sosyoloji', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_443bcd4e893a9f00b678f9115e', 'Yargılar', 'Mantık', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_a3fc8a64b406135baeea0f0c3a', 'Klasik Çıkarım Kavramları', 'Mantık', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[]),
  ('k_79b351459ce2ca846de43ac4a8', 'Temel Kavramlar', 'Mantık', NULL, 'YKS'::"OgretimTuru", 'AYT Felsefe Grubu', 'AYT_FELSEFE_GRUBU'::"YksKonuSegmenti", ARRAY[]::TEXT[])
ON CONFLICT (id) DO UPDATE SET
  ad = EXCLUDED.ad,
  ders = EXCLUDED.ders,
  "sinifSeviyesi" = EXCLUDED."sinifSeviyesi",
  "ogretimTuru" = EXCLUDED."ogretimTuru",
  "uniteAdi" = EXCLUDED."uniteAdi",
  "yksSegment" = EXCLUDED."yksSegment",
  kazanimlar = EXCLUDED.kazanimlar;
