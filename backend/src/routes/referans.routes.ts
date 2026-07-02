import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import {
  referansAnalizController,
  referansSoruUretController,
} from '../controllers/referans.controller';

const router = Router();
const yukle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: (_req, file, cb) => {
    const izinli = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, izinli.includes(file.mimetype));
  },
});

/**
 * Koşullu multer: Sadece multipart/form-data isteklerinde dosya parse eder.
 * JSON isteklerinde (URL modu) multer'ı atlatır; böylece Vercel Serverless'ta
 * multer'ın body parse'ı bozması engellenir.
 */
function kosulluMulter(req: Request, res: Response, next: NextFunction): void {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('multipart/form-data')) {
    yukle.single('dosya')(req, res, next);
  } else {
    next();
  }
}

router.use(kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'));

// Adım 1: Dosya analizi (dosya yükleme veya URL)
router.post('/analiz', kosulluMulter, referansAnalizController);

// Adım 2: Özgün soru üretimi
router.post('/soru-uret', referansSoruUretController);

export default router;
