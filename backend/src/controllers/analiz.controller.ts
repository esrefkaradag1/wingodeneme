import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ogrenciAnalizGetir, ulusalKarsilastirmaGetir } from '../services/analiz.service';
import { netSimulasyonHesapla } from '../services/rehber.service';
import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';

export async function ogrenciAnalizController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) { res.status(404).json({ basarili: false, mesaj: 'Öğrenci bulunamadı' }); return; }
    const platform = req.isKpssPlatform ? 'kpss' : 'yks';
    const analiz = await ogrenciAnalizGetir(ogrenciProfil.id, platform);
    res.json({ basarili: true, veri: analiz });
  } catch (err) { next(err); }
}

export async function ulusalKarsilastirmaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) { res.status(404).json({ basarili: false, mesaj: 'Öğrenci bulunamadı' }); return; }
    const karsilastirma = await ulusalKarsilastirmaGetir(req.params.sinavId, ogrenciProfil.id);
    res.json({ basarili: true, veri: karsilastirma });
  } catch (err) { next(err); }
}

/** Net artışına göre tahmini sıralama simülasyonu (rehber amaçlı) */
export async function netSimulasyonController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { siralama, ders, ekNet } = req.body as { siralama?: unknown; ders?: string; ekNet?: unknown };
    if (siralama === undefined || siralama === null || Number.isNaN(Number(siralama))) {
      throw new AppHatasi('Geçerli bir sıralama girin', 400);
    }
    if (ekNet === undefined || ekNet === null) {
      throw new AppHatasi('Ek net miktarı gerekli', 400);
    }
    const sonuc = netSimulasyonHesapla({
      siralama: Number(siralama),
      ders: typeof ders === 'string' && ders.length > 0 ? ders : 'Genel',
      ekNet: Number(ekNet),
    });
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

/** Öğrenciye özel video ve paket önerilerini getir */
export async function onerileriGetirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) { res.status(404).json({ basarili: false, mesaj: 'Öğrenci bulunamadı' }); return; }
    
    const { onerileriGetir } = require('../services/oneri.service');
    const oneriler = await onerileriGetir(ogrenciProfil.id);
    res.json({ basarili: true, veri: oneriler });
  } catch (err) { next(err); }
}
