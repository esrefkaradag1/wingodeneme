import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  adminKocAdaylari,
  adminKocDemoUzat,
  adminKocDurumDegistir,
  adminKocOnayla,
  adminKocReddet,
  adminKurumDetay,
  adminKocGuncelle,
  adminKocListesi,
  adminKocOgrenciAta,
  adminKocOgrenciKaldir,
  adminKocOgrencileri,
  adminKocYetkiKaldir,
  adminKocYetkiVer,
} from '../services/koc.service';
import { adminKurumHesabiOlustur, adminKurumSifreSifirla } from '../services/kurum.service';

function metin(deger: unknown): string | undefined {
  return typeof deger === 'string' ? deger : undefined;
}

export async function adminKocListesiController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocListesi(metin(req.query.q), metin(req.query.durum), metin(req.query.kapsam));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocAdaylariController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocAdaylari(metin(req.query.q));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocYetkiVerController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { kullaniciId, tip, kurumAdi, ad, soyad, telefon } = req.body ?? {};
    const veri = await adminKocYetkiVer(String(kullaniciId || ''), {
      tip: metin(tip),
      kurumAdi: metin(kurumAdi),
      ad: metin(ad),
      soyad: metin(soyad),
      telefon: metin(telefon),
    });
    res.status(201).json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tip, kurumAdi, ad, soyad, telefon, aktif } = req.body ?? {};
    const veri = await adminKocGuncelle(req.params.kocId, {
      tip: metin(tip),
      kurumAdi: metin(kurumAdi),
      ad: metin(ad),
      soyad: metin(soyad),
      telefon: metin(telefon),
      aktif: typeof aktif === 'boolean' ? aktif : undefined,
    });
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocYetkiKaldirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocYetkiKaldir(req.params.kocId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocOgrencileriController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocOgrencileri(req.params.kocId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocOgrenciAtaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocOgrenciAta(req.params.kocId, String(req.body?.email || ''));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocOgrenciKaldirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocOgrenciKaldir(req.params.kocId, req.params.ogrenciId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocOnaylaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const demoGun = req.body?.demoGun;
    const veri = await adminKocOnayla(req.params.kocId, demoGun === undefined ? null : Number(demoGun));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocReddetController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocReddet(req.params.kocId, metin(req.body?.neden));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocDurumController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocDurumDegistir(
      req.params.kocId,
      String(req.body?.durum || ''),
      metin(req.body?.not),
    );
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKocDemoUzatController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKocDemoUzat(req.params.kocId, Number(req.body?.gun));
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKurumDetayController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKurumDetay(req.params.kocId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKurumOlusturController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { kurumAdi, ad, soyad, email, telefon, sehir, beklenenOgrenci, demoGun } = req.body ?? {};
    const veri = await adminKurumHesabiOlustur({
      kurumAdi: metin(kurumAdi),
      ad: metin(ad),
      soyad: metin(soyad),
      email: metin(email),
      telefon: metin(telefon),
      sehir: metin(sehir),
      beklenenOgrenci: beklenenOgrenci as number | string | undefined,
      demoGun: demoGun as number | string | null | undefined,
    });
    res.status(201).json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function adminKurumSifreSifirlaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await adminKurumSifreSifirla(req.params.kocId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}
