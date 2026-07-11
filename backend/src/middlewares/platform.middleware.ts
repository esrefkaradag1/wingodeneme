import { Response, NextFunction } from 'express';
import { OgretimTuru } from '@prisma/client';
import { AuthRequest } from './auth.middleware';

function ilkHeaderDegeri(deger: string | string[] | undefined): string {
  if (Array.isArray(deger)) {
    return deger[0] || '';
  }
  return deger || '';
}

/**
 * WingoSınav Platform Ayrımı Middleware
 * 
 * İstekteki Referer, Origin veya özel başlığı (x-platform-mode) inceleyerek
 * isteğin KPSS platformuna mı yoksa YKS/LGS platformuna mı ait olduğunu belirler.
 * Belirlenen platform türlerini `req.platformTurleri` içerisine yazar.
 */
export function platformFiltresi(req: AuthRequest, _res: Response, next: NextFunction) {
  const referer = ilkHeaderDegeri(req.headers.referer).toLowerCase();
  const origin = ilkHeaderDegeri(req.headers.origin).toLowerCase();
  const platformHeader = ilkHeaderDegeri(req.headers['x-platform-mode']).toLowerCase();

  // İstek KPSS platformundan mı geliyor?
  const isKpss = 
    origin.includes('kpss') || 
    referer.includes('kpss') || 
    platformHeader === 'kpss' ||
    process.env.APP_MODE === 'kpss';

  if (isKpss) {
    req.isKpssPlatform = true;
    req.platformTurleri = [
      OgretimTuru.KPSS,
      OgretimTuru.KPSS_LISANS,
      OgretimTuru.KPSS_ONLISANS,
      OgretimTuru.KPSS_ORTAOGRETIM
    ];
  } else {
    req.isKpssPlatform = false;
    // KPSS dışındaki tüm öğretim türleri (YKS, LGS ve Ara Sınıflar)
    req.platformTurleri = [
      OgretimTuru.YKS,
      OgretimTuru.LGS,
      OgretimTuru.SINIF_6,
      OgretimTuru.SINIF_7,
      OgretimTuru.SINIF_9,
      OgretimTuru.SINIF_10,
      OgretimTuru.SINIF_11
    ];
  }

  next();
}
