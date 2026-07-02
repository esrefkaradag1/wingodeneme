import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { kimlikDogrula, kimlikDogrulaOpsiyonel, rolKontrol, AuthRequest } from '../middlewares/auth.middleware';
import {
  adminIletisimFormlari,
  adminIletisimFormuDetay,
  adminIletisimFormuGuncelle,
  iletisimFormuOlustur,
} from '../services/iletisim.service';

const router = Router();

const formSinir = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { basarili: false, mesaj: 'Çok fazla form gönderimi. Lütfen bir süre sonra tekrar deneyin.' },
});

/** Herkese açık iletişim formu */
router.post('/', formSinir, kimlikDogrulaOpsiyonel, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { adSoyad, eposta, konu, mesaj } = req.body || {};
    const sonuc = await iletisimFormuOlustur({
      adSoyad,
      eposta,
      konu,
      mesaj,
      kullaniciId: req.kullanici?.userId || null,
      ipAdresi: req.ip || req.socket?.remoteAddress || null,
    });
    res.status(201).json({
      basarili: true,
      veri: sonuc,
      mesaj: 'Talebiniz alındı. En kısa sürede size dönüş yapacağız.',
    });
  } catch (e) {
    next(e);
  }
});

router.get(
  '/admin',
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { durum, q } = req.query;
      const sonuc = await adminIletisimFormlari({
        durum: durum as string | undefined,
        q: q as string | undefined,
      });
      res.json({ basarili: true, veri: sonuc });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/admin/:id',
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sonuc = await adminIletisimFormuDetay(req.params.id);
      res.json({ basarili: true, veri: sonuc });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/admin/:id',
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { durum, adminNotu } = req.body || {};
      const sonuc = await adminIletisimFormuGuncelle(req.params.id, { durum, adminNotu });
      res.json({ basarili: true, veri: sonuc });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
