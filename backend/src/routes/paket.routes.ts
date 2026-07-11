import { Router } from 'express';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import {
  paketleriGetir,
  aktifPaketleriGetir,
  aktifPaketDetayGetir,
  paketOlustur,
  paketGuncelle,
  paketSil,
  paketSatinAlimOlustur,
  paketIciSinavSatinAlimOlustur,
  iyzicoCallback,
} from '../controllers/paket.controller';
import {
  aktifPaketKategorileriGetir,
  paketKategorileriGetir,
  paketKategoriOlustur,
  paketKategoriGuncelle,
  paketKategoriSil,
} from '../controllers/paketKategori.controller';
import {
  sinavSepetFiyatAyarlariGetController,
  sinavSepetFiyatAyarlariGuncelleController,
} from '../controllers/sinav-fiyat-kademe.controller';

const router = Router();

// Herkes aktif paketleri görebilir
router.get('/kategoriler/aktif', aktifPaketKategorileriGetir);
router.get('/aktif', aktifPaketleriGetir);
router.get('/aktif/:id', aktifPaketDetayGetir);

router.post('/satin-al', kimlikDogrula, paketSatinAlimOlustur);
router.post('/:id/sinavlar/satin-al', kimlikDogrula, rolKontrol('OGRENCI'), paketIciSinavSatinAlimOlustur);

// Iyzico Callback
router.post('/iyzico/callback', iyzicoCallback);

// Admin yetkisi gerektiren işlemler
router.get(
  '/sinav-fiyat-kademeleri',
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN'),
  sinavSepetFiyatAyarlariGetController
);
router.put(
  '/sinav-fiyat-kademeleri',
  kimlikDogrula,
  rolKontrol('ADMIN', 'SUPER_ADMIN'),
  sinavSepetFiyatAyarlariGuncelleController
);
router.get('/kategoriler', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'), paketKategorileriGetir);
router.post('/kategoriler', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'), paketKategoriOlustur);
router.put('/kategoriler/:id', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'), paketKategoriGuncelle);
router.delete('/kategoriler/:id', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'), paketKategoriSil);
router.get('/', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'), paketleriGetir);
router.post('/', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'), paketOlustur);
router.put('/:id', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'), paketGuncelle);
router.delete('/:id', kimlikDogrula, rolKontrol('ADMIN', 'SUPER_ADMIN'), paketSil);

export default router;
