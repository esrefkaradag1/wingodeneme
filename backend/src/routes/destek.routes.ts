import { Router, Response, NextFunction } from 'express';
import { kimlikDogrula, rolKontrol, AuthRequest } from '../middlewares/auth.middleware';
import {
  destekTalebiOlustur,
  destekTaleplerim,
  destekTalebiDetay,
  destekMesajGonder,
  adminDestekTalepleri,
  adminTalepDurumGuncelle,
} from '../services/destek.service';

const router = Router();
router.use(kimlikDogrula);

// Öğrenci: taleplerim
router.get('/benim', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sonuc = await destekTaleplerim(req.kullanici!.userId);
    res.json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

router.post('/benim', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { baslik, mesaj } = req.body || {};
    const sonuc = await destekTalebiOlustur(req.kullanici!.userId, { baslik, mesaj });
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

router.get('/benim/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sonuc = await destekTalebiDetay(req.kullanici!.userId, req.params.id);
    res.json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

router.post('/benim/:id/mesaj', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { mesaj } = req.body || {};
    const sonuc = await destekMesajGonder(req.kullanici!.userId, req.params.id, { mesaj });
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

// Admin/Teacher: tüm talepler
router.get('/admin', rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { durum, q } = req.query;
    const sonuc = await adminDestekTalepleri({ durum: durum as any, q: q as any });
    res.json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

router.post('/admin/:id/mesaj', rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { mesaj } = req.body || {};
    const sonuc = await destekMesajGonder(req.kullanici!.userId, req.params.id, { mesaj });
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

router.patch('/admin/:id/durum', rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { durum } = req.body || {};
    const sonuc = await adminTalepDurumGuncelle(req.params.id, String(durum || ''));
    res.json({ basarili: true, veri: sonuc });
  } catch (e) { next(e); }
});

export default router;

