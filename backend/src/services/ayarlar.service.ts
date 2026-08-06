import { prisma } from '../config/database';

export interface IyziConfig {
  apiKey: string;
  secretKey: string;
  uri: string;
}

function ilkDolu(...adaylar: Array<string | undefined | null>): string {
  for (const v of adaylar) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

/**
 * Veritabanından güncel Iyzico ayarlarını getirir.
 * Yoksa .env'deki varsayılanları döner.
 *
 * Not: Eski kodda env fallback IYZIPAY_* idi; panel/DB IYZICO_* kullanıyor.
 * Her iki isimlendirme de desteklenir.
 */
export async function getIyziConfig(): Promise<IyziConfig> {
  const ayarlar = await prisma.sistemAyarlari.findMany({
    where: {
      anahtar: {
        in: [
          'IYZICO_API_KEY',
          'IYZICO_SECRET_KEY',
          'IYZICO_BASE_URL',
          'IYZIPAY_API_KEY',
          'IYZIPAY_SECRET_KEY',
          'IYZIPAY_URI',
        ],
      },
    },
  });

  const veri: Record<string, string> = {};
  ayarlar.forEach((a: { anahtar: string; deger: string }) => {
    veri[a.anahtar] = a.deger;
  });

  return {
    apiKey: ilkDolu(
      veri.IYZICO_API_KEY,
      veri.IYZIPAY_API_KEY,
      process.env.IYZICO_API_KEY,
      process.env.IYZIPAY_API_KEY,
    ),
    secretKey: ilkDolu(
      veri.IYZICO_SECRET_KEY,
      veri.IYZIPAY_SECRET_KEY,
      process.env.IYZICO_SECRET_KEY,
      process.env.IYZIPAY_SECRET_KEY,
    ),
    uri: ilkDolu(
      veri.IYZICO_BASE_URL,
      veri.IYZIPAY_URI,
      process.env.IYZICO_BASE_URL,
      process.env.IYZICO_URI,
      process.env.IYZIPAY_URI,
    ) || 'https://sandbox-api.iyzipay.com',
  };
}

/** Iyzico anahtarları tanımlı mı? (boş/placeholder değil) */
export function iyzicoConfigGecerliMi(config: IyziConfig): boolean {
  const api = config.apiKey.trim();
  const secret = config.secretKey.trim();
  if (!api || !secret) return false;
  if (api.includes('your-api-key') || api.includes('sandbox-api-key')) return false;
  if (secret.includes('your-secret') || secret.includes('sandbox-secret')) return false;
  return true;
}
