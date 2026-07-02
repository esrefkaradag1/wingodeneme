import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { AppHatasi } from '../middlewares/hata.middleware';
import { prisma } from '../config/database';
import { parseSinavTuru } from '../utils/sinavTur';
import { parseIsoTarih } from '../utils/sinavZaman';
import {
  adminSinavTakvimListele,
  adminSinavTakvimOlustur,
  adminSinavTakvimGuncelle,
  adminSinavTakvimSil,
  ogrenciSinavTakvimListele,
  sinavSatinAlimOlustur,
  sinavSepetSatinAlimOlustur,
  parseFiyat,
  publicSinavTakvimListele,
} from '../services/sinav-takvim.service';

function parseYilAy(query: Record<string, unknown>) {
  const simdi = new Date();
  const yil = Math.max(2020, parseInt(String(query.yil || simdi.getFullYear()), 10) || simdi.getFullYear());
  const ay = Math.min(12, Math.max(1, parseInt(String(query.ay || simdi.getMonth() + 1), 10) || simdi.getMonth() + 1));
  return { yil, ay };
}

function govdeParse(req: AuthRequest) {
  const {
    baslik, aciklama, tur, grupId, baslangicZamani, bitisZamani, sureDakika,
    ucret, indirimliUcret, takvimdeGoster, satinAlinabilir, yayinlandi,
  } = req.body as Record<string, unknown>;

  const baslikNorm = typeof baslik === 'string' ? baslik.trim() : '';
  if (!baslikNorm) throw new Error('Sınav başlığı gerekli');
  if (!grupId || typeof grupId !== 'string' || !grupId.trim()) throw new Error('Grup seçimi gerekli');

  let turParsed;
  try {
    turParsed = parseSinavTuru(tur);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Geçersiz sınav türü');
  }

  const baslangic = parseIsoTarih(baslangicZamani, 'Başlangıç zamanı');
  const bitis = parseIsoTarih(bitisZamani, 'Bitiş zamanı');
  if (bitis.getTime() <= baslangic.getTime()) {
    throw new Error('Bitiş zamanı başlangıçtan sonra olmalı');
  }
  const sure = Math.max(1, parseInt(String(sureDakika ?? 120), 10) || 120);

  return {
    baslik: baslikNorm,
    aciklama: typeof aciklama === 'string' ? aciklama.trim() || null : null,
    tur: turParsed,
    grupId: grupId.trim(),
    baslangicZamani: baslangic,
    bitisZamani: bitis,
    sureDakika: sure,
    ucret: parseFiyat(ucret),
    indirimliUcret: parseFiyat(indirimliUcret),
    takvimdeGoster: takvimdeGoster !== false,
    satinAlinabilir: satinAlinabilir !== false,
    yayinlandi: yayinlandi !== false,
  };
}

export async function adminSinavTakvimListeleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { yil, ay } = parseYilAy(req.query as Record<string, unknown>);
    const veri = await adminSinavTakvimListele(yil, ay);
    res.json({ basarili: true, veri, meta: { yil, ay } });
  } catch (err) {
    next(err);
  }
}

function sinavTakvimHataYanit(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof AppHatasi) {
    res.status(err.statusKodu).json({ basarili: false, mesaj: err.mesaj });
    return;
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (
      msg.includes('ucret') ||
      msg.includes('takvimdeGoster') ||
      msg.includes('satinAlinabilir') ||
      msg.includes('Unknown argument')
    ) {
      res.status(400).json({
        basarili: false,
        mesaj:
          'Veritabanı güncel değil. Supabase SQL Editor\'da sınav takvimi migration sorgusunu çalıştırın (ucret, takvimdeGoster kolonları).',
      });
      return;
    }
    res.status(400).json({ basarili: false, mesaj: msg });
    return;
  }
  next(err);
}

export async function adminSinavTakvimOlusturController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = govdeParse(req);
    const grup = await prisma.grup.findUnique({ where: { id: veri.grupId }, select: { id: true } });
    if (!grup) {
      res.status(400).json({ basarili: false, mesaj: 'Seçilen grup bulunamadı' });
      return;
    }
    const sinav = await adminSinavTakvimOlustur(veri);
    res.status(201).json({ basarili: true, veri: sinav });
  } catch (err) {
    sinavTakvimHataYanit(err, res, next);
  }
}

export async function adminSinavTakvimGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const veri = govdeParse(req);
    const sinav = await adminSinavTakvimGuncelle(id, veri);
    res.json({ basarili: true, veri: sinav });
  } catch (err) {
    sinavTakvimHataYanit(err, res, next);
  }
}

export async function adminSinavTakvimSilController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminSinavTakvimSil(req.params.id);
    res.json({ basarili: true, mesaj: 'Sınav silindi' });
  } catch (err) {
    next(err);
  }
}

export async function ogrenciSinavTakvimListeleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { yil, ay } = parseYilAy(req.query as Record<string, unknown>);

    if (req.kullanici?.rol === 'OGRENCI') {
      const ogrenci = await prisma.ogrenciProfil.findUnique({
        where: { kullaniciId: req.kullanici.userId },
      });
      if (ogrenci) {
        const veri = await ogrenciSinavTakvimListele(ogrenci.id, req.kullanici.userId, yil, ay);
        res.json({ basarili: true, veri, meta: { yil, ay }, oturum: 'ogrenci' });
        return;
      }
    }

    const veri = await publicSinavTakvimListele(yil, ay);
    res.json({
      basarili: true,
      veri,
      meta: { yil, ay },
      oturum: req.kullanici ? 'misafir' : 'anonim',
    });
  } catch (err) {
    next(err);
  }
}

export async function publicSinavTakvimListeleController(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { yil, ay } = parseYilAy(_req.query as Record<string, unknown>);
    const veri = await publicSinavTakvimListele(yil, ay);
    res.json({ basarili: true, veri, meta: { yil, ay } });
  } catch (err) {
    next(err);
  }
}

export async function sinavSepetSatinAlController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = req.kullanici?.id;
    if (!uid) {
      res.status(401).json({ basarili: false, mesaj: 'Oturum gerekli' });
      return;
    }
    const { sinavIds, notlar } = req.body as Record<string, unknown>;
    if (!Array.isArray(sinavIds) || sinavIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'sinavIds dizisi gerekli' });
      return;
    }
    const ids = sinavIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    const sonuc = await sinavSepetSatinAlimOlustur(uid, ids, typeof notlar === 'string' ? notlar : undefined);
    res.status(201).json({ basarili: true, veri: sonuc });
  } catch (err) {
    next(err);
  }
}

export async function sinavSatinAlController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = req.kullanici?.id;
    if (!uid) {
      res.status(401).json({ basarili: false, mesaj: 'Oturum gerekli' });
      return;
    }
    const { notlar } = req.body as Record<string, unknown>;
    const olusturulan = await sinavSatinAlimOlustur(
      uid,
      req.params.id,
      typeof notlar === 'string' ? notlar : undefined
    );
    res.status(201).json({ basarili: true, veri: olusturulan });
  } catch (err) {
    next(err);
  }
}
