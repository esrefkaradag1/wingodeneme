import { Router } from 'express';
import { kimlikDogrula } from '../middlewares/auth.middleware';
import { araController, tahminController, hedefEkleController, hedeflerGetirController, hedefSilController } from '../controllers/universite.controller';

const router = Router();
router.use(kimlikDogrula);

router.get('/ara', araController);
router.get('/tahmin', tahminController);
router.post('/hedef', hedefEkleController);
router.get('/hedeflerim', hedeflerGetirController);
router.delete('/hedef/:bolumId', hedefSilController);

export default router;
