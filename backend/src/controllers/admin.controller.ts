import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma, Rol, SoruOnayDurumu, SoruZorlugu, OgretimTuru, KullaniciAktiviteTuru } from '@prisma/client';
import { prisma, prismaInteraktifTransaction } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { cache } from '../config/redis';
import { aiSoruKaliteIsleme } from '../services/soruAiKalite';
import { soruUretimGarantiKatmani } from '../services/soruGarantiKatmani';
import { ensureGrupBankaSinavi } from '../utils/grupBankaSinavi';
import { validateUretilenSoruListesi } from '../utils/soruUretimDogrulama';
import { ogretmenIcinGrupTurlari, reqOgretmenKisit, ogretmenBransKayitNormalize, ogretmenBranslarByTurNormalize, ogretmenSoruIslemIzni, ogretmenSoruIdsIslemIzni, ogretmenKendiSorulariWhere } from '../services/ogretmenSinirlama';
import { grupOgretmenFiltreyeUygun } from '../utils/grupOgretimTuru';
import {
  normalizeSinavOturumlar,
  sinavZamanOzetFromOturumlar,
} from '../utils/sinavOturum';
import { parseSinavTuru, prismaSinavTuruHatasiMi } from '../utils/sinavTur';
import { parseIsoTarih } from '../utils/sinavZaman';
import { ogrenciProfilOgretimGirdisi } from '../utils/ogretimTuru';
import { sinavSureAnaliziGetir } from '../services/sinav.service';
import { denemeKarnesiGetir, sinavKatilimlariListele } from '../services/deneme-karnesi.service';
import { aktiviteKaydet } from '../services/kullaniciAktivite.service';
import { soruKullaniciOzetSelect } from '../utils/soruDuzenleyen';
import { konuIdListesiNormalize } from '../utils/soruKonuEtiket';
import {
  soruUygunGruplariKaydet,
  soruUygunGrupInclude,
  uygunGrupIdsNormalize,
} from '../utils/soruUygunGrup';

const ZORLUK_DEGERLERI: SoruZorlugu[] = ['KOLAY', 'ORTA', 'ZOR'];

function parseZorluk(z: unknown): SoruZorlugu {
  if (typeof z === 'string' && ZORLUK_DEGERLERI.includes(z as SoruZorlugu)) return z as SoruZorlugu;
  return 'ORTA';
}

/** Sınav formu: v2 { version:2, bolumler } veya eski [{ konuId, adet, bolumAdi?, ... }] */
function normalizeKonuDagilimi(raw: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!raw || typeof raw !== 'object') return Prisma.JsonNull;

  if (!Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (o.version === 2 && Array.isArray(o.bolumler)) {
      const bolumler: Array<{
        ad: string;
        altBolumler: Array<{
          ad: string;
          aciklama: string;
          soruBas: number | null;
          soruBit: number | null;
          satirlar: Array<{ konuId: string; adet: number }>;
        }>;
      }> = [];

      for (const bolumRaw of o.bolumler) {
        if (!bolumRaw || typeof bolumRaw !== 'object') continue;
        const b = bolumRaw as Record<string, unknown>;
        const altBolumler: (typeof bolumler)[number]['altBolumler'] = [];

        for (const altRaw of Array.isArray(b.altBolumler) ? b.altBolumler : []) {
          if (!altRaw || typeof altRaw !== 'object') continue;
          const alt = altRaw as Record<string, unknown>;
          const satirlar: Array<{ konuId: string; adet: number }> = [];

          for (const satirRaw of Array.isArray(alt.satirlar) ? alt.satirlar : []) {
            if (!satirRaw || typeof satirRaw !== 'object') continue;
            const satir = satirRaw as Record<string, unknown>;
            const konuId = typeof satir.konuId === 'string' ? satir.konuId.trim() : '';
            const adet = Math.max(0, Math.min(999, parseInt(String(satir.adet), 10) || 0));
            if (konuId && adet > 0) satirlar.push({ konuId, adet });
          }

          const soruBasRaw = alt.soruBas != null ? parseInt(String(alt.soruBas), 10) : NaN;
          const soruBitRaw = alt.soruBit != null ? parseInt(String(alt.soruBit), 10) : NaN;
          altBolumler.push({
            ad: typeof alt.ad === 'string' ? alt.ad.trim() : '',
            aciklama: typeof alt.aciklama === 'string' ? alt.aciklama.trim() : '',
            soruBas: Number.isFinite(soruBasRaw) ? soruBasRaw : null,
            soruBit: Number.isFinite(soruBitRaw) ? soruBitRaw : null,
            satirlar,
          });
        }

        bolumler.push({
          ad: typeof b.ad === 'string' ? b.ad.trim() : '',
          altBolumler: altBolumler.length > 0 ? altBolumler : [{ ad: '', aciklama: '', soruBas: null, soruBit: null, satirlar: [] }],
        });
      }

      return bolumler.length > 0 ? ({ version: 2, bolumler } as Prisma.InputJsonValue) : Prisma.JsonNull;
    }
    return Prisma.JsonNull;
  }

  const out: Array<{
    konuId: string;
    adet: number;
    bolumAdi?: string;
    altBolumAdi?: string;
    aciklama?: string;
    soruBas?: number;
    soruBit?: number;
  }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const konuId = typeof o.konuId === 'string' ? o.konuId : '';
    const adet = Math.max(0, Math.min(999, parseInt(String(o.adet), 10) || 0));
    const bolumAdi = typeof o.bolumAdi === 'string' ? o.bolumAdi.trim() : '';
    const altBolumAdi = typeof o.altBolumAdi === 'string' ? o.altBolumAdi.trim() : '';
    const aciklama = typeof o.aciklama === 'string' ? o.aciklama.trim() : '';
    const soruBasRaw = o.soruBas != null ? parseInt(String(o.soruBas), 10) : NaN;
    const soruBitRaw = o.soruBit != null ? parseInt(String(o.soruBit), 10) : NaN;
    if (konuId && adet > 0) {
      out.push({
        konuId,
        adet,
        ...(bolumAdi ? { bolumAdi } : {}),
        ...(altBolumAdi ? { altBolumAdi } : {}),
        ...(aciklama ? { aciklama } : {}),
        ...(Number.isFinite(soruBasRaw) ? { soruBas: soruBasRaw } : {}),
        ...(Number.isFinite(soruBitRaw) ? { soruBit: soruBitRaw } : {}),
      });
    }
  }
  return out.length > 0 ? out : Prisma.JsonNull;
}

function flatKonuDagilimSatirlari(raw: unknown): Array<{ konuId: string; adet: number }> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (o.version === 2 && Array.isArray(o.bolumler)) {
      const out: Array<{ konuId: string; adet: number }> = [];
      for (const bolumRaw of o.bolumler) {
        if (!bolumRaw || typeof bolumRaw !== 'object') continue;
        const altBolumler = (bolumRaw as Record<string, unknown>).altBolumler;
        if (!Array.isArray(altBolumler)) continue;
        for (const altRaw of altBolumler) {
          if (!altRaw || typeof altRaw !== 'object') continue;
          const satirlar = (altRaw as Record<string, unknown>).satirlar;
          if (!Array.isArray(satirlar)) continue;
          for (const satirRaw of satirlar) {
            if (!satirRaw || typeof satirRaw !== 'object') continue;
            const satir = satirRaw as Record<string, unknown>;
            const konuId = typeof satir.konuId === 'string' ? satir.konuId.trim() : '';
            const adet = Math.max(0, parseInt(String(satir.adet), 10) || 0);
            if (konuId && adet > 0) out.push({ konuId, adet });
          }
        }
      }
      return out;
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: Array<{ konuId: string; adet: number }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const konuId = typeof o.konuId === 'string' ? o.konuId.trim() : '';
    const adet = Math.max(0, parseInt(String(o.adet), 10) || 0);
    if (konuId && adet > 0) out.push({ konuId, adet });
  }
  return out;
}

export async function sinavlarListesiController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrKisit = await reqOgretmenKisit(req);
    const where = ogrKisit ? { grup: { tur: ogrKisit.ogretimTuru } } : {};

    const cacheKey = `admin:sinavlar:${ogrKisit?.ogretimTuru || 'ALL'}`;
    const cached = await cache.al<any[]>(cacheKey);
    if (cached) {
      res.json({ basarili: true, veri: cached });
      return;
    }

    const sinavlar = await prisma.sinav.findMany({
      where,
      orderBy: { olusturuldu: 'desc' },
      select: {
        id: true, baslik: true, tur: true, aktif: true, yayinlandi: true,
        olusturuldu: true, baslangicZamani: true, bitisZamani: true,
        ucret: true, indirimliUcret: true, satinAlinabilir: true, takvimdeGoster: true,
        grup: { select: { id: true, ad: true, tur: true } },
        _count: { select: { sorular: true, katilimlar: true, ogrenciAtamalari: true } },
      },
    });

    await cache.yaz(cacheKey, sinavlar, 30);
    res.json({ basarili: true, veri: sinavlar });
  } catch (err) { next(err); }
}

/** Sınav listesi Redis önbelleğini (tüm kademe anahtarları) temizler */
async function sinavListesiCacheTemizle(): Promise<void> {
  await cache.siliModeliyle('admin:sinavlar:*');
}

export async function sinavDetayAdminController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrKisit = await reqOgretmenKisit(req);
    const sinav = await prisma.sinav.findUnique({
      where: { id: req.params.id },
      include: {
        grup: true,
        sorular: {
          orderBy: { siraNo: 'asc' },
          include: { konu: { select: { ad: true, ders: true } } },
        },
      },
    });
    if (!sinav) {
      res.status(404).json({ basarili: false, mesaj: 'Sınav bulunamadı' });
      return;
    }

    if (ogrKisit && sinav.grup.tur !== ogrKisit.ogretimTuru) {
      res.status(403).json({ basarili: false, mesaj: 'Bu sınava erişim yetkiniz yok (kademe uyuşmazlığı).' });
      return;
    }

    res.json({ basarili: true, veri: sinav });
  } catch (err) { next(err); }
}

/** Eski backend imajlarında GET /sinavlar/:id yoksa yalnızca soru listesi için kullanılabilir */
export async function sinavSureAnaliziController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await sinavSureAnaliziGetir(req.params.sinavId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function sinavKatilimlariAdminController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await sinavKatilimlariListele(req.params.sinavId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function denemeKarnesiAdminController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await denemeKarnesiGetir(req.params.katilimId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function sinavSorulariAdminController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sinavId } = req.params;
    const varMi = await prisma.sinav.findUnique({ where: { id: sinavId }, select: { id: true } });
    if (!varMi) {
      res.status(404).json({ basarili: false, mesaj: 'Sınav bulunamadı' });
      return;
    }
    const sorular = await prisma.soru.findMany({
      where: { sinavId },
      orderBy: { siraNo: 'asc' },
      include: {
        konu: { select: { ad: true, ders: true } },
        duzenleyen: { select: soruKullaniciOzetSelect },
        olusturan: { select: soruKullaniciOzetSelect },
      },
    });
    res.json({ basarili: true, veri: sorular });
  } catch (err) { next(err); }
}

export async function sinavOlusturController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      baslik, aciklama, tur, grupId, baslangicZamani, bitisZamani, sureDakika,
      kitapcikBolumAdi, kitapcikTarihMetni, kitapcikUrl, konuDagilimi, oturumlar,
    } = req.body;
    const baslikNorm = typeof baslik === 'string' ? baslik.trim() : baslik != null ? String(baslik).trim() : '';
    if (!baslikNorm) {
      res.status(400).json({ basarili: false, mesaj: 'Sınav başlığı gerekli' });
      return;
    }
    if (!grupId || typeof grupId !== 'string' || !grupId.trim()) {
      res.status(400).json({ basarili: false, mesaj: 'Grup seçimi gerekli' });
      return;
    }

    let turParsed;
    try {
      turParsed = parseSinavTuru(tur);
    } catch (e) {
      res.status(400).json({ basarili: false, mesaj: e instanceof Error ? e.message : 'Geçersiz sınav türü' });
      return;
    }

    const oturumKayitlari = normalizeSinavOturumlar(oturumlar);
    let zaman;
    try {
      zaman =
        oturumKayitlari != null
          ? sinavZamanOzetFromOturumlar(oturumKayitlari)
          : {
              baslangicZamani: parseIsoTarih(baslangicZamani, 'Başlangıç zamanı'),
              bitisZamani: parseIsoTarih(bitisZamani, 'Bitiş zamanı'),
              sureDakika: Math.max(1, parseInt(String(sureDakika), 10) || 120),
            };
    } catch (e) {
      res.status(400).json({ basarili: false, mesaj: e instanceof Error ? e.message : 'Geçersiz tarih' });
      return;
    }

    const sinav = await prisma.sinav.create({
      data: {
        baslik: baslikNorm,
        aciklama: typeof aciklama === 'string' ? aciklama.trim() || null : null,
        tur: turParsed,
        grupId: grupId.trim(),
        baslangicZamani: zaman.baslangicZamani,
        bitisZamani: zaman.bitisZamani,
        sureDakika: zaman.sureDakika,
        kitapcikBolumAdi: typeof kitapcikBolumAdi === 'string' ? kitapcikBolumAdi.trim() || null : null,
        kitapcikTarihMetni: typeof kitapcikTarihMetni === 'string' ? kitapcikTarihMetni.trim() || null : null,
        kitapcikUrl: typeof kitapcikUrl === 'string' ? kitapcikUrl.trim() || null : null,
        konuDagilimi: normalizeKonuDagilimi(konuDagilimi),
        oturumlar: oturumKayitlari ?? Prisma.JsonNull,
      },
    });
    await sinavListesiCacheTemizle();
    res.status(201).json({ basarili: true, veri: sinav });
  } catch (err) {
    if (prismaSinavTuruHatasiMi(err)) {
      res.status(400).json({
        basarili: false,
        mesaj:
          'AYT+TYT sınav türü veritabanında tanımlı değil. Sunucuda migration çalıştırın: ALTER TYPE "SinavTuru" ADD VALUE IF NOT EXISTS \'AYT_TYT\';',
      });
      return;
    }
    next(err);
  }
}

export async function sinavGuncelleController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      baslik, aciklama, tur, grupId, baslangicZamani, bitisZamani, sureDakika, yayinlandi,
      kitapcikBolumAdi, kitapcikTarihMetni, kitapcikUrl, konuDagilimi, oturumlar,
    } = req.body;
    const baslikNorm =
      baslik === undefined
        ? undefined
        : typeof baslik === 'string'
          ? baslik.trim()
          : baslik != null
            ? String(baslik).trim()
            : '';
    if (baslikNorm !== undefined && !baslikNorm) {
      res.status(400).json({ basarili: false, mesaj: 'Sınav başlığı boş olamaz' });
      return;
    }

    const oturumKayitlari =
      oturumlar === undefined ? undefined : normalizeSinavOturumlar(oturumlar);
    const zaman =
      oturumKayitlari != null
        ? sinavZamanOzetFromOturumlar(oturumKayitlari)
        : null;

    let turParsed: ReturnType<typeof parseSinavTuru> | undefined;
    if (tur !== undefined) {
      try {
        turParsed = parseSinavTuru(tur);
      } catch (e) {
        res.status(400).json({ basarili: false, mesaj: e instanceof Error ? e.message : 'Geçersiz sınav türü' });
        return;
      }
    }

    const sinav = await prisma.sinav.update({
      where: { id: req.params.id },
      data: {
        ...(baslikNorm !== undefined ? { baslik: baslikNorm } : {}),
        aciklama: aciklama === undefined ? undefined : typeof aciklama === 'string' ? aciklama.trim() || null : null,
        ...(turParsed !== undefined ? { tur: turParsed } : {}),
        grupId: grupId === undefined ? undefined : typeof grupId === 'string' ? grupId.trim() : grupId,
        baslangicZamani: zaman
          ? zaman.baslangicZamani
          : baslangicZamani
            ? parseIsoTarih(baslangicZamani, 'Başlangıç zamanı')
            : undefined,
        bitisZamani: zaman
          ? zaman.bitisZamani
          : bitisZamani
            ? parseIsoTarih(bitisZamani, 'Bitiş zamanı')
            : undefined,
        sureDakika: zaman ? zaman.sureDakika : sureDakika,
        yayinlandi,
        kitapcikBolumAdi: kitapcikBolumAdi === undefined ? undefined : (typeof kitapcikBolumAdi === 'string' ? kitapcikBolumAdi.trim() || null : null),
        kitapcikTarihMetni: kitapcikTarihMetni === undefined ? undefined : (typeof kitapcikTarihMetni === 'string' ? kitapcikTarihMetni.trim() || null : null),
        kitapcikUrl: kitapcikUrl === undefined ? undefined : (typeof kitapcikUrl === 'string' ? kitapcikUrl.trim() || null : null),
        konuDagilimi: konuDagilimi === undefined ? undefined : normalizeKonuDagilimi(konuDagilimi),
        oturumlar:
          oturumlar === undefined
            ? undefined
            : oturumKayitlari != null
              ? oturumKayitlari
              : Prisma.JsonNull,
      },
    });
    await cache.sil(`sinav:${req.params.id}`);
    await sinavListesiCacheTemizle();
    res.json({ basarili: true, veri: sinav });
  } catch (err) {
    if (prismaSinavTuruHatasiMi(err)) {
      res.status(400).json({
        basarili: false,
        mesaj:
          'AYT+TYT sınav türü veritabanında tanımlı değil. Sunucuda migration çalıştırın: ALTER TYPE "SinavTuru" ADD VALUE IF NOT EXISTS \'AYT_TYT\';',
      });
      return;
    }
    next(err);
  }
}

export async function sinavSilController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.sinav.delete({ where: { id: req.params.id } });
    await sinavListesiCacheTemizle();
    res.json({ basarili: true, mesaj: 'Sınav silindi' });
  } catch (err) { next(err); }
}

export async function soruEkleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const kullaniciId = req.kullanici?.userId ?? null;
    const { konuId, siraNo, metinHtml, gorselUrl, secenekler, dogruCevap, zorluk, kazanim, aiUretildi, aiModeli, grupId: bodyGrupId, uygunGrupIds } = req.body as {
      konuId?: string;
      siraNo?: number;
      metinHtml?: string;
      gorselUrl?: string | null;
      secenekler?: unknown;
      dogruCevap?: string;
      zorluk?: unknown;
      kazanim?: string | null;
      aiUretildi?: boolean;
      aiModeli?: string;
      grupId?: string;
      uygunGrupIds?: string[];
    };
    let sinavId: string | null = req.params.id === 'pool' ? null : req.params.id;
    if (req.params.id === 'pool' && typeof bodyGrupId === 'string' && bodyGrupId.trim() !== '') {
      const bankaId = await ensureGrupBankaSinavi(bodyGrupId.trim());
      if (!bankaId) {
        res.status(404).json({ basarili: false, mesaj: 'Grup bulunamadı' });
        return;
      }
      sinavId = bankaId;
    }
    if (!konuId || typeof konuId !== 'string') {
      res.status(400).json({ basarili: false, mesaj: 'konuId gerekli' });
      return;
    }
    const z = parseZorluk(zorluk);
    const soru = await prisma.soru.create({
      data: {
        sinavId,
        konuId,
        siraNo: typeof siraNo === 'number' ? siraNo : parseInt(String(siraNo), 10) || 1,
        metinHtml: String(metinHtml ?? ''),
        gorselUrl: gorselUrl != null && gorselUrl !== '' ? String(gorselUrl) : null,
        secenekler: secenekler as Prisma.InputJsonValue,
        dogruCevap: String(dogruCevap ?? 'A'),
        zorluk: z,
        kazanim: kazanim != null && String(kazanim).length > 0 ? String(kazanim) : null,
        onayDurumu: SoruOnayDurumu.ONAYLANDI,
        ...(aiUretildi === true ? { aiUretildi: true } : {}),
        ...(typeof aiModeli === 'string' && aiModeli.length > 0 ? { aiModeli } : {}),
        ...(kullaniciId ? { olusturanId: kullaniciId, duzenleyenId: kullaniciId } : {}),
      },
    });
    if (uygunGrupIds !== undefined) {
      await soruUygunGruplariKaydet(soru.id, uygunGrupIds);
    }
    if (kullaniciId) {
      void aktiviteKaydet({
        kullaniciId,
        tur: KullaniciAktiviteTuru.SORU_OLUSTUR,
        aciklama: 'Manuel soru oluşturuldu',
        meta: { soruId: soru.id, konuId: soru.konuId },
      });
    }
    res.status(201).json({ basarili: true, veri: { id: soru.id, konuId: soru.konuId, siraNo: soru.siraNo } });
  } catch (err) { next(err); }
}

/** AI panelden birden fazla soruyu tek istekte, tek transaction ile bankaya kaydeder (500/yanıt hatası riskini azaltır) */
export async function soruBankaTopluController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const kullaniciId = req.kullanici?.userId ?? null;
    const { konuId, konuIds, zorluk, sinavId: bodySinavId, grupId: bodyGrupId, aiModeli, sorular } = req.body as {
      konuId?: string;
      konuIds?: string[];
      zorluk?: unknown;
      sinavId?: string | null;
      /** Sınav seçilmediyse bu gruba ait havuz sınavına yazılır */
      grupId?: string | null;
      aiModeli?: string;
      sorular?: Array<{
        metinHtml: string;
        gorselUrl?: string | null;
        secenekler: Record<string, string>;
        dogruCevap: string;
        kazanim?: string | null;
      }>;
    };

    const tumKonuIds = konuIdListesiNormalize(konuId, konuIds);
    if (tumKonuIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'En az bir konu seçin (konuId veya konuIds)' });
      return;
    }
    const primaryKonuId = tumKonuIds[0];
    if (!Array.isArray(sorular) || sorular.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'sorular dizisi boş olamaz' });
      return;
    }

    const ham = sorular.map((s) => ({
      metinHtml: s.metinHtml,
      secenekler: s.secenekler,
      dogruCevap: s.dogruCevap,
      kazanim: s.kazanim,
    }));
    const konu = await prisma.konu.findUnique({ where: { id: primaryKonuId } });
    if (!konu) {
      res.status(404).json({ basarili: false, mesaj: 'Konu bulunamadı' });
      return;
    }
    const secenekSayisi = konu.ogretimTuru === 'LGS' ? 4 : 5;
    const dogr = validateUretilenSoruListesi(ham, { secenekSayisi });
    if (!dogr.ok) {
      res.status(422).json({
        basarili: false,
        mesaj: 'Sorular doğrulamadan geçmedi (şıklar, doğru cevap veya metin eksik/hatalı).',
        hatalar: dogr.hatalar,
      });
      return;
    }

    const garanti = await soruUretimGarantiKatmani(dogr.sorular, konu.ders, {
      sikiDogrulama: true,
      hataYerineDuzelt: true,
    });
    const sonSorular = garanti.sorular;

    const kaliteGirdi = sonSorular.map((d) => ({
      metin: String(d.metinHtml ?? d.metin ?? ''),
      secenekler: d.secenekler,
      dogruCevap: d.dogruCevap,
    }));
    const kalite = await aiSoruKaliteIsleme(primaryKonuId, konu.ders, kaliteGirdi, garanti.garantiMeta);

    const z = parseZorluk(zorluk);
    let rawSinav: string | null = bodySinavId === undefined || bodySinavId === null || bodySinavId === '' || bodySinavId === 'pool'
      ? null
      : String(bodySinavId);

    const rawGrup = typeof bodyGrupId === 'string' && bodyGrupId.trim() !== '' ? bodyGrupId.trim() : null;
    if (!rawSinav && rawGrup) {
      const bankaId = await ensureGrupBankaSinavi(rawGrup);
      if (!bankaId) {
        res.status(404).json({ basarili: false, mesaj: 'Grup bulunamadı' });
        return;
      }
      rawSinav = bankaId;
    }

    // İstekte grup yoksa: konu türüyle eşleşen uygun grubun havuzu (frontend’den grupId gönderilmese bile)
    if (!rawSinav && !rawGrup) {
      const adaylar = await prisma.grup.findMany({
        where: { tur: konu.ogretimTuru },
        orderBy: { olusturuldu: 'asc' },
        select: { id: true, ad: true },
      });
      let hedefGrupId: string | null = null;
      if (adaylar.length === 1) {
        hedefGrupId = adaylar[0].id;
      } else if (adaylar.length > 1 && konu.ogretimTuru === 'YKS') {
        let anahtar: 'ayt' | 'tyt' | null = null;
        const seg = konu.yksSegment;
        if (seg != null && String(seg) !== 'TYT') anahtar = 'ayt';
        else if (String(seg) === 'TYT') anahtar = 'tyt';
        if (anahtar) {
          const lc = (s: string) => s.toLocaleLowerCase('tr-TR');
          const es = adaylar.find((g) => lc(g.ad).includes(anahtar!));
          if (es) hedefGrupId = es.id;
        }
      }
      if (hedefGrupId) {
        const bankaId = await ensureGrupBankaSinavi(hedefGrupId);
        if (bankaId) rawSinav = bankaId;
      }
    }

    if (rawSinav) {
      const sn = await prisma.sinav.findUnique({ where: { id: rawSinav } });
      if (!sn) {
        res.status(404).json({ basarili: false, mesaj: 'Sınav bulunamadı' });
        return;
      }
      if (rawGrup && sn.grupId !== rawGrup) {
        res.status(400).json({
          basarili: false,
          mesaj: 'Seçilen sınav, panelde seçili gruba ait değil. Grup veya «Sınava Ekle» seçimini kontrol edin.',
        });
        return;
      }
    }

    const modelEtiket = typeof aiModeli === 'string' && aiModeli.length > 0 ? aiModeli : null;

    const olusturulan = await prismaInteraktifTransaction(async (tx) => {
      const rows = [];
      for (let i = 0; i < sonSorular.length; i++) {
        const d = sonSorular[i];
        const s = sorular[i];
        const soru = await tx.soru.create({
          data: {
            konuId: primaryKonuId,
            sinavId: rawSinav,
            siraNo: i + 1,
            metinHtml: String(d.metinHtml ?? ''),
            gorselUrl: s.gorselUrl != null && s.gorselUrl !== '' ? String(s.gorselUrl) : null,
            secenekler: d.secenekler as Prisma.InputJsonValue,
            dogruCevap: d.dogruCevap,
            zorluk: z,
            kazanim: s.kazanim != null && String(s.kazanim).length > 0 ? String(s.kazanim) : null,
            aiUretildi: true,
            onayDurumu: kalite.onayDurumu,
            aiMeta: kalite.sorularMeta[i] as Prisma.InputJsonValue,
            ...(modelEtiket ? { aiModeli: modelEtiket } : {}),
            ...(kullaniciId ? { olusturanId: kullaniciId, duzenleyenId: kullaniciId } : {}),
          },
        });
        const ekIds = tumKonuIds.filter((id) => id !== primaryKonuId);
        if (ekIds.length) {
          await tx.soruKonuEtiket.createMany({
            data: ekIds.map((kid) => ({ soruId: soru.id, konuId: kid })),
            skipDuplicates: true,
          });
        }
        rows.push(soru);
      }
      return rows;
    });

    if (kullaniciId && olusturulan.length > 0) {
      void aktiviteKaydet({
        kullaniciId,
        tur: KullaniciAktiviteTuru.AI_SORU_URET,
        aciklama: `${olusturulan.length} soru bankaya kaydedildi`,
        meta: { adet: olusturulan.length, konuIds: tumKonuIds },
      });
    }

    res.status(201).json({
      basarili: true,
      veri: {
        adet: olusturulan.length,
        soruIdleri: olusturulan.map((x) => x.id),
        konuIds: tumKonuIds,
        kalite: { onayDurumu: kalite.onayDurumu, sorularMeta: kalite.sorularMeta },
      },
    });
  } catch (err) { next(err); }
}

/** AI / referans sonrası soru onayı (öğrenci sınavında yalnızca ONAYLANDI kullanılır) */
export async function soruOnayGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { onayDurumu } = req.body as { onayDurumu?: string };
    const izinli: SoruOnayDurumu[] = [
      SoruOnayDurumu.ONAY_BEKLIYOR,
      SoruOnayDurumu.ONAYLANDI,
      SoruOnayDurumu.REDDEDILDI,
    ];
    if (!onayDurumu || !izinli.includes(onayDurumu as SoruOnayDurumu)) {
      res.status(400).json({
        basarili: false,
        mesaj: 'Geçerli onayDurumu gerekli: ONAY_BEKLIYOR, ONAYLANDI, REDDEDILDI',
      });
      return;
    }
    const mevcut = await prisma.soru.findUnique({
      where: { id },
      select: {
        sinavId: true,
        olusturanId: true,
        duzenleyenId: true,
        konu: { select: { ders: true, ogretimTuru: true } },
      },
    });
    if (!mevcut) {
      res.status(404).json({ basarili: false, mesaj: 'Soru bulunamadı' });
      return;
    }
    const izin = await ogretmenSoruIslemIzni(req, mevcut);
    if (!izin.ok) {
      res.status(izin.status).json({ basarili: false, mesaj: izin.mesaj });
      return;
    }
    const soru = await prisma.soru.update({
      where: { id },
      data: { onayDurumu: onayDurumu as SoruOnayDurumu },
    });
    if (mevcut.sinavId) {
      await cache.sil(`sinav:${mevcut.sinavId}`);
    }
    res.json({ basarili: true, veri: soru });
  } catch (err) {
    next(err);
  }
}

/** Seçilen soruları gruba ait «Soru Bankası (Grup)» sınavına taşır (toplu) */
export async function soruGrubaTopluAtaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { soruIds, grupId } = req.body as { soruIds?: unknown; grupId?: unknown };
    if (!Array.isArray(soruIds) || soruIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'soruIds boş olamaz' });
      return;
    }
    if (typeof grupId !== 'string' || grupId.trim() === '') {
      res.status(400).json({ basarili: false, mesaj: 'grupId gerekli' });
      return;
    }
    const ids = [...new Set(soruIds.map((x) => String(x)).filter(Boolean))];
    if (ids.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'Geçerli soru id yok' });
      return;
    }

    const topluIzin = await ogretmenSoruIdsIslemIzni(req, ids);
    if (!topluIzin.ok) {
      res.status(topluIzin.status).json({ basarili: false, mesaj: topluIzin.mesaj });
      return;
    }

    const bankaId = await ensureGrupBankaSinavi(grupId.trim());
    if (!bankaId) {
      res.status(404).json({ basarili: false, mesaj: 'Grup bulunamadı' });
      return;
    }

    const bulunan = await prisma.soru.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (bulunan.length !== ids.length) {
      res.status(400).json({ basarili: false, mesaj: 'Bazı sorular bulunamadı' });
      return;
    }

    const maxSira = await prisma.soru.aggregate({
      where: { sinavId: bankaId },
      _max: { siraNo: true },
    });
    let next = (maxSira._max.siraNo ?? 0) + 1;

    await prisma.$transaction(
      ids.map((id) => {
        const sira = next++;
        return prisma.soru.update({
          where: { id },
          data: { sinavId: bankaId, siraNo: sira },
        });
      })
    );

    res.json({ basarili: true, veri: { adet: ids.length, sinavId: bankaId } });
  } catch (err) { next(err); }
}

export async function kullanicilarListesiController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.kullanici?.rol === 'TEACHER') {
      res.status(403).json({ basarili: false, mesaj: 'Kullanıcı listesine erişim yetkiniz yok.' });
      return;
    }

    const sayfa = parseInt(req.query.sayfa as string || '1');
    const sayfaBoyutu = parseInt(req.query.boyut as string || '20');
    const atla = (sayfa - 1) * sayfaBoyutu;

    const rolParam = typeof req.query.rol === 'string' ? req.query.rol.trim() : '';
    const rolFiltre: Rol | null =
      ['OGRENCI', 'VELI', 'ADMIN', 'SUPER_ADMIN'].includes(rolParam) ? (rolParam as Rol) : null;

    const qRaw = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const whereParcalari: Prisma.KullaniciWhereInput[] = [];
    if (rolFiltre) whereParcalari.push({ rol: rolFiltre });
    if (qRaw) {
      const kelimeler = qRaw.split(/\s+/).filter(Boolean);
      if (kelimeler.length >= 2) {
        whereParcalari.push({
          AND: kelimeler.map((kelime) => ({
            OR: [
              { email: { contains: kelime, mode: 'insensitive' } },
              { ogrenciProfil: { is: { ad: { contains: kelime, mode: 'insensitive' } } } },
              { ogrenciProfil: { is: { soyad: { contains: kelime, mode: 'insensitive' } } } },
              { veliProfil: { is: { ad: { contains: kelime, mode: 'insensitive' } } } },
              { veliProfil: { is: { soyad: { contains: kelime, mode: 'insensitive' } } } },
              { adminProfil: { is: { ad: { contains: kelime, mode: 'insensitive' } } } },
              { adminProfil: { is: { soyad: { contains: kelime, mode: 'insensitive' } } } },
            ],
          })),
        });
      } else {
        whereParcalari.push({
          OR: [
            { email: { contains: qRaw, mode: 'insensitive' } },
            { ogrenciProfil: { is: { ad: { contains: qRaw, mode: 'insensitive' } } } },
            { ogrenciProfil: { is: { soyad: { contains: qRaw, mode: 'insensitive' } } } },
            { veliProfil: { is: { ad: { contains: qRaw, mode: 'insensitive' } } } },
            { veliProfil: { is: { soyad: { contains: qRaw, mode: 'insensitive' } } } },
            { adminProfil: { is: { ad: { contains: qRaw, mode: 'insensitive' } } } },
            { adminProfil: { is: { soyad: { contains: qRaw, mode: 'insensitive' } } } },
          ],
        });
      }
    }
    const where: Prisma.KullaniciWhereInput =
      whereParcalari.length === 0
        ? {}
        : whereParcalari.length === 1
          ? whereParcalari[0]!
          : { AND: whereParcalari };

    const [kullanicilar, toplam] = await Promise.all([
      prisma.kullanici.findMany({
        where,
        skip: atla,
        take: sayfaBoyutu,
        include: {
          ogrenciProfil: {
            include: {
              veli: {
                include: {
                  kullanici: { select: { id: true, email: true } },
                },
              },
            },
          },
          veliProfil: {
            include: {
              ogrenciler: {
                include: {
                  kullanici: { select: { id: true, email: true } },
                },
              },
            },
          },
          adminProfil: true,
        },
        orderBy: { olusturuldu: 'desc' },
      }),
      prisma.kullanici.count({ where }),
    ]);

    res.json({
      basarili: true,
      veri: kullanicilar,
      meta: { sayfa, sayfaBoyutu, toplam, toplamSayfa: Math.ceil(toplam / sayfaBoyutu) || 1 },
    });
  } catch (err) { next(err); }
}

export async function genelAnalizController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const simdiMs = Date.now();
    const gun7 = new Date(simdiMs - 7 * 24 * 60 * 60 * 1000);
    const gun14 = new Date(simdiMs - 14 * 24 * 60 * 60 * 1000);

    const [
      toplamKullanici,
      toplamSinav,
      toplamKatilim,
      aktifSinavlar,
      toplamKatilimKaydi,
      bekleyenKatilim,
      devamEdenKatilim,
    ] = await Promise.all([
      prisma.kullanici.count({ where: { rol: 'OGRENCI' } }),
      prisma.sinav.count(),
      prisma.sinavKatilim.count({ where: { durum: 'TAMAMLANDI' } }),
      prisma.sinav.count({ where: { aktif: true } }),
      prisma.sinavKatilim.count(),
      prisma.sinavKatilim.count({ where: { durum: 'BEKLIYOR' } }),
      prisma.sinavKatilim.count({ where: { durum: 'DEVAM_EDIYOR' } }),
    ]);

    const [
      netAgg,
      cevapToplamlari,
      sonGunTamamlanan,
      netGunluk,
      enIyiBes,
      yaklasanSinavlar,
    ] = await Promise.all([
      prisma.sinavKatilim.aggregate({
        where: { durum: 'TAMAMLANDI' },
        _avg: { netPuan: true },
      }),
      prisma.sinavKatilim.aggregate({
        where: { durum: 'TAMAMLANDI' },
        _sum: { dogruSayisi: true, yanlisSayisi: true, bosSayisi: true },
      }),
      prisma.sinavKatilim.findMany({
        where: { durum: 'TAMAMLANDI', guncellendi: { gte: gun7 } },
        select: { guncellendi: true },
      }),
      prisma.sinavKatilim.findMany({
        where: { durum: 'TAMAMLANDI', guncellendi: { gte: gun14 } },
        select: { netPuan: true, guncellendi: true },
      }),
      prisma.sinavKatilim.findMany({
        where: { durum: 'TAMAMLANDI' },
        orderBy: { netPuan: 'desc' },
        take: 5,
        select: {
          netPuan: true,
          hamPuan: true,
          sinav: { select: { baslik: true, id: true } },
          ogrenci: { select: { ad: true, soyad: true, avatarUrl: true } },
        },
      }),
      prisma.sinav.findMany({
        where: { yayinlandi: true, bitisZamani: { gte: new Date() } },
        orderBy: { baslangicZamani: 'asc' },
        take: 5,
        select: { id: true, baslik: true, baslangicZamani: true, bitisZamani: true, aktif: true },
      }),
    ]);

    const gunMap = new Map<string, number>();
    for (const r of sonGunTamamlanan) {
      const k = r.guncellendi.toISOString().slice(0, 10);
      gunMap.set(k, (gunMap.get(k) || 0) + 1);
    }

    const sonHaftaGunluk: { tarih: string; katilim: number; etiket: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(simdiMs - i * 86400000);
      const tarih = d.toISOString().slice(0, 10);
      const etiket = d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
      sonHaftaGunluk.push({ tarih, katilim: gunMap.get(tarih) || 0, etiket });
    }

    const netMap = new Map<string, { toplam: number; n: number }>();
    for (const r of netGunluk) {
      const k = r.guncellendi.toISOString().slice(0, 10);
      const cur = netMap.get(k) || { toplam: 0, n: 0 };
      cur.toplam += r.netPuan;
      cur.n += 1;
      netMap.set(k, cur);
    }

    const sonOnDortGunOrtalamaNet: { tarih: string; ortNet: number; etiket: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(simdiMs - i * 86400000);
      const tarih = d.toISOString().slice(0, 10);
      const cur = netMap.get(tarih);
      const ortNet =
        cur && cur.n > 0 ? Math.round((cur.toplam / cur.n) * 10) / 10 : 0;
      const etiket = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      sonOnDortGunOrtalamaNet.push({ tarih, ortNet, etiket });
    }

    const dTop = cevapToplamlari._sum.dogruSayisi ?? 0;
    const yTop = cevapToplamlari._sum.yanlisSayisi ?? 0;
    const bTop = cevapToplamlari._sum.bosSayisi ?? 0;
    const soruToplam = dTop + yTop + bTop;
    const ortalamaDogruYuzdesi =
      soruToplam > 0 ? Math.round((dTop / soruToplam) * 1000) / 10 : 0;

    const ortN = netAgg._avg.netPuan;
    const ortalamaNet = ortN != null ? Math.round(ortN * 10) / 10 : 0;

    const legacyChart = sonHaftaGunluk.map((g) => ({
      olusturuldu: g.etiket,
      _count: g.katilim,
    }));

    res.json({
      basarili: true,
      veri: {
        toplamKullanici,
        toplamSinav,
        toplamKatilim,
        aktifSinavlar,
        toplamKatilimKaydi,
        bekleyenKatilim,
        devamEdenKatilim,
        ortalamaNet,
        ortalamaDogruYuzdesi,
        sonHaftaGunluk,
        sonOnDortGunOrtalamaNet,
        enIyiBes,
        yaklasanSinavlar,
        enIyiPerformanslar: enIyiBes,
        sonHaftaKatilimlar: legacyChart,
      },
    });
  } catch (err) { next(err); }
}

export async function gruplarController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrKisit = await reqOgretmenKisit(req);
    const turFiltre = ogretmenIcinGrupTurlari(ogrKisit);
    const cacheKey = `admin:gruplar:${turFiltre ? [...turFiltre].sort().join(',') : 'ALL'}`;
    const cached = await cache.al<any[]>(cacheKey);
    if (cached) {
      res.json({ basarili: true, veri: cached });
      return;
    }

    const gruplar = await prisma.grup.findMany({
      where: { aktif: true },
      select: {
        id: true,
        ad: true,
        tur: true,
        aciklama: true,
        aktif: true,
        olusturuldu: true,
        parentId: true,
        _count: { select: { uyeler: true, sinavlar: true, children: true } },
        sinavlar: {
          select: {
            _count: { select: { sorular: true } },
          },
        },
      },
      orderBy: [{ tur: 'asc' }, { ad: 'asc' }],
    }) as any[];

    const filtreli = turFiltre
      ? gruplar.filter((g: any) => grupOgretmenFiltreyeUygun(g, turFiltre))
      : gruplar;

    const aktifIdSet = new Set(filtreli.map((g: { id: string }) => g.id));
    const bagli = filtreli.filter(
      (g: { parentId?: string | null }) => !g.parentId || aktifIdSet.has(g.parentId)
    );

    const veri = bagli.map((g: any) => {
      const soruSayisi = (g.sinavlar || []).reduce((t: number, s: any) => t + (s._count?.sorular || 0), 0);
      const { sinavlar: _s, ...rest } = g;
      return { ...rest, soruSayisi };
    });

    await cache.yaz(cacheKey, veri, 30);
    res.json({ basarili: true, veri });
  } catch (err) { next(err); }
}

/** Kademeye göre gruplanmış benzersiz branş isimleri (öğretmen formu için) */
export async function grupBransSecenekleriController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = 'admin:gruplar:brans-secenekleri';
    const cached = await cache.al<Record<string, string[]>>(cacheKey);
    if (cached) {
      res.json({ basarili: true, veri: cached });
      return;
    }

    const gruplar = await prisma.grup.findMany({
      where: { aktif: true },
      select: { ad: true, tur: true, parentId: true },
      orderBy: { ad: 'asc' },
    });

    // Grup isimlerini kademeye göre grupla, aynı isimleri deduplicate et
    const harita: Record<string, Set<string>> = {};

    for (const g of gruplar) {
      // Her grubun etkin kademesini belirle
      const tur = g.tur;
      if (!harita[tur]) harita[tur] = new Set();

      // Yalnızca alt grup (leaf) olanları branş olarak ekle;
      // üst seviye (parent) olan kademe başlıkları zaten tüm alt grupların tur'unu taşır
      // Bir grubun alt grupları varsa, grubun kendi adı kademe başlığıdır (örn. "YKS", "LGS")
      // Sadece parent olmayan (leaf) grupların adını branş olarak al
      // AMA parentId'si olmayan üst seviye gruplar kademe başlığıdır, branş değil
      // ParentId'si olan her grup bir branştır
      if (g.parentId) {
        harita[tur].add(g.ad);
      }
    }

    // Set'leri sıralı diziye dönüştür
    const veri: Record<string, string[]> = {};
    for (const [tur, set] of Object.entries(harita)) {
      veri[tur] = [...set].sort((a, b) => a.localeCompare(b, 'tr'));
    }

    await cache.yaz(cacheKey, veri, 120); // 2 dakika cache
    res.json({ basarili: true, veri });
  } catch (err) { next(err); }
}

export async function grupOlusturController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ad, tur, aciklama, parentId } = req.body;
    if (!ad || !tur) {
      res.status(400).json({ basarili: false, mesaj: 'ad ve tur zorunludur' });
      return;
    }
    if (!OGRETIM_DEGERLERI.includes(tur as OgretimTuru)) {
      res.status(400).json({ basarili: false, mesaj: 'Geçersiz öğretim türü' });
      return;
    }
    const grup = await prisma.grup.create({ 
      data: { 
        ad, 
        tur, 
        aciklama: aciklama || '',
        parentId: parentId || null 
      } as any
    });
    await cache.siliModeliyle('admin:gruplar:*');
    res.status(201).json({ basarili: true, veri: grup });
  } catch (err) { next(err); }
}

export async function grupGuncelleController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ad, tur, aciklama, aktif, parentId } = req.body;
    const data: Record<string, unknown> = {};
    if (ad !== undefined) data.ad = ad;
    if (aciklama !== undefined) data.aciklama = aciklama;
    if (aktif !== undefined) data.aktif = aktif;
    if (parentId !== undefined) data.parentId = parentId || null;
    if (tur !== undefined) {
      if (!OGRETIM_DEGERLERI.includes(tur as OgretimTuru)) {
        res.status(400).json({ basarili: false, mesaj: 'Geçersiz öğretim türü' });
        return;
      }
      data.tur = tur;
    }
    const grup = await prisma.grup.update({
      where: { id: req.params.id },
      data: data as any,
    });
    await cache.siliModeliyle('admin:gruplar:*');
    res.json({ basarili: true, veri: grup });
  } catch (err) { next(err); }
}

async function pasiflestirGrupAgaci(grupId: string): Promise<void> {
  await prisma.grup.update({ where: { id: grupId }, data: { aktif: false } });
  const cocuklar = await prisma.grup.findMany({
    where: { parentId: grupId },
    select: { id: true },
  });
  for (const c of cocuklar) {
    await pasiflestirGrupAgaci(c.id);
  }
}

export async function grupSilController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id;
    const [altSay, sinavSay] = await Promise.all([
      prisma.grup.count({ where: { parentId: id } }),
      prisma.sinav.count({ where: { grupId: id } }),
    ]);

    if (altSay > 0 || sinavSay > 0) {
      await pasiflestirGrupAgaci(id);
      await cache.siliModeliyle('admin:gruplar:*');
      res.json({ basarili: true, mesaj: 'Grup pasife alındı' });
      return;
    }

    await prisma.grup.delete({ where: { id } });
    await cache.siliModeliyle('admin:gruplar:*');
    res.json({ basarili: true, mesaj: 'Grup silindi' });
  } catch (err) { next(err); }
}

export async function grupUyeleriController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uyeler = await prisma.grupUyelik.findMany({
      where: { grupId: req.params.id },
      include: {
        ogrenci: {
          select: {
            id: true, ad: true, soyad: true, okul: true, sinif: true,
            kullanici: { select: { email: true } },
          },
        },
      },
      orderBy: { katilimTarih: 'desc' },
    });
    res.json({ basarili: true, veri: uyeler });
  } catch (err) { next(err); }
}

const OGRETIM_DEGERLERI: OgretimTuru[] = [
  'YKS',
  'LGS',
  'KPSS',
  'KPSS_LISANS',
  'KPSS_ORTAOGRETIM',
  'KPSS_ONLISANS',
  'SINIF_6',
  'SINIF_7',
  'SINIF_10',
  'SINIF_11',
];

function parseOgretimAdmin(v: unknown): OgretimTuru {
  if (typeof v === 'string' && OGRETIM_DEGERLERI.includes(v as OgretimTuru)) return v as OgretimTuru;
  return 'YKS';
}

/** Öğretmen kademesi: YKS/LGS/KPSS */
function parseOgretimKademe(v: unknown): OgretimTuru {
  const s = String(v || '').trim().toUpperCase();
  if (s === 'LGS') return 'LGS';
  if (s === 'KPSS_LISANS') return 'KPSS_LISANS';
  if (s === 'KPSS_ONLISANS') return 'KPSS_ONLISANS';
  if (s === 'KPSS_ORTAOGRETIM') return 'KPSS_ORTAOGRETIM';
  if (s === 'KPSS') return 'KPSS_LISANS';
  return 'YKS';
}

function parseOgretimTurleri(v: unknown): OgretimTuru[] | null {
  if (!Array.isArray(v)) return null;
  const out = [...new Set(v.map((x) => parseOgretimKademe(x)))];
  return out.length > 0 ? out : null;
}

async function ogrenciBaglantisiniTemizle(tx: Prisma.TransactionClient, ogrenciProfilId: string): Promise<void> {
  const katilimlar = await tx.sinavKatilim.findMany({
    where: { ogrenciId: ogrenciProfilId },
    select: { id: true },
  });
  const kid = katilimlar.map((k) => k.id);
  if (kid.length > 0) {
    await tx.ogrenciCevap.deleteMany({ where: { katilimId: { in: kid } } });
  }
  await tx.sinavKatilim.deleteMany({ where: { ogrenciId: ogrenciProfilId } });
  await tx.grupUyelik.deleteMany({ where: { ogrenciId: ogrenciProfilId } });
  await tx.konuPerformansi.deleteMany({ where: { ogrenciId: ogrenciProfilId } });
  await tx.aIAnaliz.deleteMany({ where: { ogrenciId: ogrenciProfilId } });
  const planlar = await tx.studyPlan.findMany({
    where: { ogrenciId: ogrenciProfilId },
    select: { id: true },
  });
  const pids = planlar.map((p) => p.id);
  if (pids.length > 0) {
    await tx.studyGorev.deleteMany({ where: { planId: { in: pids } } });
  }
  await tx.studyPlan.deleteMany({ where: { ogrenciId: ogrenciProfilId } });
  await tx.arkadaslik.deleteMany({
    where: { OR: [{ ogrenciId: ogrenciProfilId }, { arkadasId: ogrenciProfilId }] },
  });
  await tx.duello.deleteMany({
    where: { OR: [{ davetedenId: ogrenciProfilId }, { davetEdilenId: ogrenciProfilId }] },
  });
  await tx.universiteHedef.deleteMany({ where: { ogrenciId: ogrenciProfilId } });
}

const kullaniciIliskiInclude = {
  ogrenciProfil: {
    include: {
      veli: {
        include: {
          kullanici: { select: { id: true, email: true } },
        },
      },
    },
  },
  veliProfil: {
    include: {
      ogrenciler: {
        include: {
          kullanici: { select: { id: true, email: true } },
        },
      },
    },
  },
  adminProfil: {
    include: {
      ogretmenGruplari: { include: { grup: { select: { id: true, ad: true, tur: true } } } },
    },
  },
} as const;

async function ogrenciVeliEslestirTx(
  tx: Prisma.TransactionClient,
  ogrenciProfilId: string,
  veliProfilId: string,
) {
  const op = await tx.ogrenciProfil.findUnique({ where: { id: ogrenciProfilId } });
  if (!op) throw new AppHatasi('Öğrenci profili bulunamadı', 404);
  if (op.veliId && op.veliId !== veliProfilId) {
    throw new AppHatasi('Bu öğrenci başka bir veli hesabına bağlı', 409);
  }
  if (op.veliId === veliProfilId) return;
  await tx.ogrenciProfil.update({
    where: { id: ogrenciProfilId },
    data: { veliId: veliProfilId },
  });
}

async function ogrenciVeliEslestirEmailTx(
  tx: Prisma.TransactionClient,
  veliProfilId: string,
  ogrenciEmail: string,
) {
  const emailNorm = ogrenciEmail.trim().toLowerCase();
  if (!emailNorm) throw new AppHatasi('Öğrenci e-postası gerekli', 400);
  const ogrenciKu = await tx.kullanici.findFirst({
    where: { email: { equals: emailNorm, mode: 'insensitive' } },
    include: { ogrenciProfil: true },
  });
  if (!ogrenciKu || ogrenciKu.rol !== Rol.OGRENCI || !ogrenciKu.ogrenciProfil) {
    throw new AppHatasi('Bu e-posta kayıtlı bir öğrenci hesabına ait değil', 400);
  }
  await ogrenciVeliEslestirTx(tx, ogrenciKu.ogrenciProfil.id, veliProfilId);
}

async function veliProfilEmailBulTx(tx: Prisma.TransactionClient, veliEmail: string) {
  const veliNorm = veliEmail.trim().toLowerCase();
  if (!veliNorm) return null;
  const veliKu = await tx.kullanici.findFirst({
    where: {
      email: { equals: veliNorm, mode: 'insensitive' },
      rol: Rol.VELI,
    },
    include: { veliProfil: true },
  });
  if (!veliKu?.veliProfil) {
    throw new AppHatasi('Veli e-postası kayıtlı bir veli hesabına ait değil', 400);
  }
  return veliKu.veliProfil;
}

export async function kullaniciOlusturAdminController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = req.kullanici;
    if (!caller) {
      res.status(401).json({ basarili: false, mesaj: 'Yetkisiz' });
      return;
    }
    const { email, sifre, rol, ad, soyad, telefon, ogretimTuru, ogretimTurleri, branslarByTur, okul, sinif, brans, branslar, veliEmail, grupIds } =
      req.body as Record<string, unknown>;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ basarili: false, mesaj: 'Geçerli e-posta gerekli' });
      return;
    }
    if (!sifre || typeof sifre !== 'string' || sifre.length < 6) {
      res.status(400).json({ basarili: false, mesaj: 'Şifre en az 6 karakter olmalı' });
      return;
    }
    if (!ad || !soyad || typeof ad !== 'string' || typeof soyad !== 'string') {
      res.status(400).json({ basarili: false, mesaj: 'Ad ve soyad zorunludur' });
      return;
    }
    const rolStr = typeof rol === 'string' ? rol : 'OGRENCI';
    const izinliRol: Rol[] = [Rol.OGRENCI, Rol.VELI, Rol.TEACHER, Rol.ADMIN, Rol.SUPER_ADMIN];
    if (!izinliRol.includes(rolStr as Rol)) {
      res.status(400).json({ basarili: false, mesaj: 'Geçersiz rol' });
      return;
    }
    const rolVal = rolStr as Rol;
    if (rolVal === Rol.SUPER_ADMIN && caller.rol !== Rol.SUPER_ADMIN) {
      res.status(403).json({ basarili: false, mesaj: 'Sadece süper yönetici bu rolü atayabilir' });
      return;
    }

    const emailNorm = email.trim().toLowerCase();
    const dup = await prisma.kullanici.findFirst({
      where: { email: { equals: emailNorm, mode: 'insensitive' } },
    });
    if (dup) {
      res.status(409).json({ basarili: false, mesaj: 'Bu e-posta zaten kayıtlı' });
      return;
    }

    const hash = await bcrypt.hash(sifre, 12);
    const tel = typeof telefon === 'string' && telefon.trim() ? telefon.trim() : null;
    const ogrenciOgretim = ogrenciProfilOgretimGirdisi({ sinif, ogretimTuru });
    const turler = parseOgretimTurleri(ogretimTurleri) ?? null;
    const ogretimOgretmen = ogretimTuru !== undefined ? parseOgretimKademe(ogretimTuru) : (turler?.[0] ?? parseOgretimKademe(ogretimTuru));

    const yeni = await prismaInteraktifTransaction(async (tx) => {
      if (rolVal === Rol.OGRENCI) {
        const ku = await tx.kullanici.create({
          data: {
            email: emailNorm,
            sifre: hash,
            telefon: tel,
            rol: Rol.OGRENCI,
            ogrenciProfil: {
              create: {
                ad: ad.trim(),
                soyad: soyad.trim(),
                okul: typeof okul === 'string' && okul.trim() ? okul.trim() : null,
                sinif: ogrenciOgretim.sinif,
                ogretimTuru: ogrenciOgretim.ogretimTuru,
              },
            },
          },
          include: {
          ogrenciProfil: {
            include: {
              veli: {
                include: {
                  kullanici: { select: { id: true, email: true } },
                },
              },
            },
          },
          veliProfil: {
            include: {
              ogrenciler: {
                include: {
                  kullanici: { select: { id: true, email: true } },
                },
              },
            },
          },
          adminProfil: true,
        },
        });
        const grup = await tx.grup.findFirst({ where: { tur: ogrenciOgretim.ogretimTuru, aktif: true } });
        if (grup && ku.ogrenciProfil) {
          await tx.grupUyelik.create({
            data: { grupId: grup.id, ogrenciId: ku.ogrenciProfil.id },
          });
        }
        if (typeof veliEmail === 'string' && veliEmail.trim() && ku.ogrenciProfil) {
          const veliProfil = await veliProfilEmailBulTx(tx, veliEmail);
          if (veliProfil) {
            await ogrenciVeliEslestirTx(tx, ku.ogrenciProfil.id, veliProfil.id);
          }
        }
        return tx.kullanici.findUniqueOrThrow({
          where: { id: ku.id },
          include: kullaniciIliskiInclude,
        });
      }
      if (rolVal === Rol.VELI) {
        return tx.kullanici.create({
          data: {
            email: emailNorm,
            sifre: hash,
            telefon: tel,
            rol: Rol.VELI,
            veliProfil: {
              create: {
                ad: ad.trim(),
                soyad: soyad.trim(),
                telefon: tel,
              },
            },
          },
          include: {
          ogrenciProfil: {
            include: {
              veli: {
                include: {
                  kullanici: { select: { id: true, email: true } },
                },
              },
            },
          },
          veliProfil: {
            include: {
              ogrenciler: {
                include: {
                  kullanici: { select: { id: true, email: true } },
                },
              },
            },
          },
          adminProfil: true,
        },
        });
      }
      if (rolVal === Rol.TEACHER) {
        let bransNorm: string;
        let kayitTurleri = turler;
        let kayitBransHarita: Record<string, string[]> | undefined;
        try {
          if (branslarByTur && typeof branslarByTur === 'object') {
            const norm = ogretmenBranslarByTurNormalize(branslarByTur, ogretimTurleri ?? turler);
            bransNorm = norm.brans;
            kayitTurleri = norm.ogretimTurleri;
            kayitBransHarita = norm.branslarByTur;
          } else {
            const kademe = ogretimOgretmen || 'YKS';
            bransNorm = ogretmenBransKayitNormalize({ brans, branslar }, kademe);
          }
        } catch (e) {
          throw new AppHatasi(e instanceof Error ? e.message : 'Geçersiz branş', 400);
        }
        const kademe = kayitTurleri?.[0] ?? ogretimOgretmen ?? 'YKS';
        // Parse grupIds from body
        const gIds = Array.isArray(grupIds) ? [...new Set(grupIds.map(String).filter(Boolean))] : [];
        return tx.kullanici.create({
          data: {
            email: emailNorm,
            sifre: hash,
            telefon: tel,
            rol: Rol.TEACHER,
            adminProfil: {
              create: {
                ad: ad.trim(),
                soyad: soyad.trim(),
                brans: bransNorm,
                ogretimTuru: kademe,
                ...(kayitTurleri ? { ogretimTurleri: kayitTurleri } : {}),
                ...(kayitBransHarita ? { ogretmenBranslar: kayitBransHarita as any } : {}),
                ...(gIds.length > 0 ? { ogretmenGruplari: { create: gIds.map((gid) => ({ grupId: gid })) } } : {}),
              },
            },
          },
          include: {
            ogrenciProfil: {
              include: {
                veli: {
                  include: {
                    kullanici: { select: { id: true, email: true } },
                  },
                },
              },
            },
            veliProfil: {
              include: {
                ogrenciler: {
                  include: {
                    kullanici: { select: { id: true, email: true } },
                  },
                },
              },
            },
            adminProfil: true,
          },
        });
      }
      return tx.kullanici.create({
        data: {
          email: emailNorm,
          sifre: hash,
          rol: rolVal,
          adminProfil: {
            create: {
              ad: ad.trim(),
              soyad: soyad.trim(),
            },
          },
        },
        include: {
          ogrenciProfil: {
            include: {
              veli: {
                include: {
                  kullanici: { select: { id: true, email: true } },
                },
              },
            },
          },
          veliProfil: {
            include: {
              ogrenciler: {
                include: {
                  kullanici: { select: { id: true, email: true } },
                },
              },
            },
          },
          adminProfil: true,
        },
      });
    });

    if (!yeni) {
      res.status(500).json({ basarili: false, mesaj: 'Kullanıcı oluşturulamadı' });
      return;
    }
    const { sifre: _s, refreshToken: _r, dogrulamaKodu: _d, ...guvenli } = yeni;
    res.status(201).json({ basarili: true, veri: guvenli });
  } catch (err) { next(err); }
}

export async function kullaniciGuncelleAdminController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const caller = req.kullanici;
    const { id } = req.params;
    const {
      email, sifre, aktif, ad, soyad, telefon, ogretimTuru, ogretimTurleri, branslarByTur, okul, sinif, rol, brans, branslar,
      veliEmail, ogrenciEmail, ogrenciEmailKaldir, grupIds,
    } = req.body as Record<string, unknown>;
    const turler = parseOgretimTurleri(ogretimTurleri) ?? null;

    const mevcut = await prisma.kullanici.findUnique({
      where: { id },
      include: { ogrenciProfil: true, veliProfil: true, adminProfil: true },
    });
    if (!mevcut) {
      res.status(404).json({ basarili: false, mesaj: 'Kullanıcı bulunamadı' });
      return;
    }

    if (typeof email === 'string' && email.trim().toLowerCase() !== mevcut.email.toLowerCase()) {
      const emailNorm = email.trim().toLowerCase();
      const clash = await prisma.kullanici.findFirst({
        where: { email: { equals: emailNorm, mode: 'insensitive' }, NOT: { id } },
      });
      if (clash) {
        res.status(409).json({ basarili: false, mesaj: 'Bu e-posta başka bir hesapta kullanılıyor' });
        return;
      }
    }

    const data: Prisma.KullaniciUpdateInput = {};
    if (typeof email === 'string' && email.trim()) data.email = email.trim().toLowerCase();
    if (typeof aktif === 'boolean') data.aktif = aktif;
    if (typeof sifre === 'string' && sifre.length > 0) {
      if (sifre.length < 6) {
        res.status(400).json({ basarili: false, mesaj: 'Şifre en az 6 karakter olmalı' });
        return;
      }
      data.sifre = await bcrypt.hash(sifre, 12);
    }
    const tel = typeof telefon === 'string' ? (telefon.trim() || null) : undefined;
    if (tel !== undefined) data.telefon = tel;

    let yeniRol: Rol | undefined;
    if (typeof rol === 'string' && rol.length > 0 && rol !== mevcut.rol) {
      const izinli: Rol[] = [Rol.OGRENCI, Rol.VELI, Rol.TEACHER, Rol.ADMIN, Rol.SUPER_ADMIN];
      if (!izinli.includes(rol as Rol)) {
        res.status(400).json({ basarili: false, mesaj: 'Geçersiz rol' });
        return;
      }
      const istenen = rol as Rol;
      if ((istenen === Rol.SUPER_ADMIN || mevcut.rol === Rol.SUPER_ADMIN) && caller?.rol !== Rol.SUPER_ADMIN) {
        res.status(403).json({ basarili: false, mesaj: 'Süper yönetici rolünü değiştirme yetkiniz yok' });
        return;
      }
      const callerId = caller?.userId || caller?.id;
      if (callerId === id && istenen !== mevcut.rol) {
        res.status(400).json({ basarili: false, mesaj: 'Kendi rolünüzü değiştiremezsiniz' });
        return;
      }
      yeniRol = istenen;
      data.rol = istenen;
    }

    const adYeni = typeof ad === 'string' && ad.trim() ? ad.trim() : undefined;
    const soyadYeni = typeof soyad === 'string' && soyad.trim() ? soyad.trim() : undefined;
    const adKesin = adYeni || mevcut.ogrenciProfil?.ad || mevcut.veliProfil?.ad || mevcut.adminProfil?.ad || mevcut.email;
    const soyadKesin = soyadYeni || mevcut.ogrenciProfil?.soyad || mevcut.veliProfil?.soyad || mevcut.adminProfil?.soyad || '';

    await prismaInteraktifTransaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.kullanici.update({ where: { id }, data });
      }

      if (yeniRol) {
        const adminGrup = yeniRol === Rol.TEACHER || yeniRol === Rol.ADMIN || yeniRol === Rol.SUPER_ADMIN;

        if (mevcut.ogrenciProfil && yeniRol !== Rol.OGRENCI) {
          await ogrenciBaglantisiniTemizle(tx, mevcut.ogrenciProfil.id);
          await tx.ogrenciProfil.delete({ where: { id: mevcut.ogrenciProfil.id } });
        }
        if (mevcut.veliProfil && yeniRol !== Rol.VELI) {
          await tx.ogrenciProfil.updateMany({
            where: { veliId: mevcut.veliProfil.id },
            data: { veliId: null },
          });
          await tx.veliProfil.delete({ where: { id: mevcut.veliProfil.id } });
        }
        if (mevcut.adminProfil && !adminGrup) {
          await tx.adminProfil.delete({ where: { id: mevcut.adminProfil.id } });
        }

        if (yeniRol === Rol.OGRENCI && !mevcut.ogrenciProfil) {
          const og = ogrenciProfilOgretimGirdisi({ sinif, ogretimTuru });
          await tx.ogrenciProfil.create({
            data: {
              kullaniciId: id,
              ad: adKesin,
              soyad: soyadKesin,
              okul: typeof okul === 'string' && okul.trim() ? okul.trim() : null,
              sinif: og.sinif,
              ogretimTuru: og.ogretimTuru,
            },
          });
        } else if (yeniRol === Rol.VELI && !mevcut.veliProfil) {
          await tx.veliProfil.create({
            data: {
              kullaniciId: id,
              ad: adKesin,
              soyad: soyadKesin,
              telefon: tel ?? mevcut.telefon ?? null,
            },
          });
        } else if (adminGrup && !mevcut.adminProfil) {
          let bransNorm: string | null = null;
          let kayitTurleri = turler;
          let kayitBransHarita: Record<string, string[]> | undefined;
          if (yeniRol === Rol.TEACHER) {
            try {
              if (branslarByTur && typeof branslarByTur === 'object') {
                const norm = ogretmenBranslarByTurNormalize(branslarByTur, ogretimTurleri ?? turler);
                bransNorm = norm.brans;
                kayitTurleri = norm.ogretimTurleri;
                kayitBransHarita = norm.branslarByTur;
              } else {
                const kademe = ogretimTuru !== undefined ? parseOgretimKademe(ogretimTuru) : ('YKS' as OgretimTuru);
                bransNorm = ogretmenBransKayitNormalize({ brans, branslar }, kademe);
              }
            } catch (e) {
              throw new AppHatasi(e instanceof Error ? e.message : 'Geçersiz branş', 400);
            }
          }
          const kademe =
            kayitTurleri?.[0]
            ?? (ogretimTuru !== undefined ? parseOgretimKademe(ogretimTuru) : ('YKS' as OgretimTuru));
          const gIds = (yeniRol === Rol.TEACHER && Array.isArray(grupIds))
            ? [...new Set(grupIds.map(String).filter(Boolean))]
            : [];
          await tx.adminProfil.create({
            data: {
              kullaniciId: id,
              ad: adKesin,
              soyad: soyadKesin,
              brans: bransNorm,
              ogretimTuru: yeniRol === Rol.TEACHER ? kademe : null,
              ...(yeniRol === Rol.TEACHER && kayitTurleri ? { ogretimTurleri: kayitTurleri } : {}),
              ...(yeniRol === Rol.TEACHER && kayitBransHarita
                ? { ogretmenBranslar: kayitBransHarita as any }
                : {}),
              ...(gIds.length > 0 ? { ogretmenGruplari: { create: gIds.map((gid) => ({ grupId: gid })) } } : {}),
            },
          });
        }
      } else {
        // Rol değişmiyorsa mevcut profildeki ad/soyad/extra alanları güncelle
        if (mevcut.ogrenciProfil) {
          const op: Prisma.OgrenciProfilUpdateInput = {};
          if (adYeni) op.ad = adYeni;
          if (soyadYeni) op.soyad = soyadYeni;
          if (typeof okul === 'string') op.okul = okul.trim() || null;
          if (sinif !== undefined || ogretimTuru !== undefined) {
            const og = ogrenciProfilOgretimGirdisi({
              sinif: sinif ?? mevcut.ogrenciProfil.sinif,
              ogretimTuru: ogretimTuru ?? mevcut.ogrenciProfil.ogretimTuru,
            });
            op.sinif = og.sinif;
            op.ogretimTuru = og.ogretimTuru;
          }
          if (Object.keys(op).length > 0) {
            await tx.ogrenciProfil.update({ where: { id: mevcut.ogrenciProfil.id }, data: op });
          }
          if (typeof veliEmail === 'string') {
            const veliNorm = veliEmail.trim().toLowerCase();
            if (!veliNorm) {
              await tx.ogrenciProfil.update({
                where: { id: mevcut.ogrenciProfil.id },
                data: { veliId: null },
              });
            } else {
              const veliProfil = await veliProfilEmailBulTx(tx, veliNorm);
              if (veliProfil) {
                await ogrenciVeliEslestirTx(tx, mevcut.ogrenciProfil.id, veliProfil.id);
              }
            }
          }
        } else if (mevcut.veliProfil) {
          const vp: Prisma.VeliProfilUpdateInput = {};
          if (adYeni) vp.ad = adYeni;
          if (soyadYeni) vp.soyad = soyadYeni;
          if (tel !== undefined) vp.telefon = tel;
          if (Object.keys(vp).length > 0) {
            await tx.veliProfil.update({ where: { id: mevcut.veliProfil.id }, data: vp });
          }
          if (typeof ogrenciEmail === 'string' && ogrenciEmail.trim()) {
            await ogrenciVeliEslestirEmailTx(tx, mevcut.veliProfil.id, ogrenciEmail);
          }
          if (typeof ogrenciEmailKaldir === 'string' && ogrenciEmailKaldir.trim()) {
            const kaldirNorm = ogrenciEmailKaldir.trim().toLowerCase();
            const ogrenciKu = await tx.kullanici.findFirst({
              where: { email: { equals: kaldirNorm, mode: 'insensitive' } },
              include: { ogrenciProfil: true },
            });
            if (
              ogrenciKu?.ogrenciProfil &&
              ogrenciKu.ogrenciProfil.veliId === mevcut.veliProfil.id
            ) {
              await tx.ogrenciProfil.update({
                where: { id: ogrenciKu.ogrenciProfil.id },
                data: { veliId: null },
              });
            }
          }
        } else if (mevcut.adminProfil) {
          const ap: Prisma.AdminProfilUpdateInput = {};
          if (adYeni) ap.ad = adYeni;
          if (soyadYeni) ap.soyad = soyadYeni;
          const kademe =
            ogretimTuru !== undefined
              ? parseOgretimKademe(ogretimTuru)
              : ((turler?.[0] ?? mevcut.adminProfil.ogretimTuru) || 'YKS');
          const ogretmenMi = mevcut.rol === Rol.TEACHER;
          if (ogretmenMi && branslarByTur && typeof branslarByTur === 'object') {
            try {
              const norm = ogretmenBranslarByTurNormalize(
                branslarByTur,
                ogretimTurleri ?? turler ?? mevcut.adminProfil.ogretimTurleri,
              );
              ap.brans = norm.brans;
              ap.ogretimTurleri = norm.ogretimTurleri as any;
              ap.ogretmenBranslar = norm.branslarByTur as Prisma.InputJsonValue;
              ap.ogretimTuru = norm.ogretimTurleri[0];
            } catch (e) {
              throw new AppHatasi(e instanceof Error ? e.message : 'Geçersiz branş', 400);
            }
          } else if (ogretmenMi && (brans !== undefined || branslar !== undefined)) {
            try {
              ap.brans = ogretmenBransKayitNormalize({ brans, branslar }, kademe);
            } catch (e) {
              throw new AppHatasi(e instanceof Error ? e.message : 'Geçersiz branş', 400);
            }
            if (turler) {
              ap.ogretimTurleri = turler as any;
              ap.ogretimTuru = turler[0];
            } else if (ogretimTuru !== undefined) {
              ap.ogretimTuru = parseOgretimKademe(ogretimTuru);
            }
          } else if (ogretmenMi && ogretimTuru !== undefined && mevcut.adminProfil.brans) {
            try {
              ap.brans = ogretmenBransKayitNormalize({ brans: mevcut.adminProfil.brans }, kademe);
              ap.ogretimTuru = parseOgretimKademe(ogretimTuru);
            } catch (e) {
              throw new AppHatasi(e instanceof Error ? e.message : 'Geçersiz branş', 400);
            }
          } else if (ogretmenMi && turler) {
            ap.ogretimTurleri = turler as any;
            ap.ogretimTuru = turler[0];
          } else if (ogretimTuru !== undefined) {
            ap.ogretimTuru = parseOgretimKademe(ogretimTuru);
          }
          if (Object.keys(ap).length > 0) {
            await tx.adminProfil.update({ where: { id: mevcut.adminProfil.id }, data: ap });
          }
          // Öğretmen grup atamalarını senkronize et
          if (ogretmenMi && grupIds !== undefined) {
            const gIds = Array.isArray(grupIds) ? [...new Set(grupIds.map(String).filter(Boolean))] : [];
            // Eski grup bağlantılarını sil
            await tx.ogretmenGrup.deleteMany({ where: { adminProfilId: mevcut.adminProfil!.id } });
            // Yeni grup bağlantılarını oluştur
            if (gIds.length > 0) {
              await tx.ogretmenGrup.createMany({
                data: gIds.map((gid) => ({ adminProfilId: mevcut.adminProfil!.id, grupId: gid })),
              });
            }
          }
        }
      }
    }, { timeout: 30000, maxWait: 10000 });

    const guncel = await prisma.kullanici.findUnique({
      where: { id },
      include: kullaniciIliskiInclude,
    });

    const { sifre: _s, refreshToken: _r, dogrulamaKodu: _d, ...guvenli } = guncel!;
    res.json({ basarili: true, veri: guvenli });
  } catch (err) { next(err); }
}

export async function veliOgrenciEslestirAdminController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const veliEmail = typeof req.body?.veliEmail === 'string' ? req.body.veliEmail.trim() : '';
    const ogrenciEmail = typeof req.body?.ogrenciEmail === 'string' ? req.body.ogrenciEmail.trim() : '';
    if (!veliEmail || !ogrenciEmail) {
      res.status(400).json({ basarili: false, mesaj: 'Veli ve öğrenci e-postası gerekli' });
      return;
    }

    await prismaInteraktifTransaction(async (tx) => {
      const veliProfil = await veliProfilEmailBulTx(tx, veliEmail);
      if (!veliProfil) throw new AppHatasi('Veli hesabı bulunamadı', 404);
      await ogrenciVeliEslestirEmailTx(tx, veliProfil.id, ogrenciEmail);
    });

    res.json({ basarili: true, mesaj: 'Veli ve öğrenci eşleştirildi' });
  } catch (err) {
    next(err);
  }
}

export async function kullaniciSilAdminController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const adminId = req.kullanici?.userId || req.kullanici?.id;
    if (!adminId) {
      res.status(401).json({ basarili: false, mesaj: 'Yetkisiz' });
      return;
    }
    if (id === adminId) {
      throw new AppHatasi('Kendi hesabınızı silemezsiniz', 400);
    }

    const hedef = await prisma.kullanici.findUnique({
      where: { id },
      include: { ogrenciProfil: true, veliProfil: true },
    });
    if (!hedef) {
      res.status(404).json({ basarili: false, mesaj: 'Kullanıcı bulunamadı' });
      return;
    }

    await prismaInteraktifTransaction(async (tx) => {
      await tx.satinAlim.deleteMany({ where: { kullaniciId: id } });
      await tx.bildirim.deleteMany({ where: { kullaniciId: id } });
      await tx.sosyalDavet.deleteMany({ where: { OR: [{ gondericId: id }, { aliciId: id }] } });

      if (hedef.veliProfil) {
        await tx.ogrenciProfil.updateMany({
          where: { veliId: hedef.veliProfil.id },
          data: { veliId: null },
        });
      }

      if (hedef.ogrenciProfil) {
        await ogrenciBaglantisiniTemizle(tx, hedef.ogrenciProfil.id);
      }

      await tx.kullanici.delete({ where: { id } });
    });

    res.json({ basarili: true, mesaj: 'Kullanıcı silindi' });
  } catch (err) { next(err); }
}

export async function kullaniciTopluSilAdminController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { kullaniciIds } = req.body as { kullaniciIds?: unknown };
    const adminId = req.kullanici?.userId || req.kullanici?.id;

    if (!Array.isArray(kullaniciIds) || kullaniciIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'kullaniciIds dizisi boş olamaz' });
      return;
    }

    const ids = [...new Set(kullaniciIds.map((x) => String(x)).filter(Boolean))];
    if (adminId && ids.includes(adminId)) {
      throw new AppHatasi('Seçilenler arasında kendi hesabınız bulunamaz', 400);
    }

    // Tokyo veritabanı latency'si nedeniyle transaction timeout süresini 60 saniyeye çıkarıyoruz
    // Ve tek tek döngü yerine bulk (in) sorguları kullanıyoruz
    await prismaInteraktifTransaction(async (tx) => {
      const hedefler = await tx.kullanici.findMany({
        where: { id: { in: ids } },
        include: { ogrenciProfil: true, veliProfil: true },
      });

      const ogrenciProfilIds = hedefler.map(h => h.ogrenciProfil?.id).filter(Boolean) as string[];
      const veliProfilIds = hedefler.map(h => h.veliProfil?.id).filter(Boolean) as string[];

      // 1. Kullanıcı tabanlı silmeler
      await tx.satinAlim.deleteMany({ where: { kullaniciId: { in: ids } } });
      await tx.bildirim.deleteMany({ where: { kullaniciId: { in: ids } } });
      await tx.sosyalDavet.deleteMany({ where: { OR: [{ gondericId: { in: ids } }, { aliciId: { in: ids } }] } });

      // 2. Veli tabanlı güncellemeler
      if (veliProfilIds.length > 0) {
        await tx.ogrenciProfil.updateMany({
          where: { veliId: { in: veliProfilIds } },
          data: { veliId: null },
        });
      }

      // 3. Öğrenci tabanlı silmeler
      if (ogrenciProfilIds.length > 0) {
        const katilimlar = await tx.sinavKatilim.findMany({
          where: { ogrenciId: { in: ogrenciProfilIds } },
          select: { id: true },
        });
        const kid = katilimlar.map((k) => k.id);
        if (kid.length > 0) {
          await tx.ogrenciCevap.deleteMany({ where: { katilimId: { in: kid } } });
        }
        await tx.sinavKatilim.deleteMany({ where: { ogrenciId: { in: ogrenciProfilIds } } });
        await tx.grupUyelik.deleteMany({ where: { ogrenciId: { in: ogrenciProfilIds } } });
        await tx.konuPerformansi.deleteMany({ where: { ogrenciId: { in: ogrenciProfilIds } } });
        await tx.aIAnaliz.deleteMany({ where: { ogrenciId: { in: ogrenciProfilIds } } });

        const planlar = await tx.studyPlan.findMany({
          where: { ogrenciId: { in: ogrenciProfilIds } },
          select: { id: true },
        });
        const pids = planlar.map((p) => p.id);
        if (pids.length > 0) {
          await tx.studyGorev.deleteMany({ where: { planId: { in: pids } } });
        }
        await tx.studyPlan.deleteMany({ where: { ogrenciId: { in: ogrenciProfilIds } } });
        await tx.arkadaslik.deleteMany({
          where: { OR: [{ ogrenciId: { in: ogrenciProfilIds } }, { arkadasId: { in: ogrenciProfilIds } }] },
        });
        await tx.duello.deleteMany({
          where: { OR: [{ davetedenId: { in: ogrenciProfilIds } }, { davetEdilenId: { in: ogrenciProfilIds } }] },
        });
        await tx.universiteHedef.deleteMany({ where: { ogrenciId: { in: ogrenciProfilIds } } });
      }

      // 4. Nihai kullanıcı silme
      await tx.kullanici.deleteMany({ where: { id: { in: ids } } });
    }, {
      timeout: 60000 // 60 saniye
    });

    res.json({ basarili: true, mesaj: `${ids.length} kullanıcı silindi` });
  } catch (err) { next(err); }
}

/** Öğrenciye tek sınav erişimi (grup dışı) */
export async function sinavOgrenciAtaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sinavId } = req.params;
    const { email, ogrenciId, ogrenciProfilId } = req.body as Record<string, unknown>;

    const sinav = await prisma.sinav.findUnique({ where: { id: sinavId } });
    if (!sinav) {
      res.status(404).json({ basarili: false, mesaj: 'Sınav bulunamadı' });
      return;
    }

    let oid: string | null = typeof ogrenciId === 'string' && ogrenciId.trim() ? ogrenciId.trim() : null;
    if (!oid && typeof ogrenciProfilId === 'string' && ogrenciProfilId.trim()) {
      oid = ogrenciProfilId.trim();
    }
    if (!oid && typeof email === 'string' && email.includes('@')) {
      const k = await prisma.kullanici.findFirst({
        where: { email: { equals: email.trim(), mode: 'insensitive' }, rol: 'OGRENCI' },
        include: { ogrenciProfil: true },
      });
      oid = k?.ogrenciProfil?.id ?? null;
    }
    if (!oid) {
      res.status(400).json({ basarili: false, mesaj: 'Öğrenci bulunamadı (öğrenci e-postası veya ogrenciId gerekli)' });
      return;
    }

    await prisma.ogrenciSinavAtama.upsert({
      where: { ogrenciId_sinavId: { ogrenciId: oid, sinavId } },
      create: { ogrenciId: oid, sinavId, kaynak: 'MANUEL' },
      update: { kaynak: 'MANUEL' },
    });

    await sinavListesiCacheTemizle();
    res.status(201).json({ basarili: true, mesaj: 'Öğrenci bu sınava atandı' });
  } catch (err) {
    next(err);
  }
}

/** Yalnızca manuel atamayı kaldırır (paket kaynaklı kayıtlar silinmez) */
export async function sinavOgrenciAtamaKaldirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sinavId, ogrenciId } = req.params;
    const r = await prisma.ogrenciSinavAtama.deleteMany({
      where: { sinavId, ogrenciId, kaynak: 'MANUEL' },
    });
    await sinavListesiCacheTemizle();
    res.json({ basarili: true, mesaj: r.count > 0 ? 'Atama kaldırıldı' : 'Silinecek manuel atama yok' });
  } catch (err) {
    next(err);
  }
}

export async function sinavAtananOgrencilerController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sinavId } = req.params;
    const atamalar = await prisma.ogrenciSinavAtama.findMany({
      where: { sinavId },
      include: {
        ogrenci: {
          select: {
            id: true,
            ad: true,
            soyad: true,
            kullanici: { select: { email: true } },
          },
        },
      },
      orderBy: { olusturuldu: 'desc' },
    });
    res.json({ basarili: true, veri: atamalar });
  } catch (err) {
    next(err);
  }
}

/** Soru bankası: seçilen soruların onay durumunu toplu günceller */
export async function soruTopluOnayGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { soruIds, onayDurumu } = req.body as { soruIds?: unknown; onayDurumu?: string };
    const izinli: SoruOnayDurumu[] = [
      SoruOnayDurumu.ONAY_BEKLIYOR,
      SoruOnayDurumu.ONAYLANDI,
      SoruOnayDurumu.REDDEDILDI,
    ];

    if (!Array.isArray(soruIds) || soruIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'soruIds dizisi boş olamaz' });
      return;
    }
    if (!onayDurumu || !izinli.includes(onayDurumu as SoruOnayDurumu)) {
      res.status(400).json({ basarili: false, mesaj: 'Geçerli onayDurumu gerekli' });
      return;
    }

    const ids = [...new Set(soruIds.map((x) => String(x)).filter(Boolean))];
    
    const topluIzin = await ogretmenSoruIdsIslemIzni(req, ids);
    if (!topluIzin.ok) {
      res.status(topluIzin.status).json({ basarili: false, mesaj: topluIzin.mesaj });
      return;
    }

    // Etkilenen sınav id'leri (cache silmek için)
    const sorular = await prisma.soru.findMany({
      where: { id: { in: ids } },
      select: { sinavId: true }
    });
    const sinavIds = [...new Set(sorular.map(s => s.sinavId).filter(Boolean))];

    await prisma.soru.updateMany({
      where: { id: { in: ids } },
      data: { onayDurumu: onayDurumu as SoruOnayDurumu },
    });

    // Cache temizle
    for (const sid of sinavIds) {
      await cache.sil(`sinav:${sid}`);
    }

    res.json({ basarili: true, veri: { adet: ids.length, onayDurumu } });
  } catch (err) {
    next(err);
  }
}

/** Soru bankası: seçilen soruları toplu siler */
export async function soruTopluSilController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { soruIds } = req.body as { soruIds?: unknown };
    if (!Array.isArray(soruIds) || soruIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'soruIds dizisi boş olamaz' });
      return;
    }

    const ids = [...new Set(soruIds.map((x) => String(x)).filter(Boolean))];

    const topluIzin = await ogretmenSoruIdsIslemIzni(req, ids);
    if (!topluIzin.ok) {
      res.status(topluIzin.status).json({ basarili: false, mesaj: topluIzin.mesaj });
      return;
    }

    // Etkilenen sınav id'leri (cache silmek için)
    const sorular = await prisma.soru.findMany({
      where: { id: { in: ids } },
      select: { sinavId: true }
    });
    const sinavIds = [...new Set(sorular.map(s => s.sinavId).filter(Boolean))];

    const result = await prisma.$transaction([
      prisma.ogrenciCevap.deleteMany({ where: { soruId: { in: ids } } }),
      prisma.soru.deleteMany({ where: { id: { in: ids } } })
    ]);

    // Cache temizle
    for (const sid of sinavIds) {
      await cache.sil(`sinav:${sid}`);
    }

    res.json({ basarili: true, veri: { adet: result[1].count } });
  } catch (err) {
    next(err);
  }
}

/** Soru bankası: seçilen soruların kazanımını toplu günceller */
export async function soruTopluKazanimGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { soruIds, kazanim } = req.body as { soruIds?: unknown; kazanim?: unknown };

    if (!Array.isArray(soruIds) || soruIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'soruIds dizisi boş olamaz' });
      return;
    }

    const rawKaz = typeof kazanim === 'string' ? kazanim.trim() : '';
    if (!rawKaz) {
      res.status(400).json({ basarili: false, mesaj: 'kazanım metni gerekli' });
      return;
    }
    if (rawKaz.length > 300) {
      res.status(400).json({ basarili: false, mesaj: 'kazanım çok uzun (max 300 karakter)' });
      return;
    }

    const ids = [...new Set(soruIds.map((x) => String(x)).filter(Boolean))];

    const topluIzin = await ogretmenSoruIdsIslemIzni(req, ids);
    if (!topluIzin.ok) {
      res.status(topluIzin.status).json({ basarili: false, mesaj: topluIzin.mesaj });
      return;
    }

    // Etkilenen sınav id'leri (cache silmek için)
    const sorular = await prisma.soru.findMany({
      where: { id: { in: ids } },
      select: { sinavId: true }
    });
    const sinavIds = [...new Set(sorular.map(s => s.sinavId).filter(Boolean))];

    await prisma.soru.updateMany({
      where: { id: { in: ids } },
      data: {
        kazanim: rawKaz,
        ogretmenGuncelledi: true,
        ...(req.kullanici?.userId ? { duzenleyenId: req.kullanici.userId } : {}),
      },
    });

    for (const sid of sinavIds) {
      await cache.sil(`sinav:${sid}`);
    }

    res.json({ basarili: true, veri: { adet: ids.length, kazanim: rawKaz } });
  } catch (err) {
    next(err);
  }
}

/** Seçili soruların uygun grup etiketlerini günceller (tam senkron) */
export async function soruTopluUygunGrupGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { soruIds, uygunGrupIds } = req.body as { soruIds?: unknown; uygunGrupIds?: unknown };
    if (!Array.isArray(soruIds) || soruIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'soruIds dizisi boş olamaz' });
      return;
    }
    const ids = [...new Set(soruIds.map((x) => String(x)).filter(Boolean))];
    const grupIds = uygunGrupIdsNormalize(uygunGrupIds);

    const topluIzin = await ogretmenSoruIdsIslemIzni(req, ids);
    if (!topluIzin.ok) {
      res.status(topluIzin.status).json({ basarili: false, mesaj: topluIzin.mesaj });
      return;
    }

    for (const soruId of ids) {
      await soruUygunGruplariKaydet(soruId, grupIds);
    }

    res.json({ basarili: true, veri: { adet: ids.length, uygunGrupIds: grupIds } });
  } catch (err) {
    if ((err as Error).message?.includes('Geçersiz')) {
      res.status(400).json({ basarili: false, mesaj: (err as Error).message });
      return;
    }
    next(err);
  }
}

/** Tek soruyu günceller */
export async function soruGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const {
      konuId,
      siraNo,
      metinHtml,
      gorselUrl,
      secenekler,
      dogruCevap,
      zorluk,
      kazanim,
      onayDurumu,
      sinavId: bodySinavId,
      grupId: bodyGrupId,
      uygunGrupIds,
    } = req.body as Record<string, any>;

    const mevcut = await prisma.soru.findUnique({
      where: { id },
      include: { konu: true },
    });
    if (!mevcut) {
      res.status(404).json({ basarili: false, mesaj: 'Soru bulunamadı' });
      return;
    }

    const izin = await ogretmenSoruIslemIzni(req, {
      olusturanId: mevcut.olusturanId,
      duzenleyenId: mevcut.duzenleyenId,
      onayDurumu: mevcut.onayDurumu,
      konu: mevcut.konu,
    });
    if (!izin.ok) {
      res.status(izin.status).json({ basarili: false, mesaj: izin.mesaj });
      return;
    }

    const grupTrim =
      typeof bodyGrupId === 'string' && bodyGrupId.trim() !== '' ? bodyGrupId.trim() : '';

    /** Sınava ata boş + sadece grup seçiliyse soruEkle ile aynı mantık: o gruba ait havuz sınavı */
    let hedefSinavId: string | null | undefined = undefined;
    if (bodySinavId !== undefined) {
      const sinavBos =
        bodySinavId === null ||
        bodySinavId === '' ||
        (typeof bodySinavId === 'string' && bodySinavId.trim() === '') ||
        bodySinavId === 'pool';
      if (!sinavBos) {
        hedefSinavId = String(bodySinavId).trim();
      } else if (grupTrim) {
        const bankaId = await ensureGrupBankaSinavi(grupTrim);
        if (!bankaId) {
          res.status(404).json({ basarili: false, mesaj: 'Grup bulunamadı' });
          return;
        }
        hedefSinavId = bankaId;
      } else {
        hedefSinavId = null;
      }
    }

    if (hedefSinavId) {
      const sn = await prisma.sinav.findUnique({ where: { id: hedefSinavId } });
      if (!sn) {
        res.status(404).json({ basarili: false, mesaj: 'Sınav bulunamadı' });
        return;
      }
      if (grupTrim && sn.grupId !== grupTrim) {
        res.status(400).json({
          basarili: false,
          mesaj: 'Seçilen sınav, panelde seçili gruba ait değil. Grup veya «Sınava Ekle» seçimini kontrol edin.',
        });
        return;
      }
    }

    const soru = await prisma.soru.update({
      where: { id },
      data: {
        konuId: konuId !== undefined && konuId !== '' ? konuId : undefined,
        ...(hedefSinavId !== undefined ? { sinavId: hedefSinavId } : {}),
        siraNo: siraNo !== undefined ? parseInt(String(siraNo), 10) : undefined,
        metinHtml: metinHtml !== undefined ? String(metinHtml) : undefined,
        gorselUrl: gorselUrl !== undefined ? (gorselUrl && gorselUrl !== '' ? String(gorselUrl) : null) : undefined,
        secenekler: secenekler !== undefined ? (secenekler as Prisma.InputJsonValue) : undefined,
        dogruCevap: dogruCevap !== undefined ? String(dogruCevap) : undefined,
        zorluk: zorluk !== undefined ? (zorluk as SoruZorlugu) : undefined,
        kazanim: kazanim !== undefined ? (kazanim && kazanim !== '' ? String(kazanim) : null) : undefined,
        onayDurumu: onayDurumu !== undefined ? (onayDurumu as SoruOnayDurumu) : undefined,
        ogretmenGuncelledi: true,
        ...(req.kullanici?.userId
          ? {
              duzenleyenId: req.kullanici.userId,
              ...(!mevcut.olusturanId ? { olusturanId: req.kullanici.userId } : {}),
            }
          : {}),
      },
    });

    if (mevcut.sinavId) await cache.sil(`sinav:${mevcut.sinavId}`);
    if (soru.sinavId && soru.sinavId !== mevcut.sinavId) await cache.sil(`sinav:${soru.sinavId}`);

    if (uygunGrupIds !== undefined) {
      try {
        await soruUygunGruplariKaydet(id, uygunGrupIdsNormalize(uygunGrupIds));
      } catch (e) {
        res.status(400).json({ basarili: false, mesaj: (e as Error).message });
        return;
      }
    }

    const guncel = await prisma.soru.findUnique({
      where: { id },
      include: soruUygunGrupInclude,
    });

    if (req.kullanici?.userId) {
      void aktiviteKaydet({
        kullaniciId: req.kullanici.userId,
        tur: KullaniciAktiviteTuru.SORU_GUNCELLE,
        aciklama: 'Soru güncellendi',
        meta: { soruId: id },
      });
    }

    res.json({ basarili: true, veri: guncel ?? soru });
  } catch (err) {
    next(err);
  }
}

/**
 * Sınavın konu dağılımına bakarak, grubun soru bankasından (havuzdan)
 * eksik olan soru adedi kadar soruyu otomatik olarak bu sınawa atar.
 */
export async function sinavaSoruAtaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: sinavId } = req.params;
    const { soruIds } = req.body as { soruIds?: unknown };

    if (!Array.isArray(soruIds) || soruIds.length === 0) {
      res.status(400).json({ basarili: false, mesaj: 'soruIds boş olamaz' });
      return;
    }

    const sinav = await prisma.sinav.findUnique({ where: { id: sinavId }, select: { id: true } });
    if (!sinav) {
      res.status(404).json({ basarili: false, mesaj: 'Sınav bulunamadı' });
      return;
    }

    const ids = [...new Set((soruIds as unknown[]).map((x) => String(x)).filter(Boolean))];

    const maxSira = await prisma.soru.aggregate({
      where: { sinavId },
      _max: { siraNo: true },
    });
    let siraNo = (maxSira._max.siraNo ?? 0) + 1;

    await prisma.$transaction(
      ids.map((sid) =>
        prisma.soru.update({
          where: { id: sid },
          data: { sinavId, siraNo: siraNo++ },
        })
      )
    );

    await cache.sil(`sinav:${sinavId}`);
    res.json({ basarili: true, veri: { eklenenAdet: ids.length } });
  } catch (err) { next(err); }
}

export async function sinavdanSoruKaldirController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sinavId, soruId } = req.params as { sinavId: string; soruId: string };
    if (!sinavId || !soruId) {
      res.status(400).json({ basarili: false, mesaj: 'sinavId ve soruId gerekli' });
      return;
    }

    const sinav = await prisma.sinav.findUnique({ where: { id: sinavId }, select: { id: true, grupId: true } });
    if (!sinav) {
      res.status(404).json({ basarili: false, mesaj: 'Sınav bulunamadı' });
      return;
    }

    const soru = await prisma.soru.findUnique({ where: { id: soruId }, select: { id: true, sinavId: true } });
    if (!soru || soru.sinavId !== sinavId) {
      res.status(404).json({ basarili: false, mesaj: 'Soru bu sınavda bulunamadı' });
      return;
    }

    const bankaId = await ensureGrupBankaSinavi(sinav.grupId);

    await prismaInteraktifTransaction(async (tx) => {
      // 1) Soruyu sınavdan çıkarıp grubun havuz sınavına geri taşı
      let yeniSinavId: string | null = null;
      let yeniSiraNo: number | null = null;
      if (bankaId) {
        const maxSira = await tx.soru.aggregate({ where: { sinavId: bankaId }, _max: { siraNo: true } });
        yeniSinavId = bankaId;
        yeniSiraNo = (maxSira._max.siraNo ?? 0) + 1;
      }

      await tx.soru.update({
        where: { id: soruId },
        data: {
          sinavId: yeniSinavId,
          siraNo: yeniSiraNo ?? 0,
        },
      });

      // 2) Kalan soruları sınav içinde yeniden sırala
      const kalan = await tx.soru.findMany({
        where: { sinavId },
        orderBy: { siraNo: 'asc' },
        select: { id: true },
      });
      for (let i = 0; i < kalan.length; i++) {
        await tx.soru.update({ where: { id: kalan[i]!.id }, data: { siraNo: i + 1 } });
      }
    });

    await cache.sil(`sinav:${sinavId}`);
    if (bankaId) await cache.sil(`sinav:${bankaId}`);

    res.json({ basarili: true, veri: { kaldirildi: true } });
  } catch (err) {
    next(err);
  }
}

export async function sinavBankadanOtomatikDoldurController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const sinav = await prisma.sinav.findUnique({
      where: { id },
      include: { sorular: true }
    });

    if (!sinav) {
      res.status(404).json({ basarili: false, mesaj: 'Sınav bulunamadı' });
      return;
    }

    const bankaId = await ensureGrupBankaSinavi(sinav.grupId);
    if (!bankaId) {
      res.status(404).json({ basarili: false, mesaj: 'Grup bankası bulunamadı' });
      return;
    }

    const dagilim = flatKonuDagilimSatirlari(sinav.konuDagilimi);
    let toplamEklenen = 0;

    for (const d of dagilim) {
      const konuId = d.konuId;
      const hedefAdet = parseInt(String(d.adet), 10) || 0;
      if (!konuId || hedefAdet <= 0) continue;

      const mevcutAdet = sinav.sorular.filter(s => s.konuId === konuId).length;
      const gerekenAdet = hedefAdet - mevcutSayiManual(sinav.sorular, konuId); // Helper if needed
      
      if (gerekenAdet <= 0) continue;

      // Bankadan bu konuya ait soruları çek (zaten bu sınavda olmayanlar)
      const adaylar = await prisma.soru.findMany({
        where: {
          sinavId: bankaId,
          konuId: konuId,
          onayDurumu: 'ONAYLANDI'
        },
        take: gerekenAdet,
        orderBy: { olusturuldu: 'desc' }
      });

      if (adaylar.length > 0) {
        const adayIdleri = adaylar.map(a => a.id);
        
        // Son sıra numarasını bul
        const maxSira = await prisma.soru.aggregate({
          where: { sinavId: sinav.id },
          _max: { siraNo: true }
        });
        let sira = (maxSira._max.siraNo ?? 0) + 1;

        await prisma.$transaction(
          adayIdleri.map(aid => prisma.soru.update({
            where: { id: aid },
            data: { sinavId: sinav.id, siraNo: sira++ }
          }))
        );
        toplamEklenen += adaylar.length;
      }
    }

    await cache.sil(`sinav:${id}`);
    res.json({ basarili: true, veri: { eklenenAdet: toplamEklenen } });
  } catch (err) { next(err); }
}

function mevcutSayiManual(sorular: any[], konuId: string): number {
  return sorular.filter(s => s.konuId === konuId).length;
}

/** Gruptaki soru havuzunun (Soru Bankası) konu bazlı özetini döner */
export async function grupHavuzOzetController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: grupId } = req.params;
    const bankaId = await ensureGrupBankaSinavi(grupId);
    if (!bankaId) {
      res.status(404).json({ basarili: false, mesaj: 'Grup bulunamadı' });
      return;
    }

    const ozet = await prisma.soru.groupBy({
      by: ['konuId'],
      where: { sinavId: bankaId, onayDurumu: 'ONAYLANDI' },
      _count: { _all: true },
    });

    const map: Record<string, number> = {};
    for (const row of ozet) {
      map[row.konuId] = row._count._all;
    }
    res.json({ basarili: true, veri: map });
  } catch (err) { next(err); }
}

/** Sistemdeki tüm onaylı soruların konu bazlı sayısını döner (birincil + ek etiketler) */
export async function konuSoruSayilariController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ogrKisit = await reqOgretmenKisit(req);
    const ogretmenWhere =
      ogrKisit && req.kullanici?.userId ? ogretmenKendiSorulariWhere(req.kullanici.userId) : {};
    const onayliWhere = { onayDurumu: 'ONAYLANDI' as const, ...ogretmenWhere };

    const [birincil, etiket] = await Promise.all([
      prisma.soru.groupBy({
        by: ['konuId'],
        where: onayliWhere,
        _count: { _all: true },
      }),
      prisma.soruKonuEtiket.groupBy({
        by: ['konuId'],
        where: { soru: onayliWhere },
        _count: { _all: true },
      }),
    ]);
    const map: Record<string, number> = {};
    for (const row of birincil) {
      map[row.konuId] = (map[row.konuId] || 0) + row._count._all;
    }
    for (const row of etiket) {
      map[row.konuId] = (map[row.konuId] || 0) + row._count._all;
    }
    res.json({ basarili: true, veri: map });
  } catch (err) { next(err); }
}
