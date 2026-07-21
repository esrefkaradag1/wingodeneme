/**
 * KPSS kademesine göre yayındaki ücretsiz denemelere öğrenci atama.
 * Lisans / Önlisans / Ortaöğretim öğrencileri → aynı kademedeki aktif sınavlar.
 */
import { OgretimTuru, Prisma, SinavAtamaKaynak } from '@prisma/client';
import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { grupKonuOgretimTuru, kpssOgretimTuruMu } from '../utils/grupOgretimTuru';
import { logger } from '../utils/logger';

const KPSS_OGRENCI_TURLERI: OgretimTuru[] = [
  OgretimTuru.KPSS_LISANS,
  OgretimTuru.KPSS_ONLISANS,
  OgretimTuru.KPSS_ORTAOGRETIM,
];

export type KademeAtamaOzet = {
  yeniAtama: number;
  sinavSayisi: number;
  islenenSinav: Array<{ sinavId: string; baslik: string; kademe: OgretimTuru; yeni: number }>;
};

function sinavKademeCoz(sinav: {
  baslik: string;
  grup: { ad: string; tur: string } | null;
}): OgretimTuru | null {
  if (sinav.grup) {
    const efektif = grupKonuOgretimTuru(sinav.grup);
    if (efektif && KPSS_OGRENCI_TURLERI.includes(efektif)) return efektif;
  }
  const n = sinav.baslik.toLocaleLowerCase('tr-TR');
  if (n.includes('ön lisans') || n.includes('on lisans') || n.includes('önlisans') || n.includes('onlisans')) {
    return OgretimTuru.KPSS_ONLISANS;
  }
  if (n.includes('orta öğretim') || n.includes('ortaogretim') || n.includes('ortaöğretim')) {
    return OgretimTuru.KPSS_ORTAOGRETIM;
  }
  if (n.includes('lisans')) return OgretimTuru.KPSS_LISANS;
  return null;
}

function ucretsizMi(s: { satinAlinabilir: boolean; ucret: Prisma.Decimal | number | null }): boolean {
  const ucret = s.ucret == null ? 0 : Number(s.ucret);
  if (s.satinAlinabilir && ucret > 0) return false;
  return true;
}

/** Yayında, bitmemiş, ücretsiz KPSS denemeleri (soru bankası hariç) */
async function hedefKpssSinavlari() {
  const simdi = new Date();
  const adaylar = await prisma.sinav.findMany({
    where: {
      yayinlandi: true,
      aktif: true,
      baslik: { not: 'Soru Bankası (Grup)' },
      OR: [
        { tur: 'KPSS' },
        { grup: { tur: { in: [...KPSS_OGRENCI_TURLERI, OgretimTuru.KPSS] } } },
        { baslik: { startsWith: 'KPSS', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      baslik: true,
      ucret: true,
      satinAlinabilir: true,
      bitisZamani: true,
      grup: { select: { ad: true, tur: true } },
    },
    orderBy: { baslangicZamani: 'asc' },
  });

  const sonuc: Array<{
    id: string;
    baslik: string;
    kademe: OgretimTuru;
  }> = [];

  for (const s of adaylar) {
    if (s.bitisZamani && s.bitisZamani < simdi) continue;
    if (!ucretsizMi(s)) continue;
    const kademe = sinavKademeCoz({ baslik: s.baslik, grup: s.grup });
    if (!kademe) continue;
    sonuc.push({ id: s.id, baslik: s.baslik, kademe });
  }
  return sonuc;
}

async function sinavListesiCacheTemizle(): Promise<void> {
  await cache.siliModeliyle('admin:sinavlar:*');
}

/** Tek öğrenciye kademesine uygun tüm ücretsiz KPSS denemelerini atar */
export async function kpssUcretsizSinavAtaOgrenci(
  ogrenciId: string,
  ogretimTuru: OgretimTuru | string,
): Promise<{ yeni: number }> {
  if (!kpssOgretimTuruMu(ogretimTuru)) return { yeni: 0 };
  const kademe = ogretimTuru as OgretimTuru;

  const sinavlar = (await hedefKpssSinavlari()).filter((s) => s.kademe === kademe);
  if (sinavlar.length === 0) return { yeni: 0 };

  const mevcut = await prisma.ogrenciSinavAtama.findMany({
    where: { ogrenciId, sinavId: { in: sinavlar.map((s) => s.id) } },
    select: { sinavId: true },
  });
  const mevcutSet = new Set(mevcut.map((m) => m.sinavId));
  const eklenecek = sinavlar.filter((s) => !mevcutSet.has(s.id));
  if (eklenecek.length === 0) return { yeni: 0 };

  const sonuc = await prisma.ogrenciSinavAtama.createMany({
    data: eklenecek.map((s) => ({
      ogrenciId,
      sinavId: s.id,
      kaynak: SinavAtamaKaynak.MANUEL,
    })),
    skipDuplicates: true,
  });
  if (sonuc.count > 0) await sinavListesiCacheTemizle();
  return { yeni: sonuc.count };
}

/** Kayıt sonrası arka planda güvenli tetikleme */
export function kpssUcretsizSinavAtaOgrenciArkaPlan(
  ogrenciId: string | null | undefined,
  ogretimTuru: OgretimTuru | string | null | undefined,
): void {
  if (!ogrenciId || !ogretimTuru || !kpssOgretimTuruMu(ogretimTuru)) return;
  void kpssUcretsizSinavAtaOgrenci(ogrenciId, ogretimTuru).catch((err) => {
    logger.error('KPSS otomatik sınav atama hatası', { ogrenciId, ogretimTuru, err });
  });
}

/**
 * Tüm aktif KPSS öğrencilerini, kademelerine uygun yayındaki ücretsiz denemelere atar.
 * Yeni kayıt olup kaçırılanları da yakalar.
 */
export async function kpssUcretsizSinavTopluAta(): Promise<KademeAtamaOzet> {
  const sinavlar = await hedefKpssSinavlari();
  const islenenSinav: KademeAtamaOzet['islenenSinav'] = [];
  let yeniAtama = 0;

  for (const sinav of sinavlar) {
    const ogrenciler = await prisma.ogrenciProfil.findMany({
      where: {
        ogretimTuru: sinav.kademe,
        kullanici: { rol: 'OGRENCI', aktif: true },
      },
      select: { id: true },
    });
    if (ogrenciler.length === 0) {
      islenenSinav.push({ sinavId: sinav.id, baslik: sinav.baslik, kademe: sinav.kademe, yeni: 0 });
      continue;
    }

    const mevcut = await prisma.ogrenciSinavAtama.findMany({
      where: { sinavId: sinav.id, ogrenciId: { in: ogrenciler.map((o) => o.id) } },
      select: { ogrenciId: true },
    });
    const mevcutSet = new Set(mevcut.map((m) => m.ogrenciId));
    const eklenecek = ogrenciler.filter((o) => !mevcutSet.has(o.id));

    let yeni = 0;
    if (eklenecek.length > 0) {
      const sonuc = await prisma.ogrenciSinavAtama.createMany({
        data: eklenecek.map((o) => ({
          ogrenciId: o.id,
          sinavId: sinav.id,
          kaynak: SinavAtamaKaynak.MANUEL,
        })),
        skipDuplicates: true,
      });
      yeni = sonuc.count;
      yeniAtama += yeni;
    }

    islenenSinav.push({
      sinavId: sinav.id,
      baslik: sinav.baslik,
      kademe: sinav.kademe,
      yeni,
    });
  }

  if (yeniAtama > 0) await sinavListesiCacheTemizle();

  return {
    yeniAtama,
    sinavSayisi: sinavlar.length,
    islenenSinav,
  };
}
