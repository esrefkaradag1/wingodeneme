import { Request, Response, NextFunction } from 'express';
import { siteIcerikBirlestirilmisGetir, siteIcerikKaydet } from '../services/siteIcerik.service';

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
