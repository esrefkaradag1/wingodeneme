import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { IletisimFormuDurum, Prisma } from '@prisma/client';

export async function iletisimFormuOlustur(girdi: {
  adSoyad: unknown;
  eposta: unknown;
  konu: unknown;
  mesaj: unknown;
  kullaniciId?: string | null;
  ipAdresi?: string | null;
}) {
  const adSoyad = String(girdi.adSoyad || '').trim();
  const eposta = String(girdi.eposta || '').trim().toLowerCase();
  const konu = String(girdi.konu || '').trim();
  const mesaj = String(girdi.mesaj || '').trim();

  if (adSoyad.length < 2) throw new AppHatasi('Ad soyad en az 2 karakter olmalı', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) throw new AppHatasi('Geçerli bir e-posta adresi girin', 400);
  if (!konu) throw new AppHatasi('Konu seçin', 400);
  if (mesaj.length < 10) throw new AppHatasi('Mesaj en az 10 karakter olmalı', 400);
  if (mesaj.length > 5000) throw new AppHatasi('Mesaj en fazla 5000 karakter olabilir', 400);

  return prisma.iletisimFormu.create({
    data: {
      adSoyad,
      eposta,
      konu,
      mesaj,
      kullaniciId: girdi.kullaniciId || null,
      ipAdresi: girdi.ipAdresi || null,
    },
    select: { id: true, olusturuldu: true },
  });
}

export async function adminIletisimFormlari(params: { durum?: string; q?: string }) {
  const where: Prisma.IletisimFormuWhereInput = {};

  if (params.durum && ['YENI', 'OKUNDU', 'YANITLANDI', 'KAPANDI'].includes(params.durum)) {
    where.durum = params.durum as IletisimFormuDurum;
  }

  const q = String(params.q || '').trim();
  if (q) {
    where.OR = [
      { adSoyad: { contains: q, mode: 'insensitive' } },
      { eposta: { contains: q, mode: 'insensitive' } },
      { konu: { contains: q, mode: 'insensitive' } },
      { mesaj: { contains: q, mode: 'insensitive' } },
    ];
  }

  return prisma.iletisimFormu.findMany({
    where,
    orderBy: { olusturuldu: 'desc' },
    take: 200,
  });
}

export async function adminIletisimFormuDetay(id: string) {
  const form = await prisma.iletisimFormu.findUnique({ where: { id } });
  if (!form) throw new AppHatasi('İletişim formu bulunamadı', 404);
  return form;
}

export async function adminIletisimFormuGuncelle(
  id: string,
  girdi: { durum?: unknown; adminNotu?: unknown },
) {
  const mevcut = await prisma.iletisimFormu.findUnique({ where: { id }, select: { id: true } });
  if (!mevcut) throw new AppHatasi('İletişim formu bulunamadı', 404);

  const data: Prisma.IletisimFormuUpdateInput = {};

  if (girdi.durum !== undefined) {
    const durum = String(girdi.durum || '').trim();
    if (!['YENI', 'OKUNDU', 'YANITLANDI', 'KAPANDI'].includes(durum)) {
      throw new AppHatasi('Geçersiz durum', 400);
    }
    data.durum = durum as IletisimFormuDurum;
  }

  if (girdi.adminNotu !== undefined) {
    const not = String(girdi.adminNotu || '').trim();
    data.adminNotu = not || null;
  }

  if (Object.keys(data).length === 0) {
    throw new AppHatasi('Güncellenecek alan yok', 400);
  }

  return prisma.iletisimFormu.update({ where: { id }, data });
}
