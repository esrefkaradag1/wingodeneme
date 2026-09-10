import { Router } from 'express';
import { kimlikDogrula } from '../middlewares/auth.middleware';
import {
  profilGetirController,
  profilGuncelleController,
  profilSifreDegistirController,
  studyPlanlarGetirController,
  studyGorevDurumGuncelleController,
  navSayaclariController,
  kocReferansBaglaController,
} from '../controllers/kullanici.controller';
import {
  ogrenciSiparislerController,
  ogrenciSiparisOdemeBaslatController,
  ogrenciSiparisIptalController,
  ogrenciSiparisOdemeBildirimController,
} from '../controllers/siparis.controller';

const router = Router();
router.use(kimlikDogrula);

router.get('/profil', profilGetirController);
router.put('/profil', profilGuncelleController);
router.put('/profil/sifre', profilSifreDegistirController);
router.post('/koc-referans-bagla', kocReferansBaglaController);
router.get('/study-planlar', studyPlanlarGetirController);
router.patch('/study-planlar/gorev/:gorevId', studyGorevDurumGuncelleController);
router.get('/nav-sayaclari', navSayaclariController);
router.get('/siparisler', ogrenciSiparislerController);
router.post('/siparisler/:id/odeme-baslat', ogrenciSiparisOdemeBaslatController);
router.post('/siparisler/:id/odeme-bildirim', ogrenciSiparisOdemeBildirimController);
router.post('/siparisler/:id/iptal', ogrenciSiparisIptalController);

export default router;
