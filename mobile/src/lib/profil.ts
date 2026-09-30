export function tcKimlikNoNormalize(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '').slice(0, 11);
}

export function tcKimlikNoGecerliMi(v: unknown): boolean {
  const tc = tcKimlikNoNormalize(v);
  if (!/^[1-9][0-9]{10}$/.test(tc)) return false;
  const d = tc.split('').map((c) => parseInt(c, 10));
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  const dig10 = ((tek * 7 - cift) % 10 + 10) % 10;
  if (dig10 !== d[9]) return false;
  const dig11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return dig11 === d[10];
}

export const YKS_LGS_SINIFLAR = [
  { value: '6', etiket: '6. Sınıf' },
  { value: '7', etiket: '7. Sınıf' },
  { value: '8', etiket: '8. Sınıf' },
  { value: '9', etiket: '9. Sınıf' },
  { value: '10', etiket: '10. Sınıf' },
  { value: '11', etiket: '11. Sınıf' },
  { value: '12', etiket: '12. Sınıf' },
  { value: 'mezun', etiket: 'Mezun' },
] as const;

export const KPSS_SINIFLAR = [
  { value: 'KPSS_LISANS', etiket: 'KPSS Lisans' },
  { value: 'KPSS_ONLISANS', etiket: 'KPSS Önlisans' },
  { value: 'KPSS_ORTAOGRETIM', etiket: 'KPSS Ortaöğretim' },
] as const;

/** 6–8 → LGS; 9–12 / mezun → YKS */
export function siniftanOgretimTuru(sinif?: string | null): 'LGS' | 'YKS' | null {
  if (!sinif) return null;
  const ham = String(sinif).trim().toLowerCase();
  if (!ham) return null;
  if (ham.startsWith('kpss')) return null;
  if (ham === 'mezun' || ham.includes('mezun')) return 'YKS';
  const sayi = parseInt(ham.replace(/[^\d]/g, ''), 10);
  if (Number.isNaN(sayi)) return null;
  if (sayi >= 6 && sayi <= 8) return 'LGS';
  if (sayi >= 9 && sayi <= 12) return 'YKS';
  return null;
}
