import { prisma } from '../config/database';
import { ArkadaslikDurumu, DestekTalebiDurum, DuelloDurumu, IletisimFormuDurum, OgretmenOnerisiDurum, Rol } from '@prisma/client';

export async function ogrenciNavSayaclari(kullaniciId: string) {
  const profil = await prisma.ogrenciProfil.findUnique({
    where: { kullaniciId },
    select: { id: true },
  });
  if (!profil) {
    return { duyurular: 0, destek: 0, arkadaslar: 0, duello: 0 };
  }

  const [duyurular, destek, arkadaslar, duello] = await Promise.all([
    prisma.duyuruAlici.count({ where: { kullaniciId, okundu: false } }),
    prisma.destekTalebi.count({
      where: {
        ogrenciId: profil.id,
        durum: { in: [DestekTalebiDurum.ACIK, DestekTalebiDurum.BEKLEMEDE] },
      },
    }),
    prisma.arkadaslik.count({
      where: { arkadasId: profil.id, durum: ArkadaslikDurumu.BEKLIYOR },
    }),
    prisma.duello.count({
      where: { davetEdilenId: profil.id, durum: DuelloDurumu.DAVET_GONDERILDI },
    }),
  ]);

  return { duyurular, destek, arkadaslar, duello };
}

async function ogretmenOneriSayaci(): Promise<number> {
  try {
    return await prisma.ogretmenOnerisi.count({
      where: { durum: OgretmenOnerisiDurum.YENI },
    });
  } catch {
    return 0;
  }
}

export async function adminPanelSayaclari(kullaniciId: string) {
  const [destek, bildirimler, iletisimFormlari, ogretmenOnerileri] = await Promise.all([
    prisma.destekTalebi.count({
      where: { durum: { in: [DestekTalebiDurum.ACIK, DestekTalebiDurum.BEKLEMEDE] } },
    }),
    prisma.bildirim.count({ where: { kullaniciId, okundu: false } }),
    prisma.iletisimFormu.count({
      where: { durum: IletisimFormuDurum.YENI },
    }),
    ogretmenOneriSayaci(),
  ]);

  return { destek, bildirimler, iletisimFormlari, ogretmenOnerileri };
}
