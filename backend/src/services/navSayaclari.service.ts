import { prisma } from '../config/database';
import {
  ArkadaslikDurumu,
  DestekTalebiDurum,
  DuelloDurumu,
  IletisimFormuDurum,
  OdemeDurumu,
  OgretmenOnerisiDurum,
  SoruOnayDurumu,
} from '@prisma/client';

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

async function guvenliSayi(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

const ODEME_BILDIRIMI_ISARET = 'ÖDEME_BİLDİRİMİ';

export async function adminPanelSayaclari(kullaniciId: string) {
  const [
    destek,
    bildirimler,
    iletisimFormlari,
    ogretmenOnerileri,
    kocProfil,
    kurumBasvurulari,
    soruYazariBasvurulari,
    siparisBekleyen,
    havaleOnayBekleyen,
    soruOnayBekleyen,
  ] = await Promise.all([
    guvenliSayi(() =>
      prisma.destekTalebi.count({
        where: { durum: { in: [DestekTalebiDurum.ACIK, DestekTalebiDurum.BEKLEMEDE] } },
      }),
    ),
    guvenliSayi(() => prisma.bildirim.count({ where: { kullaniciId, okundu: false } })),
    guvenliSayi(() =>
      prisma.iletisimFormu.count({
        where: { durum: IletisimFormuDurum.YENI },
      }),
    ),
    guvenliSayi(async () => {
      try {
        return await prisma.ogretmenOnerisi.count({
          where: { durum: OgretmenOnerisiDurum.YENI },
        });
      } catch {
        return 0;
      }
    }),
    prisma.kocProfil
      .findUnique({
        where: { kullaniciId },
        select: { aktif: true, referansKod: true, _count: { select: { ogrenciler: true } } },
      })
      .catch(() => null),
    guvenliSayi(() => prisma.kocProfil.count({ where: { basvuruDurum: 'BEKLEMEDE' } })),
    guvenliSayi(() => prisma.soruYazariBasvurusu.count({ where: { durum: 'YENI' } })),
    guvenliSayi(() => prisma.satinAlim.count({ where: { durum: OdemeDurumu.BEKLEMEDE } })),
    guvenliSayi(() =>
      prisma.satinAlim.count({
        where: {
          durum: OdemeDurumu.BEKLEMEDE,
          notlar: { contains: ODEME_BILDIRIMI_ISARET },
        },
      }),
    ),
    guvenliSayi(() => prisma.soru.count({ where: { onayDurumu: SoruOnayDurumu.ONAY_BEKLIYOR } })),
  ]);

  return {
    destek,
    bildirimler,
    iletisimFormlari,
    ogretmenOnerileri,
    kocYetkisi: Boolean(kocProfil?.aktif),
    kocReferansKod: kocProfil?.aktif ? kocProfil.referansKod : null,
    kocOgrenciSayisi: kocProfil?.aktif ? kocProfil._count.ogrenciler : 0,
    kurumBasvurulari,
    soruYazariBasvurulari,
    siparisBekleyen,
    havaleOnayBekleyen,
    soruOnayBekleyen,
  };
}
