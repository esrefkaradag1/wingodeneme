import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null | undefined;

function envOku() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

/** Sunucu tarafı Storage (service role) — lazy; dotenv yüklendikten sonra okunur. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_admin !== undefined) return _admin;
  const { url, key } = envOku();
  _admin = url && key
    ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;
  return _admin;
}

export function supabaseAdminHazir(): boolean {
  const { url, key } = envOku();
  return Boolean(url && key);
}

export function egitimStorageBucket(): string {
  return (
    process.env.SUPABASE_STORAGE_BUCKET ||
    process.env.AWS_S3_EGITIM_BUCKET ||
    process.env.AWS_S3_BUCKET ||
    'dokuman'
  );
}
