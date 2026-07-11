import { Router } from 'express';
import { kimlikDogrula } from '../middlewares/auth.middleware';
import {
  profilGetirController,
  profilGuncelleController,
  profilSifreDegistirController,
  studyPlanlarGetirController,
  studyGorevDurumGuncelleController,
  navSayaclariController,
} from '../controllers/kullanici.controller';
import { ogrenciSiparislerController, ogrenciSiparisOdemeBaslatController } from '../controllers/siparis.controller';

const router = Router();
router.use(kimlikDogrula);

router.get('/profil', profilGetirController);
router.put('/profil', profilGuncelleController);
router.put('/profil/sifre', profilSifreDegistirController);
router.get('/study-planlar', studyPlanlarGetirController);
router.patch('/study-planlar/gorev/:gorevId', studyGorevDurumGuncelleController);
router.get('/nav-sayaclari', navSayaclariController);
router.get('/siparisler', ogrenciSiparislerController);
router.post('/siparisler/:id/odeme-baslat', ogrenciSiparisOdemeBaslatController);

export default router;
