import { Request, Response, NextFunction } from 'express';
import { ogrenciKayit, veliKayit, ogretmenKayit, kocKayit, girisYap, tokenYenile, cikisYap, sifremiUnuttumTalep, sifremiUnuttumOnayla } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';

export async function ogrenciKayitController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sonuc = await ogrenciKayit(req.body, req.platformTurleri);
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function veliKayitController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sonuc = await veliKayit(req.body);
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function ogretmenKayitController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sonuc = await ogretmenKayit(req.body, req.platformTurleri);
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function kocKayitController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Bireysel koç kaydı — tip gönderilmese de BIREYSEL kabul edilir
    const sonuc = await kocKayit({ ...req.body, tip: req.body?.tip || 'BIREYSEL' });
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

/** Kurumsal başvuru — süper admin onayı ile aktifleşir */
export async function kurumKayitController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sonuc = await kocKayit({ ...req.body, tip: 'KURUMSAL' });
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function girisController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, sifre } = req.body;
    const sonuc = await girisYap(email, sifre, req);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function tokenYenileController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const sonuc = await tokenYenile(refreshToken);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function cikisController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await cikisYap(req.kullanici!.userId);
    res.json({ basarili: true, mesaj: 'Çıkış yapıldı' });
  } catch (err) { next(err); }
}

export async function meGetir(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const kullanici = await prisma.kullanici.findUnique({
      where: { id: req.kullanici!.userId },
      include: {
        ogrenciProfil: {
          include: {
            veli: {
              include: {
                kullanici: { select: { email: true } },
              },
            },
            koc: {
              select: {
                id: true,
                ad: true,
                soyad: true,
                tip: true,
                kurumAdi: true,
                referansKod: true,
              },
            },
          },
        },
        veliProfil: {
          include: {
            ogrenciler: {
              include: {
                kullanici: { select: { email: true } },
              },
            },
          },
        },
        adminProfil: true,
        kocProfil: true,
      },
    });
    res.json({ basarili: true, veri: kullanici });
  } catch (err) { next(err); }
}

export async function sifremiUnuttumTalepController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    const sonuc = await sifremiUnuttumTalep(String(email || ''));
    res.json({ basarili: true, mesaj: sonuc.mesaj });
  } catch (err) { next(err); }
}

export async function sifremiUnuttumOnaylaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, kod, yeniSifre } = req.body as { email?: string; kod?: string; yeniSifre?: string };
    const sonuc = await sifremiUnuttumOnayla(String(email || ''), String(kod || ''), String(yeniSifre || ''));
    res.json({ basarili: true, mesaj: sonuc.mesaj });
  } catch (err) { next(err); }
}
