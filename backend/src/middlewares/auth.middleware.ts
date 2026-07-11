import { Request, Response, NextFunction } from 'express';
import { OgretimTuru } from '@prisma/client';
import { tokenDogrula, JwtPayload } from '../utils/jwt';
import { prisma } from '../config/database';
import { supabase } from '../config/supabase';

export interface AuthRequest extends Request {
  kullanici?: JwtPayload & { id: string };
  platformTurleri?: OgretimTuru[];
  isKpssPlatform?: boolean;
}

async function tokenIleKullaniciBul(token: string): Promise<(JwtPayload & { id: string }) | null> {
  try {
    const payload = tokenDogrula(token);
    if (payload?.userId) {
      const kullanici = await prisma.kullanici.findUnique({
        where: { id: payload.userId, aktif: true },
        select: { id: true, email: true, rol: true },
      });
      if (kullanici) {
        return { ...payload, id: kullanici.id, rol: kullanici.rol, userId: kullanici.id };
      }
    }
  } catch {
    // Yerel JWT geçersiz — Supabase fallback
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, rol: true },
  });
  if (!kullanici) return null;

  return { userId: kullanici.id, id: kullanici.id, rol: kullanici.rol, email: kullanici.email };
}

/** Token zorunlu — yoksa veya geçersizse 401 */
export async function kimlikDogrula(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authBasligi = req.headers.authorization;
    if (!authBasligi?.startsWith('Bearer ')) {
      res.status(401).json({ basarili: false, mesaj: 'Yetkilendirme token\'ı gerekli' });
      return;
    }

    const token = authBasligi.split(' ')[1];
    const kullanici = await tokenIleKullaniciBul(token);
    if (!kullanici) {
      res.status(401).json({ basarili: false, mesaj: 'Geçersiz veya süresi dolmuş token' });
      return;
    }

    req.kullanici = kullanici;
    next();
  } catch {
    res.status(401).json({ basarili: false, mesaj: 'Yetkilendirme hatası' });
  }
}

/** Token varsa doğrula, yoksa veya geçersizse devam et (req.kullanici boş kalabilir) */
export async function kimlikDogrulaOpsiyonel(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authBasligi = req.headers.authorization;
    if (authBasligi?.startsWith('Bearer ')) {
      const token = authBasligi.split(' ')[1];
      const kullanici = await tokenIleKullaniciBul(token);
      if (kullanici) req.kullanici = kullanici;
    }
    next();
  } catch {
    next();
  }
}

export function rolKontrol(...izinliRoller: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.kullanici) {
      res.status(401).json({ basarili: false, mesaj: 'Kimlik doğrulama gerekli' });
      return;
    }
    if (!izinliRoller.includes(req.kullanici.rol)) {
      res.status(403).json({ basarili: false, mesaj: 'Bu işlem için yetkiniz yok' });
      return;
    }
    next();
  };
}
