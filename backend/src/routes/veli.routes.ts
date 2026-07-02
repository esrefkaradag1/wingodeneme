import { Router } from 'express';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import {
  veliOgrenciAnalizController,
  veliOgrenciBaglaController,
  veliOgrenciDestekController,
  veliOgrenciDestekOlusturController,
  veliOgrenciDuyurularController,
  veliOgrenciOnerilerController,
  veliOgrenciProfilController,
  veliOgrenciSinavlarController,
  veliOgrenciSonucController,
  veliOgrenciStudyPlanlarController,
  veliOzetController,
} from '../controllers/veli.controller';

const router = Router();
router.use(kimlikDogrula, rolKontrol('VELI'));

router.get('/ozet', veliOzetController);
router.post('/ogrenci-bagla', veliOgrenciBaglaController);

router.get('/ogrenci/:ogrenciId/profil', veliOgrenciProfilController);
router.get('/ogrenci/:ogrenciId/analiz', veliOgrenciAnalizController);
router.get('/ogrenci/:ogrenciId/sinavlar', veliOgrenciSinavlarController);
router.get('/ogrenci/:ogrenciId/katilim/:katilimId/sonuc', veliOgrenciSonucController);
router.get('/ogrenci/:ogrenciId/study-planlar', veliOgrenciStudyPlanlarController);
router.get('/ogrenci/:ogrenciId/oneriler', veliOgrenciOnerilerController);
router.get('/ogrenci/:ogrenciId/duyurular', veliOgrenciDuyurularController);
router.get('/ogrenci/:ogrenciId/destek', veliOgrenciDestekController);
router.post('/ogrenci/:ogrenciId/destek', veliOgrenciDestekOlusturController);

export default router;
