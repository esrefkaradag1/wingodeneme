import { Router } from 'express';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import { oturumAktiviteMiddleware } from '../middlewares/oturumAktivite.middleware';
import {
  soruUretController, analizYapController, studyPlanOlusturController, oneriGetirController,
  soruAiYardimController,
  hataAciklaController,
  ttsController,
  veoAktifController,
  veoVideoBaslatController,
  veoVideoDurumController,
  veoVideoIndirController,
} from '../controllers/ai.controller';
import { aiModellerListeleController } from '../controllers/aiModeller.controller';

const router = Router();
router.use(kimlikDogrula, oturumAktiviteMiddleware);

router.post('/soru-uret', rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), soruUretController);
router.get('/modeller', rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), aiModellerListeleController);
// Öğretmen AI yardımcısı — soru düzenleme/komut bazlı düzeltme
router.post('/sorular/:id/yardim', rolKontrol('ADMIN', 'SUPER_ADMIN', 'TEACHER'), soruAiYardimController);
router.post('/hata-acikla', rolKontrol('OGRENCI', 'ADMIN', 'SUPER_ADMIN'), hataAciklaController);
router.post('/tts', rolKontrol('OGRENCI', 'ADMIN', 'SUPER_ADMIN', 'TEACHER', 'VELI'), ttsController);
router.get('/veo-video/aktif', rolKontrol('OGRENCI', 'ADMIN', 'SUPER_ADMIN'), veoAktifController);
router.post('/veo-video', rolKontrol('OGRENCI', 'ADMIN', 'SUPER_ADMIN'), veoVideoBaslatController);
router.get('/veo-video/:islemId/durum', rolKontrol('OGRENCI', 'ADMIN', 'SUPER_ADMIN'), veoVideoDurumController);
router.get('/veo-video/:islemId/indir', rolKontrol('OGRENCI', 'ADMIN', 'SUPER_ADMIN'), veoVideoIndirController);
router.get('/analiz', analizYapController);
router.post('/study-plan', studyPlanOlusturController);
router.get('/oneriler', oneriGetirController);

export default router;
