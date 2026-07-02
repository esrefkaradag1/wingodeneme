import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs/promises';
import { kimlikDogrula, rolKontrol, AuthRequest } from '../middlewares/auth.middleware';
import { AppHatasi } from '../middlewares/hata.middleware';
import {
  adminOgretmenOnerileri,
  adminOgretmenOnerisiDetay,
  adminOgretmenOnerisiGuncelle,
  ogretmenOnerisiOlustur,
} from '../services/ogretmenOneri.service';
import { ogretmenOneriDosyaMutlakYol, yerelOgretmenOneriDosyasiMi } from '../utils/ogretmenOneriDeposu';

const router = Router();

const gonderSinir = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { basarili: false, mesaj: 'Çok fazla öneri gönderimi. Lütfen bir süre sonra tekrar deneyin.' },
});

const yukle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

const cokluGorselYukle = (req: AuthRequest, res: Response, next: NextFunction) => {
  yukle.array('gorseller', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ basarili: false, mesaj: 'Görsel en fazla 5 MB olabilir.' });
      return;
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_COUNT') {
      res.status(413).json({ basarili: false, mesaj: 'En fazla 5 görsel ekleyebilirsiniz.' });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
};

/** Öğretmen / panel kullanıcısı öneri gönderir */
router.post(
  '/',
  gonderSinir,
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
  cokluGorselYukle,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dosyalar = (req.files as Express.Multer.File[] | undefined) || [];
      const { baslik, mesaj, sayfaYolu } = req.body || {};
      const sonuc = await ogretmenOnerisiOlustur(
        req.kullanici!.userId,
        { baslik, mesaj, sayfaYolu },
        dosyalar,
      );
      res.status(201).json({
        basarili: true,
        veri: sonuc,
        mesaj: 'Öneriniz alındı. Teşekkür ederiz!',
      });
    } catch (e) {
      next(e);
    }
  },
);

/** Yerel diske kaydedilmiş görseli sun (S3 URL'leri doğrudan kullanılır) */
router.get(
  '/dosya/:oneriId/:dosyaAdi',
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const oneriId = decodeURIComponent(String(req.params.oneriId || ''));
      const dosyaAdi = decodeURIComponent(String(req.params.dosyaAdi || ''));
      const dosyaRef = `local:ogretmen-oneri/${oneriId}/${dosyaAdi}`;
      if (!yerelOgretmenOneriDosyasiMi(dosyaRef)) {
        throw new AppHatasi('Dosya bulunamadı', 404);
      }
      const abs = ogretmenOneriDosyaMutlakYol(dosyaRef);
      const buf = await fs.readFile(abs);
      const uzanti = abs.split('.').pop()?.toLowerCase();
      const mime =
        uzanti === 'png'
          ? 'image/png'
          : uzanti === 'webp'
            ? 'image/webp'
            : uzanti === 'gif'
              ? 'image/gif'
              : 'image/jpeg';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(buf);
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/admin',
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { durum, q } = req.query;
      const sonuc = await adminOgretmenOnerileri({
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
  rolKontrol('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sonuc = await adminOgretmenOnerisiDetay(req.params.id);
      res.json({ basarili: true, veri: sonuc });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/admin/:id',
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { durum, adminNotu } = req.body || {};
      const sonuc = await adminOgretmenOnerisiGuncelle(req.params.id, { durum, adminNotu });
      res.json({ basarili: true, veri: sonuc });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
