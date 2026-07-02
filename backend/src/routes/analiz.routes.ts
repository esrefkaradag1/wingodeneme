import { Router } from 'express';
import { kimlikDogrula } from '../middlewares/auth.middleware';
import { ogrenciAnalizController, ulusalKarsilastirmaController, netSimulasyonController, onerileriGetirController } from '../controllers/analiz.controller';

const router = Router();
router.use(kimlikDogrula);

router.get('/benim', ogrenciAnalizController);
router.get('/oneriler', onerileriGetirController);
router.post('/net-simulasyon', netSimulasyonController);
router.get('/ulusal/:sinavId', ulusalKarsilastirmaController);

export default router;
