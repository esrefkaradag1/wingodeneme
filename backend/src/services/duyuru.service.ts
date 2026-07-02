import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { DuyuruHedefTuru, Rol } from '@prisma/client';
import { bildirimGonder } from './bildirim.service';

function parseHedefTuru(v: unknown): DuyuruHedefTuru {
  if (typeof v !== 'string') return DuyuruHedefTuru.TUMU;
  const s = v.toUpperCase();
  if ((Object.values(DuyuruHedefTuru) as string[]).includes(s)) return s as DuyuruHedefTuru;
  return DuyuruHedefTuru.TUMU;
}

function parseRoller(v: unknown): Rol[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === 'string' && (Object.values(Rol) as string[]).includes(x))
    .map((x) => x as Rol);
}

export async function duyuruOlustur(
  olusturanId: string,
  girdi: { baslik: unknown; mesaj: unknown; hedefTuru?: unknown; hedefRoller?: unknown; kullaniciIds?: unknown },
) {
  const baslik = String(girdi.baslik || '').trim();
  const mesaj = String(girdi.mesaj || '').trim();
  if (baslik.length < 3) throw new AppHatasi('Başlık en az 3 karakter olmalı', 400);
  if (mesaj.length < 2) throw new AppHatasi('Mesaj boş olamaz', 400);

  const hedefTuru = parseHedefTuru(girdi.hedefTuru);
  const hedefRoller = parseRoller(girdi.hedefRoller);
  const kullaniciIds = Array.isArray(girdi.kullaniciIds)
    ? (girdi.kullaniciIds.filter((x) => typeof x === 'string' && x.length > 5) as string[])
    : [];

  if (hedefTuru === DuyuruHedefTuru.ROL && hedefRoller.length === 0) {
    throw new AppHatasi('En az 1 rol seçin', 400);
  }
  if (hedefTuru === DuyuruHedefTuru.KULLANICI && kullaniciIds.length === 0) {
    throw new AppHatasi('En az 1 kullanıcı seçin', 400);
  }

  const alicilar = await hedefKullaniciListesi(hedefTuru, hedefRoller, kullaniciIds);
  if (alicilar.length === 0) throw new AppHatasi('Alıcı bulunamadı', 400);

  const duyuru = await prisma.duyuru.create({
    data: {
      baslik,
      mesaj,
      hedefTuru,
      hedefRoller,
      olusturanId,
      alicilar: { createMany: { data: alicilar.map((k) => ({ kullaniciId: k.id })) } },
    },
    select: { id: true, baslik: true, mesaj: true, hedefTuru: true, hedefRoller: true, olusturuldu: true },
  });

  // Bildirim olarak da dağıt
  await Promise.all(
    alicilar.slice(0, 2000).map((k) =>
      bildirimGonder({
        kullaniciId: k.id,
        baslik: `📢 ${baslik}`,
        mesaj,
        tur: 'duyuru',
        veriJson: { duyuruId: duyuru.id },
      })
    )
  );

  return { duyuru, aliciSayisi: alicilar.length };
}

async function hedefKullaniciListesi(hedefTuru: DuyuruHedefTuru, hedefRoller: Rol[], kullaniciIds: string[]) {
  if (hedefTuru === DuyuruHedefTuru.KULLANICI) {
    return prisma.kullanici.findMany({ where: { id: { in: kullaniciIds }, aktif: true }, select: { id: true } });
  }
  if (hedefTuru === DuyuruHedefTuru.ROL) {
    return prisma.kullanici.findMany({ where: { rol: { in: hedefRoller }, aktif: true }, select: { id: true } });
  }
  // TUMU: aktif tüm kullanıcılar (çok büyüyebilir — 2k ile sınırlı bildirim dağıtımı yapıyoruz)
  return prisma.kullanici.findMany({ where: { aktif: true }, select: { id: true }, take: 5000 });
}

export async function duyurularim(kullaniciId: string) {
  return prisma.duyuruAlici.findMany({
    where: { kullaniciId },
    orderBy: { olusturuldu: 'desc' },
    take: 100,
    include: { duyuru: { select: { id: true, baslik: true, mesaj: true, olusturuldu: true } } },
  });
}

export async function duyuruOku(kullaniciId: string, duyuruId: string) {
  await prisma.duyuruAlici.update({
    where: { duyuruId_kullaniciId: { duyuruId, kullaniciId } },
    data: { okundu: true, okunduAt: new Date() },
  });
}

