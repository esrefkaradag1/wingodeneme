import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  veliOgrenciAnalizGetir,
  veliOgrenciBagla,
  veliOgrenciDestekGetir,
  veliOgrenciDestekOlustur,
  veliOgrenciDuyurularGetir,
  veliOgrenciOnerilerGetir,
  veliOgrenciProfilGetir,
  veliOgrenciSinavlarGetir,
  veliOgrenciSonucGetir,
  veliOgrenciStudyPlanlarGetir,
  veliOzetGetir,
} from '../services/veli.service';

function veliUid(req: AuthRequest): string {
  return req.kullanici!.userId || req.kullanici!.id;
}

export async function veliOzetController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOzetGetir(veliUid(req));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciBaglaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const sonuc = await veliOgrenciBagla(veliUid(req), email);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciProfilController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOgrenciProfilGetir(veliUid(req), req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciAnalizController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOgrenciAnalizGetir(veliUid(req), req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciSinavlarController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOgrenciSinavlarGetir(
      veliUid(req),
      req.params.ogrenciId,
      req.isKpssPlatform === true,
    );
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciSonucController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOgrenciSonucGetir(veliUid(req), req.params.ogrenciId, req.params.katilimId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciStudyPlanlarController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOgrenciStudyPlanlarGetir(veliUid(req), req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciOnerilerController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOgrenciOnerilerGetir(veliUid(req), req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciDuyurularController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOgrenciDuyurularGetir(veliUid(req), req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciDestekController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await veliOgrenciDestekGetir(veliUid(req), req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function veliOgrenciDestekOlusturController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { baslik, mesaj } = req.body || {};
    const veri = await veliOgrenciDestekOlustur(veliUid(req), req.params.ogrenciId, { baslik, mesaj });
    res.status(201).json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}
