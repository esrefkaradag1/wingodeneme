import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { ogretimTuruBelirle } from '../utils/ogretimTuru';
import { ogrenciNavSayaclari } from '../services/navSayaclari.service';

export async function profilGetirController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profil = await prisma.ogrenciProfil.findUnique({
      where: { kullaniciId: req.kullanici!.userId },
      include: { kullanici: { select: { email: true, telefon: true } } },
    });
    res.json({ basarili: true, veri: profil });
  } catch (err) { next(err); }
}

export async function profilGuncelleController(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ad, soyad, telefon, okul, sehir, ilce, sinif, hedefUniversite, hedefBolum } = req.body;
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

    await prisma.ogrenciProfil.update({
      where: { kullaniciId },
      data: {
        ad,
        soyad,
        okul,
        sehir,
        ilce,
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
