const ON_EK = 'wingo-sinav-cevap:';

export function sinavCevapYedekAnahtar(katilimId: string): string {
  return `${ON_EK}${katilimId}`;
}

export function okuSinavCevapYedek(katilimId: string): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(sinavCevapYedekAnahtar(katilimId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function yazSinavCevapYedek(katilimId: string, cevaplar: Record<string, string | null>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(sinavCevapYedekAnahtar(katilimId), JSON.stringify(cevaplar));
  } catch {
    /* depolama dolu — sessiz */
  }
}

export function silSinavCevapYedek(katilimId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(sinavCevapYedekAnahtar(katilimId));
  } catch {
    /* ignore */
  }
}
