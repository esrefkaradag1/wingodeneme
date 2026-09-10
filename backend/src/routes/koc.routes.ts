import { Router } from 'express';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import {
  kocDurumController,
  kocOgrenciAnalizController,
  kocOgrenciBaglaController,
  kocOgrenciProfilController,
  kocOgrenciSinavlarController,
  kocOgrenciSonucController,
  kocOzetController,
  kocTopluAnalizController,
} from '../controllers/koc.controller';

const router = Router();
// KOC hesapları + yönetici tarafından koç yetkisi verilmiş TEACHER hesapları
// (TEACHER'ın koç profili yoksa servis katmanı 403 döner)
router.use(kimlikDogrula, rolKontrol('KOC', 'TEACHER'));

router.get('/durum', kocDurumController);
router.get('/ozet', kocOzetController);
router.get('/toplu-analiz', kocTopluAnalizController);
router.post('/ogrenci-bagla', kocOgrenciBaglaController);

router.get('/ogrenci/:ogrenciId/profil', kocOgrenciProfilController);
router.get('/ogrenci/:ogrenciId/analiz', kocOgrenciAnalizController);
router.get('/ogrenci/:ogrenciId/sinavlar', kocOgrenciSinavlarController);
router.get('/ogrenci/:ogrenciId/katilim/:katilimId/sonuc', kocOgrenciSonucController);

export default router;
