-- 1. RLS'yi geçici olarak devre dışı bırak (Verilerin gelmesi için en hızlı yol)
ALTER TABLE public.kullanicilar DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ogrenci_profiller DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.veli_profiller DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiller DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinavlar DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorular DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.konular DISABLE ROW LEVEL SECURITY;

-- 2. Eğer sütun hatası varsa (ad/soyad kullanicilar tablosunda yoksa) boş sütun ekle 
-- (Frontend hata almasın diye)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kullanicilar' AND column_name='ad') THEN
        ALTER TABLE public.kullanicilar ADD COLUMN ad TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kullanicilar' AND column_name='soyad') THEN
        ALTER TABLE public.kullanicilar ADD COLUMN soyad TEXT;
    END IF;
END $$;
