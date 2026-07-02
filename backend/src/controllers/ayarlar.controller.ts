import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

/**
 * Ödeme ayarlarını getirir (Iyzico vb.)
 */
export async function odemeAyarlariGetController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ayarlar = await prisma.sistemAyarlari.findMany({
      where: {
        anahtar: {
          in: [
            'IYZICO_API_KEY',
            'IYZICO_SECRET_KEY',
            'IYZICO_BASE_URL',
            'IYZICO_ENABLED',
            'PAYMENT_MODE' // 'LIVE' veya 'SANDBOX'
          ]
        }
      }
    });

    // Anahtar-değer objesine dönüştür
    const veri: Record<string, string> = {};
    ayarlar.forEach((a: { anahtar: string; deger: string }) => {
      veri[a.anahtar] = a.deger;
    });

    // Varsayılan değerler (eğer DB'de yoksa)
    const varsayilanlar: Record<string, string | boolean> = {
      IYZICO_API_KEY: veri.IYZICO_API_KEY || process.env.IYZICO_API_KEY || '',
      IYZICO_SECRET_KEY: veri.IYZICO_SECRET_KEY || process.env.IYZICO_SECRET_KEY || '',
      IYZICO_BASE_URL: veri.IYZICO_BASE_URL || process.env.IYZICO_URI || 'https://sandbox-api.iyzipay.com',
      IYZICO_ENABLED: veri.IYZICO_ENABLED === 'true',
      PAYMENT_MODE: veri.PAYMENT_MODE || 'SANDBOX'
    };

    res.json({ basarili: true, veri: varsayilanlar });
  } catch (err) {
    next(err);
  }
}

/**
 * Ödeme ayarlarını günceller
 */
export async function odemeAyarlariGuncelleController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ayarlar = req.body as Record<string, string | boolean>;

    const islemler = Object.entries(ayarlar).map(([anahtar, deger]) => {
      const degerStr = String(deger);
      return prisma.sistemAyarlari.upsert({
        where: { anahtar },
        update: { deger: degerStr },
        create: { anahtar, deger: degerStr }
      });
    });

    await prisma.$transaction(islemler);

    res.json({ basarili: true, mesaj: 'Ödeme ayarları güncellendi' });
  } catch (err) {
    next(err);
  }
}
