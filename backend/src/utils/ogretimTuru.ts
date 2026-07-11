/** 6–8. sınıf → LGS; 9–12 ve mezun → YKS; KPSS alt türleri doğrudan kaydedilir */
export type OgretimTuruDeger = 'YKS' | 'LGS' | 'KPSS_LISANS' | 'KPSS_ONLISANS' | 'KPSS_ORTAOGRETIM';

const KPSS_TURLER = new Set<OgretimTuruDeger>(['KPSS_LISANS', 'KPSS_ONLISANS', 'KPSS_ORTAOGRETIM']);

export function kpssOgretimTuruMu(tur?: string | null): tur is OgretimTuruDeger {
  if (!tur) return false;
  return KPSS_TURLER.has(String(tur).trim().toUpperCase() as OgretimTuruDeger);
}

function kpssTurParse(v?: string | null): OgretimTuruDeger | null {
  if (!v) return null;
  const s = String(v).trim().toUpperCase();
  if (s === 'KPSS_LISANS' || s === 'KPSS') return 'KPSS_LISANS';
  if (s === 'KPSS_ONLISANS') return 'KPSS_ONLISANS';
  if (s === 'KPSS_ORTAOGRETIM') return 'KPSS_ORTAOGRETIM';
  return null;
}

export function siniftanOgretimTuru(sinif?: string | null): OgretimTuruDeger | null {
  if (!sinif) return null;
  const ham = String(sinif).trim().toLowerCase();
  if (!ham) return null;

  if (ham === 'mezun' || ham.includes('mezun')) return 'YKS';

  const sayi = parseInt(ham.replace(/[^\d]/g, ''), 10);
  if (Number.isNaN(sayi)) return null;

  if (sayi >= 6 && sayi <= 8) return 'LGS';
  if (sayi >= 9 && sayi <= 12) return 'YKS';

  return null;
}

/** Eski kayıtlar: ogretimTuru = SINIF_6 vb. */
export function legacySinifNorm(ogretimTuru?: string | null, sinif?: string | null): string | null {
  if (sinif?.trim()) return sinif.trim();
  if (!ogretimTuru) return null;
  const m = String(ogretimTuru).match(/^SINIF_(\d+)$/i);
  if (m) return m[1];
  return null;
}

export function ogretimTuruBelirle(
  sinif?: string | null,
  mevcut?: string | null,
): OgretimTuruDeger {
  const kpssFromMevcut = kpssTurParse(mevcut);
  if (kpssFromMevcut) return kpssFromMevcut;
  const kpssFromSinif = kpssTurParse(sinif);
  if (kpssFromSinif) return kpssFromSinif;

  const siniftan = siniftanOgretimTuru(sinif ?? legacySinifNorm(mevcut, null));
  if (siniftan) return siniftan;
  const ham = String(mevcut ?? '').toUpperCase();
  if (ham === 'LGS') return 'LGS';
  return 'YKS';
}

export function ogrenciProfilOgretimGirdisi(girdi: {
  sinif?: unknown;
  ogretimTuru?: unknown;
}): { sinif: string | null; ogretimTuru: OgretimTuruDeger } {
  const sinifHam = typeof girdi.sinif === 'string' ? girdi.sinif.trim() : '';
  const sinif = sinifHam || legacySinifNorm(typeof girdi.ogretimTuru === 'string' ? girdi.ogretimTuru : null, null);
  const ogretimTuru = ogretimTuruBelirle(sinif, typeof girdi.ogretimTuru === 'string' ? girdi.ogretimTuru : null);
  return { sinif: sinif || null, ogretimTuru };
}
