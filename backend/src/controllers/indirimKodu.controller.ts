import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  adminIndirimKoduGuncelle,
  adminIndirimKoduListesi,
  adminIndirimKoduOlustur,
  adminIndirimKoduSil,
  adminKomisyonListesi,
  adminKomisyonOde,
  indirimKoduDogrula,
  kocIndirimKoduGuncelle,
  kocIndirimKoduListesi,
  kocIndirimKoduOlustur,
  kocIndirimKoduSil,
  kocKazancHareketleri,
  kocKazancOzeti,
  komisyonSahibiAdaylari,
  ogretmenKazancHareketleri,
  ogretmenKazancOzeti,
} from '../services/indirimKodu.service';

function uid(req: AuthRequest): string {
  return req.kullanici!.userId || req.kullanici!.id;
}

function metin(deger: unknown): string | undefined {
  return typeof deger === 'string' ? deger : undefined;
}

/** Öğrenci: ödeme öncesi kod doğrulama */
export async function indirimKoduDogrulaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const brut = Number(req.body?.tutar);
    const veri = await indirimKoduDogrula({
      kod: String(req.body?.kod || ''),
      brutTutar: Number.isFinite(brut) ? brut : 0,
      kullaniciId: uid(req),
      isKpssPlatform: req.isKpssPlatform === true,
    });
    res.json({
      basarili: true,
      veri: {
        kod: veri.kod,
        aciklama: veri.aciklama,
        brutTutar: veri.brutTutar,
        indirimTutari: veri.indirimTutari,
        netTutar: veri.netTutar,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** Öğretmen: kendi muhasebe özeti */
export async function ogretmenKazancOzetController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ basarili: true, veri: await ogretmenKazancOzeti(uid(req)) });
  } catch (err) {
    next(err);
  }
}

/** Öğretmen: komisyon hareketleri */
export async function ogretmenKazancHareketController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await ogretmenKazancHareketleri(uid(req), {
      durum: metin(req.query.durum),
      kodId: metin(req.query.kodId),
      limit: Number(req.query.limit) || undefined,
    });
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

// --- Yönetici ---

export async function adminIndirimKodlariController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminIndirimKoduListesi({
      q: metin(req.query.q),
      aktif: metin(req.query.aktif),
      ogretmenId: metin(req.query.ogretmenId),
    });
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKomisyonSahibiAdaylariController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await komisyonSahibiAdaylari(metin(req.query.q));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminIndirimKoduOlusturController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminIndirimKoduOlustur(req.body ?? {});
    res.status(201).json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminIndirimKoduGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminIndirimKoduGuncelle(req.params.id, req.body ?? {});
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminIndirimKoduSilController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminIndirimKoduSil(req.params.id);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKomisyonlarController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKomisyonListesi({
      durum: metin(req.query.durum),
      ogretmenId: metin(req.query.ogretmenId),
      limit: Number(req.query.limit) || undefined,
    });
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKomisyonOdeController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const idler = Array.isArray(req.body?.kullanimIds) ? req.body.kullanimIds.map(String) : [];
    const veri = await adminKomisyonOde(idler, metin(req.body?.not));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

// --- Koç paneli ---

export async function kocIndirimKodlariController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ basarili: true, veri: await kocIndirimKoduListesi(uid(req)) });
  } catch (err) {
    next(err);
  }
}

export async function kocIndirimKoduOlusturController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocIndirimKoduOlustur(uid(req), req.body ?? {});
    res.status(201).json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocIndirimKoduGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocIndirimKoduGuncelle(uid(req), req.params.id, req.body ?? {});
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocIndirimKoduSilController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocIndirimKoduSil(uid(req), req.params.id);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocKazancOzetController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ basarili: true, veri: await kocKazancOzeti(uid(req)) });
  } catch (err) {
    next(err);
  }
}

export async function kocKazancHareketController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await kocKazancHareketleri(uid(req), {
      durum: metin(req.query.durum),
      kodId: metin(req.query.kodId),
      limit: Number(req.query.limit) || undefined,
    });
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}
