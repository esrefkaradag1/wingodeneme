import { prisma } from '../config/database';

export interface IyziConfig {
  apiKey: string;
  secretKey: string;
  uri: string;
}

/**
 * Veritabanından güncel Iyzico ayarlarını getirir.
 * Yoksa .env'deki varsayılanları döner.
 */
export async function getIyziConfig(): Promise<IyziConfig> {
  const ayarlar = await prisma.sistemAyarlari.findMany({
    where: {
      anahtar: {
        in: ['IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL']
      }
    }
  });

  const veri: Record<string, string> = {};
  ayarlar.forEach((a: { anahtar: string; deger: string }) => {
    veri[a.anahtar] = a.deger;
  });

  return {
    apiKey: veri.IYZICO_API_KEY || process.env.IYZIPAY_API_KEY || '',
    secretKey: veri.IYZICO_SECRET_KEY || process.env.IYZIPAY_SECRET_KEY || '',
    uri: veri.IYZICO_BASE_URL || process.env.IYZIPAY_URI || 'https://sandbox-api.iyzipay.com'
  };
}
