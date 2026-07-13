import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { egitimStorageBucket, getSupabaseAdmin } from '../config/supabaseAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

export interface ImzaliYuklemeSonuc {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresIn: number;
  yontem: 'supabase' | 's3';
  bucket: string;
  path: string;
  token?: string;
}

function storagePublicUrl(bucket: string, key: string): string {
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${encodeURI(key)}`;
}

/** Supabase Storage imzalı yükleme (S3 access key gerektirmez). */
export async function supabaseImzaliYuklemeUrlOlustur(
  dosyaAdi: string,
  _mimeType: string,
): Promise<ImzaliYuklemeSonuc> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil.');
  }

  const bucket = egitimStorageBucket();
  const uzanti = path.extname(dosyaAdi);
  const key = `${Date.now()}-${uuidv4()}${uzanti}`;

  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(key);
  if (error || !data) {
    throw new Error(error?.message || 'Supabase imzalı yükleme URL oluşturulamadı.');
  }

  return {
    key,
    path: data.path,
    token: data.token,
    uploadUrl: data.signedUrl,
    publicUrl: storagePublicUrl(bucket, key),
    expiresIn: 7200,
    yontem: 'supabase',
    bucket,
  };
}

/**
 * Bir buffer'ı (ör. AI ile üretilmiş görsel) doğrudan Supabase Storage'a yükler
 * ve kalıcı public URL döndürür. Klasör altında benzersiz bir anahtar oluşturur.
 */
export async function supabaseBufferYukle(
  buffer: Buffer,
  contentType: string,
  uzanti = '.png',
  klasor = 'soru-gorsel',
): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil.');
  }
  const bucket = egitimStorageBucket();
  const key = `${klasor}/${Date.now()}-${uuidv4()}${uzanti}`;
  const { error } = await admin.storage.from(bucket).upload(key, buffer, {
    contentType: contentType || 'application/octet-stream',
    upsert: false,
  });
  if (error) {
    throw new Error(error.message || 'Görsel Supabase Storage\'a yüklenemedi.');
  }
  return storagePublicUrl(bucket, key);
}
