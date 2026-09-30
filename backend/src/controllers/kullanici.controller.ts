import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { ogretimTuruBelirle } from '../utils/ogretimTuru';
import { ogrenciNavSayaclari } from '../services/navSayaclari.service';
import { tcKimlikNoGecerliMi, tcKimlikNoNormalize } from '../utils/tcKimlik';

export async function profilGetirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await prisma.ogrenciProfil.findUnique({
      where: { kullaniciId: req.kullanici!.userId },
      include: {
        kullanici: { select: { email: true, telefon: true } },
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
    });
    res.json({ basarili: true, veri: profil });
  } catch (err) { next(err); }
}

export async function profilGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      ad, soyad, telefon, okul, sehir, ilce, adres, tcKimlikNo,
      sinif, hedefUniversite, hedefBolum,
    } = req.body;
    const kullaniciId = req.kullanici!.userId;
    const mevcut = await prisma.ogrenciProfil.findUnique({
      where: { kullaniciId },
      select: { ogretimTuru: true },
    });
    const ogretimTuru =
      sinif !== undefined
        ? ogretimTuruBelirle(sinif, mevcut?.ogretimTuru)
        : undefined;

    if (telefon !== undefined && telefon !== null && String(telefon).trim()) {
      const baska = await prisma.kullanici.findFirst({
        where: { telefon: String(telefon).trim(), NOT: { id: kullaniciId } },
        select: { id: true },
      });
      if (baska) throw new AppHatasi('Bu telefon numarası başka bir hesapta kayıtlı', 400);
    }

    let tcNorm: string | null | undefined = undefined;
    if (tcKimlikNo !== undefined) {
      if (tcKimlikNo === null || String(tcKimlikNo).trim() === '') {
        tcNorm = null;
      } else {
        tcNorm = tcKimlikNoNormalize(tcKimlikNo);
        if (!tcKimlikNoGecerliMi(tcNorm)) {
          throw new AppHatasi('Geçerli bir TC kimlik numarası girin', 400);
        }
      }
    }

    await prisma.ogrenciProfil.update({
      where: { kullaniciId },
      data: {
        ad,
        soyad,
        okul,
        sehir,
        ilce,
        ...(adres !== undefined
          ? { adres: typeof adres === 'string' ? adres.trim() || null : null }
          : {}),
        ...(tcNorm !== undefined ? { tcKimlikNo: tcNorm } : {}),
        sinif,
        hedefUniversite,
        hedefBolum,
        ...(ogretimTuru ? { ogretimTuru } : {}),
      },
    });

    if (telefon !== undefined) {
      await prisma.kullanici.update({
        where: { id: kullaniciId },
        data: { telefon: telefon ? String(telefon).trim() : null },
      });
    }

    const profil = await prisma.ogrenciProfil.findUnique({
      where: { kullaniciId },
      include: { kullanici: { select: { email: true, telefon: true } } },
    });
    res.json({ basarili: true, veri: profil });
  } catch (err) { next(err); }
}

const AVATAR_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

/** POST /profil/avatar — profil fotoğrafı yükle (multipart: dosya) */
export async function profilAvatarYukleController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dosya = req.file;
    if (!dosya?.buffer?.length) {
      throw new AppHatasi('Fotoğraf dosyası gerekli', 400);
    }
    const mimeHam = String(dosya.mimetype || '').toLowerCase();
    if (!AVATAR_MIME.has(mimeHam)) {
      throw new AppHatasi('Sadece JPEG, PNG veya WebP yükleyebilirsiniz', 400);
    }

    const kullaniciId = req.kullanici!.userId;
    const profil = await prisma.ogrenciProfil.findUnique({
      where: { kullaniciId },
      select: { id: true },
    });
    if (!profil) throw new AppHatasi('Öğrenci profili bulunamadı', 404);

    // HEIC vb. yerine mümkünse jpeg/png/webp tut; mobil Image için jpeg tercih
    const mime = mimeHam.includes('png')
      ? 'image/png'
      : mimeHam.includes('webp')
        ? 'image/webp'
        : 'image/jpeg';
    const uzanti = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';

    let avatarUrl: string;
    try {
      const { supabaseBufferYukle } = await import('../utils/supabaseStorage');
      const { getSupabaseAdmin, egitimStorageBucket } = await import('../config/supabaseAdmin');
      const key = `avatars/${kullaniciId}/${Date.now()}${uzanti}`;
      const admin = getSupabaseAdmin();
      if (!admin) throw new Error('Supabase yok');
      const bucket = egitimStorageBucket();
      const { error } = await admin.storage.from(bucket).upload(key, dosya.buffer, {
        contentType: mime,
        upsert: true,
        cacheControl: '3600',
      });
      if (error) throw new Error(error.message);
      // Public URL (bucket public ise)
      const pub = admin.storage.from(bucket).getPublicUrl(key).data.publicUrl;
      // İmzalı URL her zaman okunabilir — Image için daha güvenilir
      const signed = await admin.storage.from(bucket).createSignedUrl(key, 60 * 60 * 24 * 365 * 5);
      avatarUrl = signed.data?.signedUrl || pub;
      if (!avatarUrl) {
        avatarUrl = await supabaseBufferYukle(dosya.buffer, mime, uzanti, `avatars/${kullaniciId}`);
      }
    } catch {
      const { s3DosyaYukle } = await import('../utils/s3');
      avatarUrl = await s3DosyaYukle(dosya.buffer, `avatar${uzanti}`, mime, `avatars/${kullaniciId}`);
    }

    if (!avatarUrl) throw new AppHatasi('Fotoğraf yüklenemedi', 500);

    const guncel = await prisma.ogrenciProfil.update({
      where: { kullaniciId },
      data: { avatarUrl },
      select: { avatarUrl: true, ad: true, soyad: true },
    });

    res.json({ basarili: true, veri: guncel, mesaj: 'Profil fotoğrafı güncellendi' });
  } catch (err) {
    next(err);
  }
}

export async function profilSifreDegistirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mevcutSifre, yeniSifre } = req.body as { mevcutSifre?: string; yeniSifre?: string };
    if (!mevcutSifre || !yeniSifre) {
      throw new AppHatasi('Mevcut ve yeni şifre gereklidir', 400);
    }
    if (yeniSifre.length < 8) {
      throw new AppHatasi('Yeni şifre en az 8 karakter olmalı', 400);
    }
    if (!/[A-Z]/.test(yeniSifre) || !/[0-9]/.test(yeniSifre)) {
      throw new AppHatasi('Yeni şifre en az bir büyük harf ve bir rakam içermeli', 400);
    }

    const kullanici = await prisma.kullanici.findUnique({
      where: { id: req.kullanici!.userId },
      select: { sifre: true },
    });
    if (!kullanici) {
      throw new AppHatasi('Kullanıcı bulunamadı', 404);
    }

    const gecerli = await bcrypt.compare(mevcutSifre, kullanici.sifre);
    if (!gecerli) {
      throw new AppHatasi('Mevcut şifre hatalı', 400);
    }

    const sifreHash = await bcrypt.hash(yeniSifre, 12);
    await prisma.kullanici.update({
      where: { id: req.kullanici!.userId },
      data: { sifre: sifreHash },
    });

    res.json({ basarili: true, mesaj: 'Şifreniz güncellendi' });
  } catch (err) {
    next(err);
  }
}

export async function studyPlanlarGetirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await prisma.ogrenciProfil.findUnique({
      where: { kullaniciId: req.kullanici!.userId },
      select: { id: true },
    });

    if (!profil) {
      res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' });
      return;
    }

    const planlar = await prisma.studyPlan.findMany({
      where: { ogrenciId: profil.id },
      orderBy: { olusturuldu: 'desc' },
      include: {
        gorevler: {
          orderBy: [{ gun: 'asc' }, { olusturuldu: 'asc' }],
        },
      },
    });

    res.json({ basarili: true, veri: planlar });
  } catch (err) {
    next(err);
  }
}

export async function studyGorevDurumGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { gorevId } = req.params;
    const { tamamlandi } = req.body as { tamamlandi?: boolean };

    if (typeof tamamlandi !== 'boolean') {
      res.status(400).json({ basarili: false, mesaj: 'tamamlandi alanı boolean olmalıdır' });
      return;
    }

    const profil = await prisma.ogrenciProfil.findUnique({
      where: { kullaniciId: req.kullanici!.userId },
      select: { id: true },
    });

    if (!profil) {
      res.status(404).json({ basarili: false, mesaj: 'Öğrenci profili bulunamadı' });
      return;
    }

    const mevcutGorev = await prisma.studyGorev.findFirst({
      where: {
        id: gorevId,
        plan: { ogrenciId: profil.id },
      },
      select: { id: true },
    });

    if (!mevcutGorev) {
      res.status(404).json({ basarili: false, mesaj: 'Görev bulunamadı' });
      return;
    }

    const guncellenen = await prisma.studyGorev.update({
      where: { id: gorevId },
      data: { tamamlandi },
    });

    res.json({ basarili: true, veri: guncellenen });
  } catch (err) {
    next(err);
  }
}

export async function navSayaclariController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const veri = await ogrenciNavSayaclari(req.kullanici!.userId);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

export async function kocReferansBaglaController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ogrenciKocReferansBagla } = await import('../services/koc.service');
    const kod = typeof req.body?.referansKod === 'string' ? req.body.referansKod : '';
    const veri = await ogrenciKocReferansBagla(req.kullanici!.userId, kod);
    res.json({ basarili: true, veri });
  } catch (err) {
    next(err);
  }
}

/** Mobil Expo Push / FCM token kaydı (Kullanici.fcmToken) */
export async function pushTokenKaydetController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tokenHam = req.body?.token ?? req.body?.fcmToken ?? req.body?.pushToken;
    const token =
      typeof tokenHam === 'string' && tokenHam.trim() ? tokenHam.trim() : null;

    if (token && token.length > 512) {
      throw new AppHatasi('Geçersiz push token', 400);
    }

    await prisma.kullanici.update({
      where: { id: req.kullanici!.userId },
      data: { fcmToken: token },
    });

    res.json({ basarili: true, veri: { kaydedildi: Boolean(token) } });
  } catch (err) {
    next(err);
  }
}

/** DELETE /push-token — cihaz token’ını sil */
export async function pushTokenSilController(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await prisma.kullanici.update({
      where: { id: req.kullanici!.userId },
      data: { fcmToken: null },
    });
    res.json({ basarili: true, veri: { kaydedildi: false } });
  } catch (err) {
    next(err);
  }
}
