-- 1. UUID kütüphanesini aktif et
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Mevcut kullanicilar tablosuna gecici bir uuid kolonu ekle
ALTER TABLE public.kullanicilar ADD COLUMN IF NOT EXISTS temp_uuid UUID DEFAULT uuid_generate_v4();

-- 3. Önce auth.users tablosundaki eski denemeleri temizle (Çakışma olmasın)
DELETE FROM auth.users WHERE email IN (SELECT email FROM public.kullanicilar);

-- 4. Auth şemasına kullanıcıları aktar
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
  confirmation_token,
  recovery_token,
  email_change_token_new,
  is_sso_user
)
SELECT 
  temp_uuid,
  '00000000-0000-0000-0000-000000000000',
  email,
  sifre, -- Bcrypt hash
  NOW(),
  olusturuldu,
  guncellendi,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('rol', rol),
  CASE WHEN rol = 'SUPER_ADMIN' THEN true ELSE false END,
  'authenticated',
  'authenticated',
  NULL,
  NULL,
  NULL,
  false
FROM public.kullanicilar;

-- 5. Auth.identities tablosuna kayıt at
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
    email -- Provider ID olarak email kullanmak daha güvenli
FROM public.kullanicilar;

-- 6. İlişkileri güncelle
SET session_replication_role = 'replica';

UPDATE public.ogrenci_profiller p SET "kullaniciId" = k.temp_uuid::text FROM public.kullanicilar k WHERE p."kullaniciId" = k.id;
UPDATE public.veli_profiller p SET "kullaniciId" = k.temp_uuid::text FROM public.kullanicilar k WHERE p."kullaniciId" = k.id;
UPDATE public.admin_profiller p SET "kullaniciId" = k.temp_uuid::text FROM public.kullanicilar k WHERE p."kullaniciId" = k.id;
UPDATE public.kullanicilar SET id = temp_uuid::text;

SET session_replication_role = 'origin';

-- 7. Temizlik
ALTER TABLE public.kullanicilar DROP COLUMN temp_uuid;
