/** 6–8. sınıf → LGS; 9–12 ve mezun → YKS */
export type OgretimTuruDeger = 'YKS' | 'LGS';

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
