import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { DuyuruHedefTuru, OgretimTuru, Prisma, Rol } from '@prisma/client';
import { logger } from '../utils/logger';

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

function parseKademeler(v: unknown): OgretimTuru[] {
  if (!Array.isArray(v)) return [];
  const gecerli = Object.values(OgretimTuru) as string[];
  return [...new Set(v.filter((x) => typeof x === 'string' && gecerli.includes(x)) as string[])] as OgretimTuru[];
}

/**
 * Kademe filtresi — rol bazında farklı alandan okunur:
 * öğrenci kendi kademesi, veli bağlı öğrencilerinin kademesi, öğretmen yetkili olduğu kademeler.
 * Yönetici hesapları kademesizdir; kademe seçilse de duyuruyu alır.
 */
function kademeKosulu(kademeler: OgretimTuru[]): Prisma.KullaniciWhereInput | undefined {
  if (kademeler.length === 0) return undefined;
  return {
    OR: [
      { ogrenciProfil: { ogretimTuru: { in: kademeler } } },
      { veliProfil: { ogrenciler: { some: { ogretimTuru: { in: kademeler } } } } },
      {
        adminProfil: {
          OR: [{ ogretimTuru: { in: kademeler } }, { ogretimTurleri: { hasSome: kademeler } }],
        },
      },
      { rol: { in: [Rol.ADMIN, Rol.SUPER_ADMIN] } },
    ],
  };
}

export async function duyuruOlustur(
  olusturanId: string,
  girdi: {
    baslik: unknown;
    mesaj: unknown;
    hedefTuru?: unknown;
    hedefRoller?: unknown;
    hedefOgretimTurleri?: unknown;
    kullaniciIds?: unknown;
  },
) {
  const baslik = String(girdi.baslik || '').trim();
  const mesaj = String(girdi.mesaj || '').trim();
  if (baslik.length < 3) throw new AppHatasi('Başlık en az 3 karakter olmalı', 400);
  if (mesaj.length < 2) throw new AppHatasi('Mesaj boş olamaz', 400);

  const hedefTuru = parseHedefTuru(girdi.hedefTuru);
  const hedefRoller = parseRoller(girdi.hedefRoller);
  const hedefOgretimTurleri = parseKademeler(girdi.hedefOgretimTurleri);
  const kullaniciIds = Array.isArray(girdi.kullaniciIds)
    ? (girdi.kullaniciIds.filter((x) => typeof x === 'string' && x.length > 5) as string[])
    : [];

  if (hedefTuru === DuyuruHedefTuru.ROL && hedefRoller.length === 0) {
    throw new AppHatasi('En az 1 rol seçin', 400);
  }
  if (hedefTuru === DuyuruHedefTuru.KULLANICI && kullaniciIds.length === 0) {
    throw new AppHatasi('En az 1 kullanıcı seçin', 400);
  }

  const alicilar = await hedefKullaniciListesi(hedefTuru, hedefRoller, kullaniciIds, hedefOgretimTurleri);
  if (alicilar.length === 0) {
    throw new AppHatasi(
      hedefOgretimTurleri.length > 0
        ? 'Seçilen rol ve kademe için alıcı bulunamadı'
        : 'Alıcı bulunamadı',
      400,
    );
  }

  const duyuru = await prisma.duyuru.create({
    data: {
      baslik,
      mesaj,
      hedefTuru,
      hedefRoller,
      hedefOgretimTurleri,
      olusturanId,
      alicilar: { createMany: { data: alicilar.map((k) => ({ kullaniciId: k.id })) } },
    },
    select: {
      id: true,
      baslik: true,
      mesaj: true,
      hedefTuru: true,
      hedefRoller: true,
      hedefOgretimTurleri: true,
      olusturuldu: true,
    },
  });

  // Bildirim olarak da dağıt — tek tek create yerine toplu yazım
  // (binlerce alıcıda paralel insert bağlantı havuzunu tüketiyordu)
  try {
    const parcaBoyutu = 500;
    for (let i = 0; i < alicilar.length; i += parcaBoyutu) {
      const parca = alicilar.slice(i, i + parcaBoyutu);
      await prisma.bildirim.createMany({
        data: parca.map((k) => ({
          kullaniciId: k.id,
          baslik: `📢 ${baslik}`,
          mesaj,
          tur: 'duyuru',
          veriJson: { duyuruId: duyuru.id } as Prisma.InputJsonValue,
        })),
      });
    }
  } catch (hata) {
    // Duyuru ve alıcı kayıtları oluştu; bildirim zil ikonu için ikincil
    logger.warn('Duyuru bildirimleri oluşturulamadı', hata);
  }

  // Mobil push (toplu)
  try {
    const { kullanicilaraPushGonder } = await import('./expoPush.service');
    void kullanicilaraPushGonder({
      kullaniciIdleri: alicilar.map((k) => k.id),
      baslik: `📢 ${baslik}`,
      mesaj,
      veri: { tur: 'duyuru', duyuruId: duyuru.id },
    });
  } catch (hata) {
    logger.warn('Duyuru push gönderilemedi', hata);
  }

  return { duyuru, aliciSayisi: alicilar.length };
}

async function hedefKullaniciListesi(
  hedefTuru: DuyuruHedefTuru,
  hedefRoller: Rol[],
  kullaniciIds: string[],
  kademeler: OgretimTuru[] = [],
) {
  // Kişi seçiminde kademe filtresi uygulanmaz; yönetici kimi seçtiyse ona gider
  if (hedefTuru === DuyuruHedefTuru.KULLANICI) {
    return prisma.kullanici.findMany({ where: { id: { in: kullaniciIds }, aktif: true }, select: { id: true } });
  }

  const kademe = kademeKosulu(kademeler);
  const where: Prisma.KullaniciWhereInput = {
    aktif: true,
    ...(hedefTuru === DuyuruHedefTuru.ROL ? { rol: { in: hedefRoller } } : {}),
    ...(kademe ? { AND: [kademe] } : {}),
  };

  return prisma.kullanici.findMany({ where, select: { id: true }, take: 5000 });
}

/** Gönderim öncesi alıcı sayısı ve rol dağılımı önizlemesi */
export async function duyuruAliciOnizleme(girdi: {
  hedefTuru?: unknown;
  hedefRoller?: unknown;
  hedefOgretimTurleri?: unknown;
  kullaniciIds?: unknown;
}) {
  const hedefTuru = parseHedefTuru(girdi.hedefTuru);
  const hedefRoller = parseRoller(girdi.hedefRoller);
  const kademeler = parseKademeler(girdi.hedefOgretimTurleri);
  const kullaniciIds = Array.isArray(girdi.kullaniciIds)
    ? (girdi.kullaniciIds.filter((x) => typeof x === 'string') as string[])
    : [];

  if (hedefTuru === DuyuruHedefTuru.ROL && hedefRoller.length === 0) {
    return { aliciSayisi: 0, rolDagilimi: [] as Array<{ rol: string; adet: number }> };
  }

  const kademe = kademeKosulu(kademeler);
  const where: Prisma.KullaniciWhereInput =
    hedefTuru === DuyuruHedefTuru.KULLANICI
      ? { id: { in: kullaniciIds }, aktif: true }
      : {
          aktif: true,
          ...(hedefTuru === DuyuruHedefTuru.ROL ? { rol: { in: hedefRoller } } : {}),
          ...(kademe ? { AND: [kademe] } : {}),
        };

  const dagilim = await prisma.kullanici.groupBy({
    by: ['rol'],
    where,
    _count: { _all: true },
  });

  return {
    aliciSayisi: dagilim.reduce((s, d) => s + d._count._all, 0),
    rolDagilimi: dagilim
      .map((d) => ({ rol: d.rol as string, adet: d._count._all }))
      .sort((a, b) => b.adet - a.adet),
  };
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

