import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { OgretmenOnerisiDurum, Prisma } from '@prisma/client';
import {
  OgretmenOneriGorsel,
  ogretmenOneriGorselKaydet,
  ogretmenOneriGorselKabulMu,
  ogretmenOneriGorselUrlCoz,
} from '../utils/ogretmenOneriDeposu';

const API_TABAN = '/api/v1';

function gorselleriCoz(raw: unknown): OgretmenOneriGorsel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g) => g && typeof g === 'object')
    .map((g) => {
      const kayit = g as OgretmenOneriGorsel;
      return {
        ...kayit,
        url: ogretmenOneriGorselUrlCoz(String(kayit.url || ''), API_TABAN),
      };
    });
}

function ogretmenAdi(kullanici: {
  email: string;
  adminProfil: { ad: string; soyad: string } | null;
}): string {
  if (kullanici.adminProfil) {
    return `${kullanici.adminProfil.ad} ${kullanici.adminProfil.soyad}`.trim();
  }
  return kullanici.email;
}

const kullaniciSec = {
  id: true,
  email: true,
  rol: true,
  adminProfil: { select: { ad: true, soyad: true, brans: true } },
} as const;

export async function ogretmenOnerisiOlustur(
  kullaniciId: string,
  girdi: {
    baslik?: unknown;
    mesaj?: unknown;
    sayfaYolu?: unknown;
  },
  dosyalar: Express.Multer.File[] = [],
) {
  const baslik = String(girdi.baslik || '').trim() || null;
  const mesaj = String(girdi.mesaj || '').trim();
  const sayfaYolu = String(girdi.sayfaYolu || '').trim() || null;

  if (mesaj.length < 10) throw new AppHatasi('Öneriniz en az 10 karakter olmalı', 400);
  if (mesaj.length > 8000) throw new AppHatasi('Öneri en fazla 8000 karakter olabilir', 400);
  if (baslik && baslik.length > 200) throw new AppHatasi('Başlık en fazla 200 karakter olabilir', 400);
  if (dosyalar.length > 5) throw new AppHatasi('En fazla 5 görsel ekleyebilirsiniz', 400);

  for (const dosya of dosyalar) {
    if (!ogretmenOneriGorselKabulMu(dosya.mimetype)) {
      throw new AppHatasi('Yalnızca JPG, PNG, WEBP veya GIF görselleri yüklenebilir', 400);
    }
  }

  const oneri = await prisma.ogretmenOnerisi.create({
    data: {
      kullaniciId,
      baslik,
      mesaj,
      sayfaYolu,
      gorseller: [],
    },
    select: { id: true, olusturuldu: true },
  });

  const gorseller: OgretmenOneriGorsel[] = [];
  for (const dosya of dosyalar) {
    const kayit = await ogretmenOneriGorselKaydet(oneri.id, dosya.buffer, dosya.originalname, dosya.mimetype);
    gorseller.push(kayit);
  }

  if (gorseller.length > 0) {
    await prisma.ogretmenOnerisi.update({
      where: { id: oneri.id },
      data: { gorseller: gorseller as unknown as Prisma.InputJsonValue },
    });
  }

  return { ...oneri, gorselSayisi: gorseller.length };
}

export async function adminOgretmenOnerileri(params: { durum?: string; q?: string }) {
  const where: Prisma.OgretmenOnerisiWhereInput = {};

  if (params.durum && ['YENI', 'OKUNDU', 'INCELENIYOR', 'TAMAMLANDI', 'KAPANDI'].includes(params.durum)) {
    where.durum = params.durum as OgretmenOnerisiDurum;
  }

  const q = String(params.q || '').trim();
  if (q) {
    where.OR = [
      { mesaj: { contains: q, mode: 'insensitive' } },
      { baslik: { contains: q, mode: 'insensitive' } },
      { sayfaYolu: { contains: q, mode: 'insensitive' } },
      { kullanici: { email: { contains: q, mode: 'insensitive' } } },
      { kullanici: { adminProfil: { ad: { contains: q, mode: 'insensitive' } } } },
      { kullanici: { adminProfil: { soyad: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const kayitlar = await prisma.ogretmenOnerisi.findMany({
    where,
    orderBy: { olusturuldu: 'desc' },
    take: 200,
    include: { kullanici: { select: kullaniciSec } },
  });

  return kayitlar.map((k) => ({
    ...k,
    ogretmenAdi: ogretmenAdi(k.kullanici),
    gorseller: gorselleriCoz(k.gorseller),
  }));
}

export async function adminOgretmenOnerisiDetay(id: string) {
  const kayit = await prisma.ogretmenOnerisi.findUnique({
    where: { id },
    include: { kullanici: { select: kullaniciSec } },
  });
  if (!kayit) throw new AppHatasi('Öneri bulunamadı', 404);

  return {
    ...kayit,
    ogretmenAdi: ogretmenAdi(kayit.kullanici),
    gorseller: gorselleriCoz(kayit.gorseller),
  };
}

export async function adminOgretmenOnerisiGuncelle(
  id: string,
  girdi: { durum?: unknown; adminNotu?: unknown },
) {
  const mevcut = await prisma.ogretmenOnerisi.findUnique({ where: { id }, select: { id: true } });
  if (!mevcut) throw new AppHatasi('Öneri bulunamadı', 404);

  const data: Prisma.OgretmenOnerisiUpdateInput = {};

  if (girdi.durum !== undefined) {
    const durum = String(girdi.durum || '').trim();
    if (!['YENI', 'OKUNDU', 'INCELENIYOR', 'TAMAMLANDI', 'KAPANDI'].includes(durum)) {
      throw new AppHatasi('Geçersiz durum', 400);
    }
    data.durum = durum as OgretmenOnerisiDurum;
  }

  if (girdi.adminNotu !== undefined) {
    const not = String(girdi.adminNotu || '').trim();
    data.adminNotu = not || null;
  }

  if (Object.keys(data).length === 0) {
    throw new AppHatasi('Güncellenecek alan yok', 400);
  }

  const guncel = await prisma.ogretmenOnerisi.update({
    where: { id },
    data,
    include: { kullanici: { select: kullaniciSec } },
  });

  return {
    ...guncel,
    ogretmenAdi: ogretmenAdi(guncel.kullanici),
    gorseller: gorselleriCoz(guncel.gorseller),
  };
}
