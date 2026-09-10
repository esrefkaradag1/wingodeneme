import { Router } from 'express';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import {
  kurumOgrenciBaglaController,
  kurumOgrenciCikarController,
  kurumOgrenciHesapAcController,
  kurumOgrenciSifreController,
  kurumOgrenciSinifAtaController,
  kurumOgrencilerController,
  kurumOgretmenEkleController,
  kurumOgretmenGuncelleController,
  kurumOgretmenlerController,
  kurumOgretmenSifreController,
  kurumOgretmenSilController,
  kurumOzetController,
  kurumSinifDetayController,
  kurumSinifGuncelleController,
  kurumSiniflarController,
  kurumSinifOgretmenAtaController,
  kurumSinifOgretmenKaldirController,
  kurumSinifOlusturController,
  kurumSinifSilController,
} from '../controllers/kurum.controller';

/**
 * Kurumsal hesapların yönetim uçları — bireysel koç yüzeyinden ayrıdır.
 * Servis katmanı yalnızca KURUMSAL profillere izin verir (kurum öğretmeni de dahil değildir).
 */
const router = Router();
router.use(kimlikDogrula, rolKontrol('KOC', 'TEACHER'));

router.get('/ozet', kurumOzetController);

router.get('/siniflar', kurumSiniflarController);
router.post('/siniflar', kurumSinifOlusturController);
router.get('/siniflar/:sinifId', kurumSinifDetayController);
router.patch('/siniflar/:sinifId', kurumSinifGuncelleController);
router.delete('/siniflar/:sinifId', kurumSinifSilController);
router.post('/siniflar/:sinifId/ogretmenler', kurumSinifOgretmenAtaController);
router.delete('/siniflar/:sinifId/ogretmenler/:ogretmenId', kurumSinifOgretmenKaldirController);

router.get('/ogretmenler', kurumOgretmenlerController);
router.post('/ogretmenler', kurumOgretmenEkleController);
router.patch('/ogretmenler/:ogretmenId', kurumOgretmenGuncelleController);
router.delete('/ogretmenler/:ogretmenId', kurumOgretmenSilController);
router.post('/ogretmenler/:ogretmenId/sifre-sifirla', kurumOgretmenSifreController);

router.get('/ogrenciler', kurumOgrencilerController);
router.post('/ogrenciler', kurumOgrenciHesapAcController);
router.post('/ogrenciler/bagla', kurumOgrenciBaglaController);
router.patch('/ogrenciler/:ogrenciId/sinif', kurumOgrenciSinifAtaController);
router.delete('/ogrenciler/:ogrenciId', kurumOgrenciCikarController);
router.post('/ogrenciler/:ogrenciId/sifre-sifirla', kurumOgrenciSifreController);

export default router;
