import { OgretimTuru } from '@prisma/client';

const KPSS_ANAHTARLARI = ['KPSS', 'KPSS_LISANS', 'KPSS_ONLISANS', 'KPSS_ORTAOGRETIM'] as const;

export function paketKpssMi(paket: { kategori?: string | null; ad?: string | null }): boolean {
  const kat = String(paket.kategori || '').toUpperCase();
  const ad = String(paket.ad || '').toUpperCase();
  return kat.includes('KPSS') || ad.includes('KPSS');
}

/** Paket mevcut platforma (KPSS / YKS-LGS) uyuyor mu? */
export function paketPlatformUyumlu(
  paket: { kategori?: string | null; ad?: string | null },
  isKpssPlatform: boolean,
): boolean {
  const kpss = paketKpssMi(paket);
  return isKpssPlatform ? kpss : !kpss;
}

function kpssTuruMu(tur: string): boolean {
  return KPSS_ANAHTARLARI.some((k) => tur === k || tur.startsWith('KPSS'));
}

/** Kayıt / satın alma sırasında öğretim türü platforma uygun mu? */
export function platformOgretimTuruUyumlu(
  ogretimTuru: string,
  platformTurleri?: OgretimTuru[],
): boolean {
  if (!platformTurleri?.length) return true;
  const tur = String(ogretimTuru || '').trim().toUpperCase();
  if (!tur) return false;
  const izinSet = new Set(platformTurleri.map((t) => String(t).toUpperCase()));
  if (izinSet.has(tur)) return true;
  if (kpssTuruMu(tur) && [...izinSet].some((t) => kpssTuruMu(t))) return true;
  return false;
}

export function platformOgretimTurleriUyumlu(
  turler: string[],
  platformTurleri?: OgretimTuru[],
): boolean {
  if (!turler.length) return false;
  return turler.every((t) => platformOgretimTuruUyumlu(t, platformTurleri));
}
