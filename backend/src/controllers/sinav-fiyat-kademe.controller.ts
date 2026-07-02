import { Request, Response, NextFunction } from 'express';
import {
  sinavSepetFiyatAyarlariGetir,
  sinavSepetFiyatAyarlariKaydet,
} from '../services/sinav-fiyat-kademe.service';

export async function sinavSepetFiyatAyarlariGetController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const veri = await sinavSepetFiyatAyarlariGetir();
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function sinavSepetFiyatAyarlariGuncelleController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const veri = await sinavSepetFiyatAyarlariKaydet({
      aktif: body.aktif === true,
      tekDenemeFiyati: body.tekDenemeFiyati != null ? Number(body.tekDenemeFiyati) : undefined,
      kademeler: Array.isArray(body.kademeler) ? body.kademeler : undefined,
    });
    res.json({ basarili: true, veri, mesaj: 'Kademeli fiyatlandırma kaydedildi' });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Kademe hatası')) {
      res.status(400).json({ basarili: false, mesaj: err.message });
      return;
    }
    next(err);
  }
}
