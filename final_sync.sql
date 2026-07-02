-- 1. Şifreleri (hash) eski kullanicilar tablosundan Auth sistemine geri yükle
UPDATE auth.users u
SET encrypted_password = k.sifre
FROM public.kullanicilar k
WHERE u.email = k.email;

-- 2. İlişkileri korumak için ID'leri eşitle (Email üzerinden)
SET session_replication_role = 'replica';

-- Öğrenci, Veli ve Admin profillerini yeni UUID'lerle güncelle
UPDATE public.ogrenci_profiller p SET "kullaniciId" = u.id::text FROM auth.users u, public.kullanicilar k WHERE p."kullaniciId" = k.id AND k.email = u.email;
UPDATE public.veli_profiller p SET "kullaniciId" = u.id::text FROM auth.users u, public.kullanicilar k WHERE p."kullaniciId" = k.id AND k.email = u.email;
UPDATE public.admin_profiller p SET "kullaniciId" = u.id::text FROM auth.users u, public.kullanicilar k WHERE p."kullaniciId" = k.id AND k.email = u.email;

-- Ana kullanicilar tablosundaki ID'yi UUID ile değiştir
UPDATE public.kullanicilar k SET id = u.id::text FROM auth.users u WHERE k.email = u.email;

SET session_replication_role = 'origin';
