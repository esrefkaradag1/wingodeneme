import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  kocDurumGetir,
  kocDenemeKarnesiGetir,
  kocOgrenciAnalizGetir,
  kocOgrenciBaglaEmail,
  kocOgrenciProfilGetir,
  kocOgrenciSinavlarGetir,
  kocOgrenciSonucGetir,
  kocOzetGetir,
  kocSinavKatilimlariListele,
  kocTopluAnalizGetir,
} from '../services/koc.service';

function kocUid(req: AuthRequest): string {
  return req.kullanici!.userId || req.kullanici!.id;
}

export async function kocDurumController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocDurumGetir(kocUid(req));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocOzetController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocOzetGetir(kocUid(req));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocTopluAnalizController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sinifId = typeof req.query.sinifId === 'string' ? req.query.sinifId.trim() : undefined;
    const veri = await kocTopluAnalizGetir(kocUid(req), { sinifId: sinifId || undefined });
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocOgrenciBaglaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const sonuc = await kocOgrenciBaglaEmail(kocUid(req), email);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) {
    next(err);
  }
}

export async function kocOgrenciProfilController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocOgrenciProfilGetir(kocUid(req), req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocOgrenciAnalizController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocOgrenciAnalizGetir(kocUid(req), req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocOgrenciSinavlarController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocOgrenciSinavlarGetir(
      kocUid(req),
      req.params.ogrenciId,
      req.isKpssPlatform === true,
    );
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocOgrenciSonucController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocOgrenciSonucGetir(kocUid(req), req.params.ogrenciId, req.params.katilimId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocSinavKatilimlariController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocSinavKatilimlariListele(kocUid(req), req.params.sinavId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocDenemeKarnesiController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocDenemeKarnesiGetir(kocUid(req), req.params.katilimId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}
