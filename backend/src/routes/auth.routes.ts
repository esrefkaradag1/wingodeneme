import { Router } from 'express';
import {
  ogrenciKayitController, veliKayitController, ogretmenKayitController,
  girisController, tokenYenileController, cikisController, meGetir,
  sifremiUnuttumTalepController, sifremiUnuttumOnaylaController,
} from '../controllers/auth.controller';
import { kimlikDogrula } from '../middlewares/auth.middleware';

const router = Router();

router.post('/kayit', ogrenciKayitController);
/** Veli kaydı — iki yol (eski istemciler / kısayol) */
router.post('/veli/kayit', veliKayitController);
router.post('/kayit-veli', veliKayitController);
/** Öğretmen kaydı */
router.post('/kayit-ogretmen', ogretmenKayitController);
router.post('/giris', girisController);
router.post('/sifremi-unuttum', sifremiUnuttumTalepController);
router.post('/sifremi-unuttum/onayla', sifremiUnuttumOnaylaController);
router.post('/token-yenile', tokenYenileController);
router.post('/cikis', kimlikDogrula, cikisController);
router.get('/me', kimlikDogrula, meGetir);

export default router;
