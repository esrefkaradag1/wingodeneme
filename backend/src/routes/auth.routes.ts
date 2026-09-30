import { Router } from 'express';
import {
  ogrenciKayitController, veliKayitController, ogretmenKayitController, kocKayitController, kurumKayitController,
  girisController, tokenYenileController, cikisController, meGetir,
  sifremiUnuttumTalepController, sifremiUnuttumOnaylaController,
  partnerTokenDogrulaController,
  partnerSsoGirisController,
  partnerKurumSsoGirisController,
} from '../controllers/auth.controller';
import { kimlikDogrula } from '../middlewares/auth.middleware';

const router = Router();

router.post('/kayit', ogrenciKayitController);
/** Kapya Akademi (Edulim) → imzalı JWT doğrula / form prefill */
router.post('/partner/dogrula', partnerTokenDogrulaController);
/** Kapya JWT → mevcut öğrenci hesabına şifresiz giriş (yoksa kayitGerekli) */
router.post('/partner/giris', partnerSsoGirisController);
/** Kapya JWT → kurum paneli şifresiz giriş */
router.post('/partner/kurum-giris', partnerKurumSsoGirisController);
/** Veli kaydı — iki yol (eski istemciler / kısayol) */
router.post('/veli/kayit', veliKayitController);
router.post('/kayit-veli', veliKayitController);
/** Öğretmen kaydı */
router.post('/kayit-ogretmen', ogretmenKayitController);
/** Koç / özel ders / kurumsal kayıt */
router.post('/kayit-koc', kocKayitController);
router.post('/koc/kayit', kocKayitController);
router.post('/kayit-kurum', kurumKayitController);
router.post('/kurum/kayit', kurumKayitController);
router.post('/giris', girisController);
router.post('/sifremi-unuttum', sifremiUnuttumTalepController);
router.post('/sifremi-unuttum/onayla', sifremiUnuttumOnaylaController);
router.post('/token-yenile', tokenYenileController);
router.post('/cikis', kimlikDogrula, cikisController);
router.get('/me', kimlikDogrula, meGetir);

export default router;
