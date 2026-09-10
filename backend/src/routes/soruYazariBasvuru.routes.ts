import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { kimlikDogrula, rolKontrol, AuthRequest } from '../middlewares/auth.middleware';
import {
  adminBasvuruDurumGuncelle,
  adminBasvuruListesi,
  adminBasvuruSil,
  basvuruBranslariGetir,
  soruYazariBasvurusuOlustur,
} from '../services/soruYazariBasvuru.service';

const router = Router();

const basvuruSinir = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { basarili: false, mesaj: 'Çok fazla başvuru denemesi. Lütfen bir süre sonra tekrar deneyin.' },
});

/** Herkese açık: form için kademe → branş listesi */
router.get('/branslar', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ basarili: true, veri: await basvuruBranslariGetir() });
  } catch (e) {
    next(e);
  }
});

/** Herkese açık: «Bizimle çalışmak ister misiniz» başvurusu */
router.post('/', basvuruSinir, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const veri = await soruYazariBasvurusuOlustur({
      ...(req.body || {}),
      ipAdresi: req.ip || req.socket?.remoteAddress || null,
    });
    res.status(201).json({
      basarili: true,
      veri,
      mesaj: 'Başvurunuz alındı. Değerlendirme sonrası size dönüş yapacağız.',
    });
  } catch (e) {
    next(e);
  }
});

// --- Yönetici ---
router.use('/admin', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'));

router.get('/admin', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const veri = await adminBasvuruListesi({
      durum: typeof req.query.durum === 'string' ? req.query.durum : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      brans: typeof req.query.brans === 'string' ? req.query.brans : undefined,
    });
    res.json({ basarili: true, veri });
  } catch (e) {
    next(e);
  }
});

router.patch('/admin/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const veri = await adminBasvuruDurumGuncelle(
      req.params.id,
      String(req.body?.durum || ''),
      typeof req.body?.adminNotu === 'string' ? req.body.adminNotu : undefined,
    );
    res.json({ basarili: true, veri });
  } catch (e) {
    next(e);
  }
});

router.delete('/admin/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ basarili: true, veri: await adminBasvuruSil(req.params.id) });
  } catch (e) {
    next(e);
  }
});

export default router;
