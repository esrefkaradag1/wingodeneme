import { Request, Response, NextFunction } from 'express';
import { siteIcerikBirlestirilmisGetir, siteIcerikKaydet } from '../services/siteIcerik.service';

export async function siteIcerikPublicController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const veri = await siteIcerikBirlestirilmisGetir();
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
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
