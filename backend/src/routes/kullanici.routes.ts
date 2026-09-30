import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { kimlikDogrula, AuthRequest } from '../middlewares/auth.middleware';
import {
  profilGetirController,
  profilGuncelleController,
  profilAvatarYukleController,
  profilSifreDegistirController,
  studyPlanlarGetirController,
  studyGorevDurumGuncelleController,
  navSayaclariController,
  kocReferansBaglaController,
  pushTokenKaydetController,
  pushTokenSilController,
} from '../controllers/kullanici.controller';
import {
  ogrenciSiparislerController,
  ogrenciSiparisOdemeBaslatController,
  ogrenciSiparisIptalController,
  ogrenciSiparisOdemeBildirimController,
} from '../controllers/siparis.controller';

const router = Router();
router.use(kimlikDogrula);

const avatarYukle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});

const avatarMulter = (req: AuthRequest, res: Response, next: NextFunction) => {
  avatarYukle.single('dosya')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ basarili: false, mesaj: 'Fotoğraf en fazla 3 MB olabilir.' });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
};

router.get('/profil', profilGetirController);
router.put('/profil', profilGuncelleController);
router.post('/profil/avatar', avatarMulter, profilAvatarYukleController);
router.put('/profil/sifre', profilSifreDegistirController);
router.put('/push-token', pushTokenKaydetController);
router.delete('/push-token', pushTokenSilController);
router.post('/koc-referans-bagla', kocReferansBaglaController);
router.get('/study-planlar', studyPlanlarGetirController);
router.patch('/study-planlar/gorev/:gorevId', studyGorevDurumGuncelleController);
router.get('/nav-sayaclari', navSayaclariController);
router.get('/siparisler', ogrenciSiparislerController);
router.post('/siparisler/:id/odeme-baslat', ogrenciSiparisOdemeBaslatController);
router.post('/siparisler/:id/odeme-bildirim', ogrenciSiparisOdemeBildirimController);
router.post('/siparisler/:id/iptal', ogrenciSiparisIptalController);

export default router;
