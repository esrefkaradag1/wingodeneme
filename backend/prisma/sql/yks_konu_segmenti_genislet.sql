-- Mevcut PostgreSQL / Supabase veritabanında YksKonuSegmenti enum'una AYT alt bölümleri ekler.
-- Konu INSERT/seed bu etiketleri kullanıyorsa gereklidir. GET /konular için sorguda TYT hariç filtre kullanılır (IN listesi yok).
-- SQL Editor'de bir kez çalıştırın. "already exists" hatası alırsanız ilgili satır zaten ekli demektir.

ALTER TYPE "YksKonuSegmenti" ADD VALUE 'AYT_TARIH1';
ALTER TYPE "YksKonuSegmenti" ADD VALUE 'AYT_COG1';
ALTER TYPE "YksKonuSegmenti" ADD VALUE 'AYT_FELSEFE_GRUBU';
ALTER TYPE "YksKonuSegmenti" ADD VALUE 'AYT_DIN';
