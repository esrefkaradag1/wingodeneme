import { Router } from 'express';
import { siteIcerikPublicController } from '../controllers/site.controller';
import { osymOzetPublicController } from '../controllers/osym.controller';
import { publicSinavTakvimListeleController } from '../controllers/sinav-takvim.controller';

const router = Router();

router.get('/site-icerik', siteIcerikPublicController);
/** Özet: DB’de saklanan son ÖSYM taraması (auth gerekmez; kişisel veri yok) */
router.get('/osym-ozet', osymOzetPublicController);
/** Yayınlanmış sınav takvimi (auth gerekmez) */
router.get('/sinav-takvim', publicSinavTakvimListeleController);

export default router;
