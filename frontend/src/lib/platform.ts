import { kpssOgretimTuruMu } from './ogrenciKademe';

/**
 * WingoSınav Platform Tespit Yardımcısı
 * 
 * Bu yardımcı, uygulamanın KPSS modunda mı yoksa YKS/LGS modunda mı çalıştığını algılar.
 * Client component'larda hata vermemesi için 'next/headers' bağımlılığı içermez.
 */

export function getAppMode(): 'kpss' | 'yks_lgs' {
  // 1. Tarayıcıda Port ve Domain Kontrolü (Yerel geliştirme ortamı ve client-side dinamik geçişler için)
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port === '3002') {
      return 'kpss';
    }
    if (port === '3001' || port === '3000' || port === '3005') {
      return 'yks_lgs';
    }

    const hostname = window.location.hostname;
    if (hostname.includes('kpss')) {
      return 'kpss';
    }
  }

  // 2. Çevre Değişkeni Kontrolü (Build time ve Vercel/VPS ayrı dağıtımlar için)
  if (process.env.NEXT_PUBLIC_APP_MODE === 'kpss') {
    return 'kpss';
  }
  if (process.env.NEXT_PUBLIC_APP_MODE === 'yks_lgs') {
    return 'yks_lgs';
  }

  return 'yks_lgs'; // Varsayılan değer
}

export const isKpssMode = (): boolean => getAppMode() === 'kpss';

/** KPSS alt alanı veya oturum açmış KPSS öğrencisi */
export function kpssOrtami(ogretimTuru?: string | null): boolean {
  if (getAppMode() === 'kpss') return true;
  return kpssOgretimTuruMu(ogretimTuru);
}
