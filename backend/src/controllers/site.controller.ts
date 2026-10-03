import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { siteIcerikBirlestirilmisGetir, siteIcerikKaydet } from '../services/siteIcerik.service';
import { s3DosyaYukle } from '../utils/s3';
import { s3AnahtarlariGecerli } from '../utils/storageYapilandirma';

const SLIDER_VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export function sliderMedyaKlasoru(): string {
  return path.resolve(process.cwd(), 'uploads', 'slider');
}

export async function siteIcerikPublicController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const veri = await siteIcerikBirlestirilmisGetir();
    // Domain/origin bazlı CORS başlıkları karışmaması için CDN/tarayıcı cache kapalı.
    res.set('Cache-Control', 'public, no-store, no-cache, must-revalidate');
    res.set('CDN-Cache-Control', 'no-store');
    res.set('Vercel-CDN-Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function siteIcerikAdminGetController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const veri = await siteIcerikBirlestirilmisGetir();
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function siteIcerikAdminPutController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await siteIcerikKaydet(req.body);
    const veri = await siteIcerikBirlestirilmisGetir();
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function sliderVideoYukleController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dosya = req.file;
    if (!dosya) {
      res.status(400).json({ basarili: false, mesaj: 'Video dosyası gerekli' });
      return;
    }
    if (!SLIDER_VIDEO_MIME.has(dosya.mimetype)) {
      res.status(400).json({ basarili: false, mesaj: 'MP4, WEBM veya MOV yükleyin' });
      return;
    }

    let url: string;
    if (s3AnahtarlariGecerli()) {
      url = await s3DosyaYukle(dosya.buffer, dosya.originalname || 'video.mp4', dosya.mimetype, 'slider');
    } else {
      const klasor = sliderMedyaKlasoru();
      fs.mkdirSync(klasor, { recursive: true });
      const hamUzanti = path.extname(dosya.originalname || '').toLowerCase();
      const uzanti = hamUzanti === '.mp4' || hamUzanti === '.webm' || hamUzanti === '.mov' ? hamUzanti : '.mp4';
      const ad = `${randomUUID()}${uzanti}`;
      fs.writeFileSync(path.join(klasor, ad), dosya.buffer);
      const proto = String(req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim();
      const host = req.get('x-forwarded-host') || req.get('host');
      url = `${proto}://${host}/slider-medya/${ad}`;
    }

    res.json({ basarili: true, veri: { url } });
  } catch (err) {
    next(err);
  }
}
