import { prisma } from '../config/database';

/** Sipariş tamamlandığında paket veya tek sınav haklarını öğrenciye uygular */
export async function satinAlimPaketHaklariniUygula(satinAlimId: string): Promise<void> {
  const sa = await prisma.satinAlim.findUnique({
    where: { id: satinAlimId },
    include: {
      paket: true,
      sinav: true,
      kullanici: { include: { ogrenciProfil: true } },
    },
  });
  if (!sa?.kullanici.ogrenciProfil) return;

  const ogId = sa.kullanici.ogrenciProfil.id;

  if (sa.sinavId && sa.sinav) {
    await prisma.ogrenciSinavAtama.upsert({
      where: { ogrenciId_sinavId: { ogrenciId: ogId, sinavId: sa.sinavId } },
      create: {
        ogrenciId: ogId,
        sinavId: sa.sinavId,
        kaynak: 'TEK_SINAV',
        satinAlimId: sa.id,
      },
      update: { kaynak: 'TEK_SINAV', satinAlimId: sa.id },
    });
    return;
  }

  if (!sa.paket) return;

  const { sinavIds, grupIds } = sa.paket;

  for (const gid of grupIds) {
    await prisma.grupUyelik.upsert({
      where: { grupId_ogrenciId: { grupId: gid, ogrenciId: ogId } },
      create: { grupId: gid, ogrenciId: ogId },
      update: {},
    });
  }

  for (const sid of sinavIds) {
    await prisma.ogrenciSinavAtama.upsert({
      where: { ogrenciId_sinavId: { ogrenciId: ogId, sinavId: sid } },
      create: {
        ogrenciId: ogId,
        sinavId: sid,
        kaynak: 'PAKET',
        satinAlimId: sa.id,
      },
      update: { kaynak: 'PAKET', satinAlimId: sa.id },
    });
  }
}
