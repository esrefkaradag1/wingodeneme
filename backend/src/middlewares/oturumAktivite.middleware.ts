import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth.middleware';
import { oturumSonAktiviteGuncelle } from '../services/kullaniciAktivite.service';

/** Öğretmen/admin panel kullanımında oturum süresini günceller (5 dk throttle). */
export function oturumAktiviteMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const kullanici = req.kullanici;
  if (kullanici?.userId && kullanici.rol) {
    void oturumSonAktiviteGuncelle(kullanici.userId, kullanici.rol).catch(() => {
      /* sessiz */
    });
  }
  next();
}
