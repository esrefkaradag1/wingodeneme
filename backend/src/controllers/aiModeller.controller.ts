import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  openRouterModelAyarOku,
  panelModelleriGetir,
} from '../config/openrouterModeller';
import {
  openRouterModelleriSenkronize,
  openRouterPanelModelleriKaydet,
} from '../services/openrouterModelSenkron.service';

/** GET /ai/modeller — AI panelinde gösterilecek modeller */
export async function aiModellerListeleController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const modeller = await panelModelleriGetir(true);
    const ayar = await openRouterModelAyarOku();
    res.json({
      basarili: true,
      veri: {
        modeller,
        sonSenkron: ayar.sonSenkron,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /admin/ai-modeller — tüm katalog + panel seçimleri */
export async function adminAiModellerGetController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ayar = await openRouterModelAyarOku();
    res.json({ basarili: true, veri: ayar });
  } catch (err) {
    next(err);
  }
}

/** POST /admin/ai-modeller/senkronize — OpenRouter'dan çek */
export async function adminAiModellerSenkronizeController(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sonuc = await openRouterModelleriSenkronize();
    res.json({
      basarili: true,
      mesaj: `OpenRouter senkron tamamlandı. ${sonuc.yeniEklenen} yeni, ${sonuc.guncellenen} güncellenen model.`,
      veri: sonuc.ayar,
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /admin/ai-modeller — panelde göster / açıklama kaydet */
export async function adminAiModellerKaydetController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { modeller } = req.body || {};
    if (!Array.isArray(modeller)) {
      res.status(400).json({ basarili: false, mesaj: 'modeller dizisi gerekli' });
      return;
    }
    const ayar = await openRouterPanelModelleriKaydet(modeller);
    res.json({ basarili: true, mesaj: 'AI model ayarları kaydedildi', veri: ayar });
  } catch (err) {
    next(err);
  }
}
