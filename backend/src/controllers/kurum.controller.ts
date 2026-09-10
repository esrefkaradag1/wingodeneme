import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  kurumOgrenciBagla,
  kurumOgrenciCikar,
  kurumOgrenciHesapAc,
  kurumOgrenciListesi,
  kurumOgrenciSifreSifirla,
  kurumOgrenciSinifAta,
  kurumOgretmenEkle,
  kurumOgretmenGuncelle,
  kurumOgretmenListesi,
  kurumOgretmenSifreSifirla,
  kurumOgretmenSil,
  kurumOzetGetir,
  kurumSinifDetay,
  kurumSinifGuncelle,
  kurumSinifListesi,
  kurumSinifOgretmenAta,
  kurumSinifOgretmenKaldir,
  kurumSinifOlustur,
  kurumSinifSil,
} from '../services/kurum.service';

function uid(req: AuthRequest): string {
  return req.kullanici!.userId || req.kullanici!.id;
}

/** Servis çağrısını sarmalayıp tek tip yanıt döndürür */
function sar(
  calistir: (req: AuthRequest) => Promise<unknown>,
  durumKodu = 200,
) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const veri = await calistir(req);
      res.status(durumKodu).json({ basarili: true, veri });
    } catch (err) {
      next(err);
    }
  };
}

function metin(deger: unknown): string | undefined {
  return typeof deger === 'string' ? deger : undefined;
}

function sinifIdListesi(deger: unknown): string[] | undefined {
  if (!Array.isArray(deger)) return undefined;
  return deger.filter((x): x is string => typeof x === 'string');
}

export const kurumOzetController = sar((req) => kurumOzetGetir(uid(req)));

// --- Sınıflar ---
export const kurumSiniflarController = sar((req) => kurumSinifListesi(uid(req)));

export const kurumSinifOlusturController = sar(
  (req) =>
    kurumSinifOlustur(uid(req), {
      ad: metin(req.body?.ad),
      seviye: metin(req.body?.seviye),
      aciklama: metin(req.body?.aciklama),
    }),
  201,
);

export const kurumSinifDetayController = sar((req) => kurumSinifDetay(uid(req), req.params.sinifId));

export const kurumSinifGuncelleController = sar((req) =>
  kurumSinifGuncelle(uid(req), req.params.sinifId, {
    ad: metin(req.body?.ad),
    seviye: metin(req.body?.seviye),
    aciklama: metin(req.body?.aciklama),
    aktif: typeof req.body?.aktif === 'boolean' ? req.body.aktif : undefined,
  }),
);

export const kurumSinifSilController = sar((req) => kurumSinifSil(uid(req), req.params.sinifId));

export const kurumSinifOgretmenAtaController = sar((req) =>
  kurumSinifOgretmenAta(uid(req), req.params.sinifId, String(req.body?.ogretmenId || '')),
);

export const kurumSinifOgretmenKaldirController = sar((req) =>
  kurumSinifOgretmenKaldir(uid(req), req.params.sinifId, req.params.ogretmenId),
);

// --- Öğretmenler ---
export const kurumOgretmenlerController = sar((req) => kurumOgretmenListesi(uid(req)));

export const kurumOgretmenEkleController = sar(
  (req) =>
    kurumOgretmenEkle(uid(req), {
      ad: metin(req.body?.ad),
      soyad: metin(req.body?.soyad),
      email: metin(req.body?.email),
      telefon: metin(req.body?.telefon),
      sinifIds: sinifIdListesi(req.body?.sinifIds),
    }),
  201,
);

export const kurumOgretmenGuncelleController = sar((req) =>
  kurumOgretmenGuncelle(uid(req), req.params.ogretmenId, {
    ad: metin(req.body?.ad),
    soyad: metin(req.body?.soyad),
    telefon: metin(req.body?.telefon),
    aktif: typeof req.body?.aktif === 'boolean' ? req.body.aktif : undefined,
    sinifIds: sinifIdListesi(req.body?.sinifIds),
  }),
);

export const kurumOgretmenSilController = sar((req) => kurumOgretmenSil(uid(req), req.params.ogretmenId));

export const kurumOgretmenSifreController = sar((req) =>
  kurumOgretmenSifreSifirla(uid(req), req.params.ogretmenId),
);

// --- Öğrenciler ---
export const kurumOgrencilerController = sar((req) =>
  kurumOgrenciListesi(uid(req), metin(req.query.sinifId)),
);

export const kurumOgrenciHesapAcController = sar(
  (req) =>
    kurumOgrenciHesapAc(uid(req), {
      ad: metin(req.body?.ad),
      soyad: metin(req.body?.soyad),
      email: metin(req.body?.email),
      telefon: metin(req.body?.telefon),
      sinif: metin(req.body?.sinif),
      ogretimTuru: metin(req.body?.ogretimTuru),
      okul: metin(req.body?.okul),
      kurumSinifId: metin(req.body?.kurumSinifId),
    }),
  201,
);

export const kurumOgrenciBaglaController = sar((req) =>
  kurumOgrenciBagla(uid(req), {
    email: metin(req.body?.email),
    kurumSinifId: metin(req.body?.kurumSinifId),
  }),
);

export const kurumOgrenciSinifAtaController = sar((req) =>
  kurumOgrenciSinifAta(uid(req), req.params.ogrenciId, metin(req.body?.kurumSinifId) || null),
);

export const kurumOgrenciCikarController = sar((req) =>
  kurumOgrenciCikar(uid(req), req.params.ogrenciId),
);

export const kurumOgrenciSifreController = sar((req) =>
  kurumOgrenciSifreSifirla(uid(req), req.params.ogrenciId),
);
