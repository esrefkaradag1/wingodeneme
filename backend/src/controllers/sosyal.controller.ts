import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  arkadaslikIstegi, arkadaslikYanit, arkadaslariGetir,
  gelenArkadaslikIstekleri,
  gelenDuelloDavetleri,
  puanKarsilastir, duelloBaslat, duelloYanit, duelloTamamla, kullaniciAra
} from '../services/sosyal.service';
import { prisma } from '../config/database';

async function ogrenciIdGetir(kullaniciId: string): Promise<string | null> {
  const profil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId }, select: { id: true } });
  return profil?.id || null;
}

export async function arkadasIstek(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const sonuc = await arkadaslikIstegi(ogrenciId, req.params.hedefId);
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function arkadasYanit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const sonuc = await arkadaslikYanit(req.params.id, ogrenciId, req.body.kabul);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function arkadaslariGetirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.json({ basarili: true, veri: [] }); return; }
    const arkadaslar = await arkadaslariGetir(ogrenciId);
    res.json({ basarili: true, veri: arkadaslar });
  } catch (err) { next(err); }
}

export async function gelenArkadaslikIstekleriController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.json({ basarili: true, veri: [] }); return; }
    const istekler = await gelenArkadaslikIstekleri(ogrenciId);
    res.json({ basarili: true, veri: istekler });
  } catch (err) { next(err); }
}

export async function puanKarsilastirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const karsilastirma = await puanKarsilastir(ogrenciId, req.params.arkadasId, req.query.sinavId as string);
    res.json({ basarili: true, veri: karsilastirma });
  } catch (err) { next(err); }
}

export async function duelloBaslatController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const duello = await duelloBaslat(ogrenciId, req.params.davetEdilenId, req.body.konuId);
    res.status(201).json({ basarili: true, veri: duello });
  } catch (err) { next(err); }
}

export async function duelloYanitController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const duello = await duelloYanit(req.params.id, ogrenciId, req.body.kabul);
    res.json({ basarili: true, veri: duello });
  } catch (err) { next(err); }
}

export async function gelenDuelloDavetleriController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.json({ basarili: true, veri: [] }); return; }
    const davetler = await gelenDuelloDavetleri(ogrenciId);
    res.json({ basarili: true, veri: davetler });
  } catch (err) { next(err); }
}

export async function duelloTamamlaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    if (!ogrenciId) { res.status(404).json({ basarili: false, mesaj: 'Profil bulunamadı' }); return; }
    const duello = await duelloTamamla(req.params.id, ogrenciId, req.body.puan);
    res.json({ basarili: true, veri: duello });
  } catch (err) { next(err); }
}

export async function kullaniciAraController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciId = await ogrenciIdGetir(req.kullanici!.userId);
    // Adminler profil olmasa da arama yapabilsin
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ basarili: false, mesaj: 'Arama terimi gereklidir' });
      return;
    }

    const sonuclar = await kullaniciAra(query, ogrenciId || '');
    res.json({ basarili: true, veri: sonuclar });
  } catch (err) { next(err); }
}
