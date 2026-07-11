import type { AuthRequest } from '../middlewares/auth.middleware';

function temizle(url?: string | null): string | null {
  if (!url) return null;
  return url.replace(/\/$/, '');
}

/** Ödeme callback ve yönlendirmeler için frontend taban adresi. */
export function frontendBaseUrl(): string {
  const adaylar = [
    process.env.CLIENT_URL,
    process.env.APP_URL,
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter(Boolean)
    .map((url) => url!.replace(/\/$/, ''));

  if (adaylar[0]) return adaylar[0];

  if (process.env.VERCEL === '1') {
    return 'https://www.wingodeneme.com';
  }

  return 'http://localhost:3001';
}

/** KPSS platformu için frontend taban adresi (ödeme yönlendirmesi). */
export function kpssFrontendBaseUrl(): string {
  const ozel = temizle(process.env.KPSS_CLIENT_URL) || temizle(process.env.NEXT_PUBLIC_KPSS_APP_URL);
  if (ozel) return ozel;
  if (process.env.VERCEL === '1') {
    return 'https://kpss.wingodeneme.com';
  }
  return 'http://localhost:3002';
}

/**
 * İstek platformuna göre doğru frontend taban adresini döndürür.
 * KPSS platformundan gelen ödemeler KPSS frontend'ine yönlenir.
 */
export function platformFrontendBaseUrl(req?: Pick<AuthRequest, 'isKpssPlatform'> | null): string {
  if (req?.isKpssPlatform) return kpssFrontendBaseUrl();
  return frontendBaseUrl();
}
