import { Router, Response, NextFunction } from 'express';
import { kimlikDogrula, rolKontrol, AuthRequest } from '../middlewares/auth.middleware';
import {
  duyuruOlustur,
  duyurularim,
  duyuruOku,
} from '../services/duyuru.service';

const router = Router();
router.use(kimlikDogrula);

// Öğrenci/Her rol: kendi duyuruları
router.get('/benim', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sonuc = await duyurularim(req.kullanici!.userId);
    res.json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

router.patch('/benim/:id/oku', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await duyuruOku(req.kullanici!.userId, req.params.id);
    res.json({ basarili: true });
  } catch (e) { next(e); }
});

// Admin: duyuru gönder
router.post('/', rolKontrol('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { baslik, mesaj, hedefTuru, hedefRoller, kullaniciIds } = req.body || {};
    const sonuc = await duyuruOlustur(req.kullanici!.userId, { baslik, mesaj, hedefTuru, hedefRoller, kullaniciIds });
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

// Admin: son duyurular listesi + okundu sayıları (özet)
router.get('/admin', rolKontrol('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const sonuc = await (await import('../services/duyuruAdmin.service')).duyuruAdminListele(String(q || '').trim());
    res.json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

// Admin: bir duyuruyu kim okudu?
router.get('/:id/alicilar', rolKontrol('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sonuc = await (await import('../services/duyuruAdmin.service')).duyuruAlicilar(req.params.id);
    res.json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

export default router;

