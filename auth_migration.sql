-- 1. UUID kütüphanesini aktif et
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Mevcut kullanicilar tablosuna gecici bir uuid kolonu ekle
ALTER TABLE public.kullanicilar ADD COLUMN IF NOT EXISTS temp_uuid UUID DEFAULT uuid_generate_v4();

-- 3. Auth şemasına kullanıcıları aktar (Şifre hash'leri dahil)
-- ON CONFLICT kısmını ID üzerinden yapıyoruz
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token
)
SELECT 
  temp_uuid,
  '00000000-0000-0000-0000-000000000000',
  email,
  sifre,
  NOW(),
  olusturuldu,
  guncellendi,
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('rol', rol),
  CASE WHEN rol = 'SUPER_ADMIN' THEN true ELSE false END,
  'authenticated',
  'authenticated',
  ''
FROM public.kullanicilar
ON CONFLICT (id) DO NOTHING;

-- 4. Auth.identities tablosuna kayıt at (Giriş yapabilmek için şart)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    provider_id
)
SELECT 
    uuid_generate_v4(),
    temp_uuid,
    jsonb_build_object('sub', temp_uuid, 'email', email),
    'email',
    NOW(),
    NOW(),
    NOW(),
    temp_uuid::text
FROM public.kullanicilar
ON CONFLICT DO NOTHING;

-- 5. Public tablodaki ID'leri yeni UUID'lerle güncelle
SET session_replication_role = 'replica';

UPDATE public.ogrenci_profiller p SET "kullaniciId" = k.temp_uuid::text FROM public.kullanicilar k WHERE p."kullaniciId" = k.id;
UPDATE public.veli_profiller p SET "kullaniciId" = k.temp_uuid::text FROM public.kullanicilar k WHERE p."kullaniciId" = k.id;
UPDATE public.admin_profiller p SET "kullaniciId" = k.temp_uuid::text FROM public.kullanicilar k WHERE p."kullaniciId" = k.id;
UPDATE public.kullanicilar SET id = temp_uuid::text;

SET session_replication_role = 'origin';

-- 6. Temizlik
ALTER TABLE public.kullanicilar DROP COLUMN temp_uuid;
