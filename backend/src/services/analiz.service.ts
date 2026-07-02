import { prisma } from '../config/database';
import { cache } from '../config/redis';

export async function analizHesapla(ogrenciId: string, katilimId: string): Promise<void> {
  const katilim = await prisma.sinavKatilim.findUnique({
    where: { id: katilimId },
    include: {
      cevaplar: {
        include: { soru: { include: { konu: true } } },
      },
    },
  });

  if (!katilim) return;

  const konuSonuclari = new Map<string, { konuId: string; dogru: number; yanlis: number; toplam: number }>();

  for (const cevap of katilim.cevaplar) {
    const konuId = cevap.soru.konuId;
    const mevcut = konuSonuclari.get(konuId) || { konuId, dogru: 0, yanlis: 0, toplam: 0 };

    mevcut.toplam++;
    if (cevap.dogru === true) mevcut.dogru++;
    else if (cevap.dogru === false) mevcut.yanlis++;

    konuSonuclari.set(konuId, mevcut);
  }

  for (const [konuId, sonuc] of konuSonuclari) {
    const basari = sonuc.toplam > 0 ? (sonuc.dogru / sonuc.toplam) * 100 : 0;

    await prisma.konuPerformansi.upsert({
      where: { ogrenciId_konuId: { ogrenciId, konuId } },
      update: {
        toplamSoru: { increment: sonuc.toplam },
        dogruSayisi: { increment: sonuc.dogru },
        yanlisSayisi: { increment: sonuc.yanlis },
        basariYuzdesi: parseFloat(basari.toFixed(2)),
      },
      create: {
        ogrenciId,
        konuId,
        toplamSoru: sonuc.toplam,
        dogruSayisi: sonuc.dogru,
        yanlisSayisi: sonuc.yanlis,
        basariYuzdesi: parseFloat(basari.toFixed(2)),
      },
    });
  }

  // Zayıf konuları belirle ve öneri üret
  const konuPerformanslari = await prisma.konuPerformansi.findMany({
    where: { ogrenciId },
    include: { konu: true }
  });

  const zayiflar = konuPerformanslari
    .filter(kp => kp.basariYuzdesi < 50)
    .map(kp => ({ konu: kp.konu.ad, ders: kp.konu.ders, basari: kp.basariYuzdesi }));

  if (zayiflar.length > 0) {
    const { oneriUret } = require('./oneri.service');
    await oneriUret({ ogrenciId, zayifKonular: zayiflar });
  }

  // Cache temizle
  await cache.sil(`analiz:${ogrenciId}`);
}

export async function ogrenciAnalizGetir(ogrenciId: string) {
  const cacheAnahtar = `analiz:${ogrenciId}`;
  const cachedVeri = await cache.al(cacheAnahtar);
  if (cachedVeri) return cachedVeri;

  const [katilimlar, konuPerformanslari, ogrenci] = await Promise.all([
    prisma.sinavKatilim.findMany({
      where: { ogrenciId, durum: 'TAMAMLANDI' },
      orderBy: { olusturuldu: 'desc' },
      take: 10,
      include: {
        sinav: { select: { baslik: true, tur: true, baslangicZamani: true, sureDakika: true } },
        cevaplar: {
          select: {
            soruId: true,
            sureMs: true,
            dogru: true,
            soru: { select: { siraNo: true, konu: { select: { ad: true, ders: true } } } },
          },
        },
      },
    }),
    prisma.konuPerformansi.findMany({
      where: { ogrenciId },
      include: { konu: true },
      orderBy: { basariYuzdesi: 'asc' },
    }),
    prisma.ogrenciProfil.findUnique({ where: { id: ogrenciId } }),
  ]);

  const toplamSinav = katilimlar.length;
  const ortalamaNe = toplamSinav > 0
    ? katilimlar.reduce((sum, k) => sum + k.netPuan, 0) / toplamSinav
    : 0;
  const enIyiSiralama = Math.min(...katilimlar.map((k) => k.ulusalSiralama || 999999));

  const zayifKonular = konuPerformanslari
    .filter((k) => k.basariYuzdesi < 50)
    .map((k) => ({ konu: k.konu.ad, ders: k.konu.ders, basari: k.basariYuzdesi }));

  const dersPerformanslari = gruptaDersPerformanslari(konuPerformanslari);

  const sureAnalizleri = katilimlar
    .map((k) => katilimSureAnaliziOlustur(k))
    .filter((s) => s.kayitliSoruSayisi > 0);

  const sinavGecmisi = katilimlar.map(({ cevaplar: _cevaplar, ...rest }) => rest);

  const sonuc = {
    toplamSinav,
    ortalamaNe: parseFloat(ortalamaNe.toFixed(2)),
    enIyiSiralama: enIyiSiralama === 999999 ? null : enIyiSiralama,
    sinavGecmisi,
    sureAnalizleri,
    zayifKonular,
    dersPerformanslari,
    konuPerformanslari: konuPerformanslari.map((k) => ({
      ders: k.konu.ders,
      konu: k.konu.ad,
      basari: k.basariYuzdesi,
      toplamSoru: k.toplamSoru,
    })),
  };

  await cache.yaz(cacheAnahtar, sonuc, 600);
  return sonuc;
}

function gruptaDersPerformanslari(konuPerformanslari: Array<{ konu: { ders: string }; basariYuzdesi: number; toplamSoru: number }>) {
  const dersMap = new Map<string, { toplamBasari: number; konuSayisi: number; toplamSoru: number }>();

  for (const kp of konuPerformanslari) {
    const ders = kp.konu.ders;
    const mevcut = dersMap.get(ders) || { toplamBasari: 0, konuSayisi: 0, toplamSoru: 0 };
    mevcut.toplamBasari += kp.basariYuzdesi;
    mevcut.konuSayisi++;
    mevcut.toplamSoru += kp.toplamSoru;
    dersMap.set(ders, mevcut);
  }

  return Array.from(dersMap.entries()).map(([ders, veri]) => ({
    ders,
    ortalama: parseFloat((veri.toplamBasari / veri.konuSayisi).toFixed(2)),
    toplamSoru: veri.toplamSoru,
  }));
}

type KatilimSureGirdisi = {
  id: string;
  netPuan: number;
  sinav: { baslik: string; tur: string; sureDakika: number };
  cevaplar: Array<{
    soruId: string;
    sureMs: number | null;
    dogru: boolean | null;
    soru: { siraNo: number; konu: { ad: string; ders: string } };
  }>;
};

export function katilimSureAnaliziOlustur(katilim: KatilimSureGirdisi) {
  const soruSureleri = katilim.cevaplar
    .map((c) => ({
      soruId: c.soruId,
      siraNo: c.soru.siraNo,
      ders: c.soru.konu.ders,
      konu: c.soru.konu.ad,
      sureMs: c.sureMs,
      dogru: c.dogru,
    }))
    .sort((a, b) => a.siraNo - b.siraNo);

  const kayitli = soruSureleri.filter((s) => s.sureMs != null && s.sureMs > 0);
  const toplamSureMs = kayitli.reduce((a, s) => a + (s.sureMs || 0), 0);
  const toplamSoruSayisi = soruSureleri.length;
  const oneriSureMsPerSoru =
    toplamSoruSayisi > 0
      ? Math.round((katilim.sinav.sureDakika * 60 * 1000) / toplamSoruSayisi)
      : null;

  return {
    katilimId: katilim.id,
    sinavBaslik: katilim.sinav.baslik,
    sinavTur: katilim.sinav.tur,
    netPuan: katilim.netPuan,
    toplamSureMs,
    ortalamaSureMs: kayitli.length > 0 ? Math.round(toplamSureMs / kayitli.length) : null,
    kayitliSoruSayisi: kayitli.length,
    toplamSoruSayisi,
    oneriSureMsPerSoru,
    enYavasSorular: [...kayitli].sort((a, b) => (b.sureMs ?? 0) - (a.sureMs ?? 0)).slice(0, 5),
    soruSureleri,
  };
}

export async function ulusalKarsilastirmaGetir(sinavId: string, ogrenciId: string) {
  const [katilim, istatistik] = await Promise.all([
    prisma.sinavKatilim.findUnique({ where: { sinavId_ogrenciId: { sinavId, ogrenciId } } }),
    prisma.sinavKatilim.aggregate({
      where: { sinavId, durum: 'TAMAMLANDI' },
      _avg: { netPuan: true, dogruSayisi: true },
      _max: { netPuan: true },
      _min: { netPuan: true },
      _count: true,
    }),
  ]);

  return {
    benim: katilim,
    ulusal: {
      ortalamaNe: istatistik._avg.netPuan,
      enYuksekNe: istatistik._max.netPuan,
      enDusukNe: istatistik._min.netPuan,
      toplamKatilimci: istatistik._count,
    },
  };
}
