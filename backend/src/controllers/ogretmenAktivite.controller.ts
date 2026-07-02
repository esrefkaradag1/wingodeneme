import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ogretmenAktiviteDetay, ogretmenAktiviteOzetListe } from '../services/kullaniciAktivite.service';

/** GET /admin/ogretmen-aktivite — öğretmen aktivite özeti */
export async function ogretmenAktiviteOzetController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { baslangicTarihi, bitisTarihi, q, aktif } = req.query;
    const veri = await ogretmenAktiviteOzetListe({
      baslangicTarihi: typeof baslangicTarihi === 'string' ? baslangicTarihi : undefined,
      bitisTarihi: typeof bitisTarihi === 'string' ? bitisTarihi : undefined,
      q: typeof q === 'string' ? q : undefined,
      aktif: typeof aktif === 'string' ? aktif : undefined,
    });
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

/** GET /admin/ogretmen-aktivite/:kullaniciId — öğretmen detay (oturum + işlem geçmişi) */
export async function ogretmenAktiviteDetayController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { kullaniciId } = req.params;
    const { baslangicTarihi, bitisTarihi, limit } = req.query;
    if (!kullaniciId) {
      res.status(400).json({ basarili: false, mesaj: 'kullaniciId gerekli' });
      return;
    }
    const veri = await ogretmenAktiviteDetay(kullaniciId, {
      baslangicTarihi: typeof baslangicTarihi === 'string' ? baslangicTarihi : undefined,
      bitisTarihi: typeof bitisTarihi === 'string' ? bitisTarihi : undefined,
      limit: typeof limit === 'string' ? Number(limit) : undefined,
    });
    if (!veri) {
      res.status(404).json({ basarili: false, mesaj: 'Öğretmen bulunamadı' });
      return;
    }
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}
