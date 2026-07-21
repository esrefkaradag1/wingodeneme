import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  sinavListesiGetir, sinavDetayGetir, sinavaKatil,
  cevapGonder, cevapTaslakKaydet, optikFormYukle
} from '../services/sinav.service';
import { prisma } from '../config/database';
import { s3DosyaYukle } from '../utils/s3';
import { denemeKarnesiGetir } from '../services/deneme-karnesi.service';
import { KatilimDurumu } from '@prisma/client';
import { SIRALAMA_HAVUZ_BOYUTU, tahminiSiralamaHesapla } from '../utils/tahminiSiralama';

export async function sinavListesiController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) { res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' }); return; }
    const sinavlar = await sinavListesiGetir(ogrenciProfil.id, req.isKpssPlatform === true);
    res.json({ basarili: true, veri: sinavlar });
  } catch (err) { next(err); }
}

export async function sinavDetayController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    const sinav = await sinavDetayGetir(req.params.id, ogrenciProfil?.id);
    res.json({ basarili: true, veri: sinav });
  } catch (err) { next(err); }
}

export async function sinavaKatilController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) { res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' }); return; }
    const sonuc = await sinavaKatil(req.params.id, ogrenciProfil.id);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function cevapGonderController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) { res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' }); return; }
    const sonuc = await cevapGonder(req.params.katilimId, req.body.cevaplar, ogrenciProfil.id);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function cevapTaslakKaydetController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) {
      res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' });
      return;
    }
    const cevaplar = Array.isArray(req.body?.cevaplar) ? req.body.cevaplar : [];
    const sonuc = await cevapTaslakKaydet(req.params.katilimId, cevaplar, ogrenciProfil.id);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) {
    next(err);
  }
}

export async function optikFormYukleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ basarili: false, mesaj: 'Dosya yüklenmedi' }); return; }
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) { res.status(404).json({ basarili: false, mesaj: 'Öğrenci bulunamadı' }); return; }

    const dosyaUrl = await s3DosyaYukle(req.file.buffer, req.file.originalname, req.file.mimetype, 'optik-formlar');
    const sonuc = await optikFormYukle(req.params.katilimId, dosyaUrl, ogrenciProfil.id);
    res.json({ basarili: true, veri: sonuc });
  } catch (err) { next(err); }
}

export async function sinavSonucController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) {
      res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' });
      return;
    }

    const katilim = await prisma.sinavKatilim.findUnique({
      where: { id: req.params.katilimId },
      include: {
        sinav: { select: { baslik: true, tur: true } },
        cevaplar: { include: { soru: { include: { konu: true } } } },
      },
    });
    if (!katilim) {
      res.status(404).json({ basarili: false, mesaj: 'Katılım bulunamadı' });
      return;
    }
    if (katilim.ogrenciId !== ogrenciProfil.id) {
      res.status(403).json({ basarili: false, mesaj: 'Bu sonuca erişim yetkiniz yok' });
      return;
    }

    const kazanimMap = new Map<
      string,
      {
        kazanim: string;
        ders: string;
        konu: string;
        toplam: number;
        dogru: number;
        yanlis: number;
        bos: number;
        yanlisSoruNo: number[];
      }
    >();

    for (const c of katilim.cevaplar) {
      const kazanim = (c.soru as any)?.kazanim as string | undefined;
      if (!kazanim || !kazanim.trim()) continue;

      const key = `${c.soru.konu.ders}::${c.soru.konu.ad}::${kazanim.trim()}`;
      const mevcut =
        kazanimMap.get(key) || {
          kazanim: kazanim.trim(),
          ders: c.soru.konu.ders,
          konu: c.soru.konu.ad,
          toplam: 0,
          dogru: 0,
          yanlis: 0,
          bos: 0,
          yanlisSoruNo: [],
        };

      mevcut.toplam += 1;
      if (c.dogru === true) mevcut.dogru += 1;
      else if (c.dogru === false) {
        mevcut.yanlis += 1;
        mevcut.yanlisSoruNo.push((c.soru as any)?.siraNo ?? 0);
      } else {
        mevcut.bos += 1;
      }

      kazanimMap.set(key, mevcut);
    }

    const kazanimAnalizi = Array.from(kazanimMap.values())
      .map((k) => ({
        ...k,
        basariYuzdesi: k.toplam > 0 ? parseFloat(((k.dogru / k.toplam) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.basariYuzdesi - b.basariYuzdesi);

    const sureKayitlari = katilim.cevaplar
      .map((c) => c.sureMs)
      .filter((ms): ms is number => ms != null && ms > 0);
    const toplamSureMs = sureKayitlari.reduce((a, b) => a + b, 0);
    const ortalamaSureMs =
      sureKayitlari.length > 0 ? Math.round(toplamSureMs / sureKayitlari.length) : null;

    const soruSureleri = katilim.cevaplar
      .map((c) => ({
        soruId: c.soruId,
        siraNo: c.soru.siraNo,
        ders: c.soru.konu.ders,
        konu: c.soru.konu.ad,
        sureMs: c.sureMs,
        dogru: c.dogru,
      }))
      .sort((a, b) => (b.sureMs ?? 0) - (a.sureMs ?? 0));

    const enYavasSorular = soruSureleri.filter((s) => s.sureMs != null && s.sureMs > 0).slice(0, 5);
    const enHizliSorular = [...soruSureleri]
      .filter((s) => s.sureMs != null && s.sureMs > 0)
      .sort((a, b) => (a.sureMs ?? 0) - (b.sureMs ?? 0))
      .slice(0, 5);

    const zamanAnalizi = {
      toplamSureMs,
      ortalamaSureMs,
      kayitliSoruSayisi: sureKayitlari.length,
      enYavasSorular,
      enHizliSorular,
      soruSureleri: soruSureleri.sort((a, b) => a.siraNo - b.siraNo),
    };

    // Bu denemeye ait konu özeti (kazanım boş olsa bile görünür)
    const konuMap = new Map<
      string,
      { ders: string; konu: string; toplam: number; dogru: number; yanlis: number; bos: number }
    >();
    for (const c of katilim.cevaplar) {
      const key = `${c.soru.konu.ders}::${c.soru.konu.ad}`;
      const mevcut = konuMap.get(key) || {
        ders: c.soru.konu.ders,
        konu: c.soru.konu.ad,
        toplam: 0,
        dogru: 0,
        yanlis: 0,
        bos: 0,
      };
      mevcut.toplam += 1;
      if (c.dogru === true) mevcut.dogru += 1;
      else if (c.dogru === false) mevcut.yanlis += 1;
      else mevcut.bos += 1;
      konuMap.set(key, mevcut);
    }
    const konuAnalizi = Array.from(konuMap.values())
      .filter((k) => k.dogru + k.yanlis > 0)
      .map((k) => ({
        ...k,
        basariYuzdesi: k.toplam > 0 ? parseFloat(((k.dogru / k.toplam) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.basariYuzdesi - b.basariYuzdesi);

    // Platform genelinde soru başarı oranları (bu soruyu çözenler arasında)
    const soruIds = katilim.cevaplar.map((c) => c.soruId);
    const soruBasariMap: Record<string, number> = {};
    if (soruIds.length > 0) {
      const gruplar = await prisma.ogrenciCevap.groupBy({
        by: ['soruId', 'dogru'],
        where: {
          soruId: { in: soruIds },
          katilim: { durum: 'TAMAMLANDI' },
        },
        _count: { _all: true },
      });
      const agg = new Map<string, { dogru: number; toplam: number }>();
      for (const g of gruplar) {
        const mevcut = agg.get(g.soruId) || { dogru: 0, toplam: 0 };
        mevcut.toplam += g._count._all;
        if (g.dogru === true) mevcut.dogru += g._count._all;
        agg.set(g.soruId, mevcut);
      }
      for (const [sid, v] of agg) {
        soruBasariMap[sid] = v.toplam > 0 ? parseFloat(((v.dogru / v.toplam) * 100).toFixed(1)) : 0;
      }
    }

    const cevaplarZengin = katilim.cevaplar.map((c) => ({
      ...c,
      platformBasariYuzdesi: soruBasariMap[c.soruId] ?? null,
    }));

    const cohort = await prisma.sinavKatilim.findMany({
      where: { sinavId: katilim.sinavId, durum: KatilimDurumu.TAMAMLANDI },
      select: { netPuan: true },
    });
    const tahminiSiralama = tahminiSiralamaHesapla(
      katilim.netPuan,
      cohort.map((c) => c.netPuan),
      SIRALAMA_HAVUZ_BOYUTU,
    );

    res.json({
      basarili: true,
      veri: {
        ...katilim,
        cevaplar: cevaplarZengin,
        kazanimAnalizi,
        konuAnalizi,
        zamanAnalizi,
        tahminiSiralama,
        /** UI’da gösterilecek ana sıra: 2000’lik tahmini */
        gosterilenSiralama: tahminiSiralama?.sira ?? katilim.ulusalSiralama,
        siralamaHavuz: SIRALAMA_HAVUZ_BOYUTU,
      },
    });
  } catch (err) { next(err); }
}

export async function denemeKarnesiController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) {
      res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' });
      return;
    }

    const katilim = await prisma.sinavKatilim.findUnique({
      where: { id: req.params.katilimId },
      select: { ogrenciId: true },
    });
    if (!katilim) {
      res.status(404).json({ basarili: false, mesaj: 'Katılım bulunamadı' });
      return;
    }
    if (katilim.ogrenciId !== ogrenciProfil.id) {
      res.status(403).json({ basarili: false, mesaj: 'Bu karneye erişim yetkiniz yok' });
      return;
    }

    const veri = await denemeKarnesiGetir(req.params.katilimId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function sinavKatilimlarimController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrenciProfil = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId: req.kullanici!.userId } });
    if (!ogrenciProfil) { res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' }); return; }

    const katilimlar = await prisma.sinavKatilim.findMany({
      where: { ogrenciId: ogrenciProfil.id },
      include: {
        sinav: { select: { id: true, baslik: true, tur: true, baslangicZamani: true } },
      },
      orderBy: { olusturuldu: 'desc' },
    });

    res.json({ basarili: true, veri: katilimlar });
  } catch (err) { next(err); }
}
