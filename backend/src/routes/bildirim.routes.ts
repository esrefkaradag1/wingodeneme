import { Router, Response, NextFunction } from 'express';
import { kimlikDogrula } from '../middlewares/auth.middleware';
import { bildirimlerGetir, bildirimOkundu, tumunuOku } from '../services/bildirim.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
router.use(kimlikDogrula);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sayfa = parseInt(req.query.sayfa as string || '1');
    const sonuc = await bildirimlerGetir(req.kullanici!.userId, sayfa);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
});

router.patch('/:id/oku', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await bildirimOkundu(req.params.id, req.kullanici!.userId);
    res.json({ basarili: true });
  } catch (err) { next(err); }
});

router.patch('/tumunu-oku', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await tumunuOku(req.kullanici!.userId);
    res.json({ basarili: true });
  } catch (err) { next(err); }
});

export default router;
