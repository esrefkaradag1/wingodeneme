/**
 * ÖSYM net formülü:
 * - YKS (TYT/AYT) ve KPSS GY-GK: 4 yanlış = 1 doğru → net = dogru - yanlis/4
 * - LGS: 3 yanlış = 1 doğru → net = dogru - yanlis/3
 */
export function yanlisCezaKatsayisi(sinavTur: string | null | undefined): number {
  const t = String(sinavTur || '').toUpperCase();
  if (t === 'LGS') return 3;
  return 4;
}

export function netHesapla(
  dogru: number,
  yanlis: number,
  sinavTur?: string | null,
): number {
  const ceza = yanlisCezaKatsayisi(sinavTur);
  return parseFloat((dogru - yanlis / ceza).toFixed(2));
}

export function kpssSinavTurMu(tur: string | null | undefined): boolean {
  const t = String(tur || '').toUpperCase();
  return t === 'KPSS' || t.startsWith('KPSS_');
}

export function yksSinavTurMu(tur: string | null | undefined): boolean {
  const t = String(tur || '').toUpperCase();
  return t === 'TYT' || t === 'AYT' || t === 'AYT_TYT';
}

/** Analiz filtreleri: platforma göre sınav türleri (SinavTuru enum) */
export function platformSinavTurleri(isKpss: boolean): string[] {
  if (isKpss) return ['KPSS'];
  return ['TYT', 'AYT', 'AYT_TYT', 'LGS'];
}

/** Sınav türü mevcut panele (KPSS / YKS-LGS) uyuyor mu? */
export function sinavPlatformUyumlu(tur: string | null | undefined, isKpss: boolean): boolean {
  return isKpss ? kpssSinavTurMu(tur) : !kpssSinavTurMu(tur);
}
