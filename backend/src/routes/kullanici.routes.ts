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

const router = Router();
router.use(kimlikDogrula);

router.get('/profil', profilGetirController);
router.put('/profil', profilGuncelleController);
router.put('/profil/sifre', profilSifreDegistirController);
router.get('/study-planlar', studyPlanlarGetirController);
router.patch('/study-planlar/gorev/:gorevId', studyGorevDurumGuncelleController);
router.get('/nav-sayaclari', navSayaclariController);

export default router;
