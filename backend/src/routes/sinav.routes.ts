import { Router } from 'express';
import multer from 'multer';
import {
  sinavListesiController,
  sinavDetayController,
  sinavaKatilController,
  cevapGonderController,
  optikFormYukleController,
  sinavSonucController,
  sinavKatilimlarimController,
  denemeKarnesiController,
} from '../controllers/sinav.controller';
import {
  ogrenciSinavTakvimListeleController,
  sinavSatinAlController,
  sinavSepetSatinAlController,
} from '../controllers/sinav-takvim.controller';
import { sinavSepetFiyatAyarlariGetController } from '../controllers/sinav-fiyat-kademe.controller';
import { kimlikDogrula, kimlikDogrulaOpsiyonel, rolKontrol } from '../middlewares/auth.middleware';

const router = Router();
const yukle = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/** Takvim listesi — oturum opsiyonel (süresi dolmuş token olsa bile sınavlar görünür) */
router.get('/takvim', kimlikDogrulaOpsiyonel, ogrenciSinavTakvimListeleController);
router.get('/fiyat-kademeleri', sinavSepetFiyatAyarlariGetController);

router.use(kimlikDogrula);

router.get('/', sinavListesiController);
router.get('/katilimlarim', sinavKatilimlarimController);
router.post('/sepet-satin-al', rolKontrol('OGRENCI'), sinavSepetSatinAlController);
router.post('/:id/satin-al', rolKontrol('OGRENCI'), sinavSatinAlController);
router.get('/:id', sinavDetayController);
router.post('/:id/katil', rolKontrol('OGRENCI'), sinavaKatilController);
router.post('/katilim/:katilimId/cevaplar', rolKontrol('OGRENCI'), cevapGonderController);
router.post('/katilim/:katilimId/optik-form', rolKontrol('OGRENCI'), yukle.single('form'), optikFormYukleController);
router.get('/katilim/:katilimId/sonuc', sinavSonucController);
router.get('/katilim/:katilimId/karnesi', denemeKarnesiController);

export default router;
