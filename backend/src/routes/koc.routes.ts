import { Router } from 'express';
import { kimlikDogrula, rolKontrol } from '../middlewares/auth.middleware';
import {
  kocDurumController,
  kocDenemeKarnesiController,
  kocOgrenciAnalizController,
  kocOgrenciBaglaController,
  kocOgrenciProfilController,
  kocOgrenciSinavlarController,
  kocOgrenciSonucController,
  kocOzetController,
  kocSinavKatilimlariController,
  kocTopluAnalizController,
} from '../controllers/koc.controller';
import {
  kocKazancHareketController,
  kocKazancOzetController,
} from '../controllers/indirimKodu.controller';

const router = Router();
// KOC hesapları + yönetici tarafından koç yetkisi verilmiş TEACHER hesapları
// (TEACHER'ın koç profili yoksa servis katmanı 403 döner)
router.use(kimlikDogrula, rolKontrol('KOC', 'TEACHER'));

router.get('/durum', kocDurumController);
router.get('/ozet', kocOzetController);
router.get('/toplu-analiz', kocTopluAnalizController);
router.post('/ogrenci-bagla', kocOgrenciBaglaController);

router.get('/sinavlar/:sinavId/katilimlar', kocSinavKatilimlariController);
router.get('/sinavlar/:sinavId/katilim/:katilimId/karnesi', kocDenemeKarnesiController);

router.get('/ogrenci/:ogrenciId/profil', kocOgrenciProfilController);
router.get('/ogrenci/:ogrenciId/analiz', kocOgrenciAnalizController);
router.get('/ogrenci/:ogrenciId/sinavlar', kocOgrenciSinavlarController);
router.get('/ogrenci/:ogrenciId/katilim/:katilimId/sonuc', kocOgrenciSonucController);

// İndirim kodları yönetici tarafından tanımlanır; koç yalnızca kendi kazancını görür
router.get('/kazancim/ozet', kocKazancOzetController);
router.get('/kazancim/hareketler', kocKazancHareketController);

export default router;
