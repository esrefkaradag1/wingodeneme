import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { universiteAra, tahminHesapla, hedefEkle, hedeflerGetir, hedefSil } from '../services/universite.service';
import { prisma } from '../config/database';

async function ogrenciIdGetir(kullaniciId: string) {
  return prisma.ogrenciProfil.findUnique({ where: { kullaniciId }, select: { id: true } });
}

export async function araController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.set('Cache-Control', 'no-store');
    const q = (req.query.q as string) || '';
    const sehir = (req.query.sehir as string) || '';
    const universiteTuru = (req.query.universiteTuru as string) || '';
    const sinavTuru = (req.query.sinavTuru as string) || '';
    const minSiralama = Number.parseInt((req.query.minSiralama as string) || '', 10);
    const maxSiralama = Number.parseInt((req.query.maxSiralama as string) || '', 10);
    const minPuan = Number.parseFloat((req.query.minPuan as string) || '');
    const maxPuan = Number.parseFloat((req.query.maxPuan as string) || '');
    const sonuclar = await universiteAra(q, {
      ...(sehir ? { sehir } : {}),
      ...(universiteTuru ? { universiteTuru } : {}),
      ...(sinavTuru === 'TYT' || sinavTuru === 'AYT' || sinavTuru === 'LGS' ? { sinavTuru } : {}),
      ...(Number.isFinite(minSiralama) ? { minSiralama } : {}),
      ...(Number.isFinite(maxSiralama) ? { maxSiralama } : {}),
      ...(Number.isFinite(minPuan) ? { minPuan } : {}),
      ...(Number.isFinite(maxPuan) ? { maxPuan } : {}),
    });
    res.json({ basarili: true, veri: sonuclar });
  } catch (err) { next(err); }
}

export async function tahminController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await ogrenciIdGetir(req.kullanici!.userId);
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const { net, siralama } = req.query;
    const tahmin = await tahminHesapla(profil.id, parseFloat(net as string || '0'), parseInt(siralama as string || '0'));
    res.json({ basarili: true, veri: tahmin });
  } catch (err) { next(err); }
}

export async function hedefEkleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await ogrenciIdGetir(req.kullanici!.userId);
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const hedef = await hedefEkle(profil.id, req.body.bolumId, req.body.oncelik || 1);
    res.status(201).json({ basarili: true, veri: hedef });
  } catch (err) { next(err); }
}

export async function hedeflerGetirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await ogrenciIdGetir(req.kullanici!.userId);
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const hedefler = await hedeflerGetir(profil.id);
    res.json({ basarili: true, veri: hedefler });
  } catch (err) { next(err); }
}

export async function hedefSilController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await ogrenciIdGetir(req.kullanici!.userId);
    if (!profil) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const { bolumId } = req.params;
    await hedefSil(profil.id, bolumId);
    res.json({ basarili: true, mesaj: 'Hedef silindi' });
  } catch (err) { next(err); }
}
