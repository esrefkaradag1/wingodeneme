import { Router } from 'express';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import {
  arkadasIstek, arkadasYanit, arkadaslariGetirController,
  gelenArkadaslikIstekleriController,
  puanKarsilastirController, duelloBaslatController,
  duelloYanitController, gelenDuelloDavetleriController, duelloTamamlaController, kullaniciAraController
} from '../controllers/sosyal.controller';

const router = Router();
router.use(kimlikDogrula, rolKontrol('OGRENCI', 'ADMIN', 'SUPER_ADMIN'));

router.post('/arkadaslik/:hedefId', arkadasIstek);
router.patch('/arkadaslik/:id/yanit', arkadasYanit);
router.get('/arkadaslik/istekler/gelen', gelenArkadaslikIstekleriController);
router.get('/arkadaslar', arkadaslariGetirController);
router.get('/karsilastir/:arkadasId', puanKarsilastirController);
router.post('/duello/:davetEdilenId', duelloBaslatController);
router.patch('/duello/:id/yanit', duelloYanitController);
router.get('/duello/davetler/gelen', gelenDuelloDavetleriController);
router.post('/duello/:id/tamamla', duelloTamamlaController);
router.get('/kullanici-ara', kullaniciAraController);

export default router;
