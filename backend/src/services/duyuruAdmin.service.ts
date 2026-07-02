import { prisma } from '../config/database';

export async function duyuruAdminListele(q: string) {
  const where = q
    ? {
        OR: [
          { baslik: { contains: q, mode: 'insensitive' as any } },
          { mesaj: { contains: q, mode: 'insensitive' as any } },
        ],
      }
    : undefined;

  const duyurular = await prisma.duyuru.findMany({
    where,
    orderBy: { olusturuldu: 'desc' },
    take: 50,
    include: {
      _count: { select: { alicilar: true } },
      olusturan: { select: { id: true, email: true, rol: true } },
    },
  });

  const ids = duyurular.map((d) => d.id);
  const okunduSayilari = await prisma.duyuruAlici.groupBy({
    by: ['duyuruId', 'okundu'],
    where: { duyuruId: { in: ids } },
    _count: true,
  });

  const map = new Map<string, { okundu: number; okunmadi: number }>();
  for (const row of okunduSayilari as any[]) {
    const cur = map.get(row.duyuruId) || { okundu: 0, okunmadi: 0 };
    if (row.okundu) cur.okundu = row._count;
    else cur.okunmadi = row._count;
    map.set(row.duyuruId, cur);
  }

  return duyurular.map((d) => ({
    id: d.id,
    baslik: d.baslik,
    mesaj: d.mesaj,
    hedefTuru: d.hedefTuru,
    hedefRoller: d.hedefRoller,
    olusturuldu: d.olusturuldu,
    olusturan: d.olusturan,
    aliciToplam: d._count?.alicilar || 0,
    okundu: map.get(d.id)?.okundu || 0,
    okunmadi: map.get(d.id)?.okunmadi || 0,
  }));
}

export async function duyuruAlicilar(duyuruId: string) {
  const alicilar = await prisma.duyuruAlici.findMany({
    where: { duyuruId },
    orderBy: [{ okundu: 'asc' }, { olusturuldu: 'desc' }],
    take: 500,
    include: {
      kullanici: {
        select: {
          id: true,
          email: true,
          rol: true,
          ogrenciProfil: { select: { ad: true, soyad: true } },
          veliProfil: { select: { ad: true, soyad: true } },
          adminProfil: { select: { ad: true, soyad: true } },
        },
      },
    },
  });
  return alicilar.map((a) => ({
    id: a.id,
    okundu: a.okundu,
    okunduAt: a.okunduAt,
    kullanici: a.kullanici,
  }));
}

