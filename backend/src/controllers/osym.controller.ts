import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { osymKaynaklariTara, osymOzetGetir } from '../services/osym.service';

export async function osymTaraController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const duyuruAktar = req.body?.duyuruAktar !== false;
    const uid = req.kullanici?.userId;
    if (!uid) {
      res.status(401).json({ basarili: false, mesaj: 'Oturum gerekli' });
      return;
    }
    const sonuc = await osymKaynaklariTara({ olusturanKullaniciId: uid, duyuruAktar });
    res.json({ basarili: true, veri: sonuc });
  } catch (e) {
    next(e);
  }
}

export async function osymDurumAdminController(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await osymOzetGetir();
    res.json({ basarili: true, veri });
  } catch (e) {
    next(e);
  }
}

export async function osymOzetPublicController(_req: unknown, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await osymOzetGetir();
    res.json({ basarili: true, veri });
  } catch (e) {
    next(e);
  }
}
