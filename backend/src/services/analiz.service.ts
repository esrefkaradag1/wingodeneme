import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { platformSinavTurleri } from '../utils/netHesapla';
import { OgretimTuru, KatilimDurumu } from '@prisma/client';
import { SIRALAMA_HAVUZ_BOYUTU, tahminiSiralamaHesapla } from '../utils/tahminiSiralama';

const KPSS_OGRETIM: OgretimTuru[] = [
  OgretimTuru.KPSS,
  OgretimTuru.KPSS_LISANS,
  OgretimTuru.KPSS_ONLISANS,
  OgretimTuru.KPSS_ORTAOGRETIM,
];

const YKS_LGS_OGRETIM: OgretimTuru[] = [
  OgretimTuru.YKS,
  OgretimTuru.LGS,
  OgretimTuru.SINIF_6,
  OgretimTuru.SINIF_7,
  OgretimTuru.SINIF_9,
  OgretimTuru.SINIF_10,
  OgretimTuru.SINIF_11,
];

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
    const mevcut = await prisma.konuPerformansi.findUnique({
      where: { ogrenciId_konuId: { ogrenciId, konuId } },
    });

    const yeniToplam = (mevcut?.toplamSoru ?? 0) + sonuc.toplam;
    const yeniDogru = (mevcut?.dogruSayisi ?? 0) + sonuc.dogru;
    const yeniYanlis = (mevcut?.yanlisSayisi ?? 0) + sonuc.yanlis;
    // Boşlar toplamda var ama dogru/yanlis değil → başarı = doğru / toplam (boşlar düşürür)
    const basari = yeniToplam > 0 ? (yeniDogru / yeniToplam) * 100 : 0;

    await prisma.konuPerformansi.upsert({
      where: { ogrenciId_konuId: { ogrenciId, konuId } },
      update: {
        toplamSoru: yeniToplam,
        dogruSayisi: yeniDogru,
        yanlisSayisi: yeniYanlis,
        basariYuzdesi: parseFloat(basari.toFixed(2)),
      },
      create: {
        ogrenciId,
        konuId,
        toplamSoru: sonuc.toplam,
        dogruSayisi: sonuc.dogru,
        yanlisSayisi: sonuc.yanlis,
        basariYuzdesi: parseFloat(
          (sonuc.toplam > 0 ? (sonuc.dogru / sonuc.toplam) * 100 : 0).toFixed(2),
        ),
      },
    });
  }

  // Zayıf konuları belirle ve öneri üret
  const konuPerformanslari = await prisma.konuPerformansi.findMany({
    where: { ogrenciId },
    include: { konu: true },
  });

  const zayiflar = konuPerformanslari
    .filter((kp) => kp.basariYuzdesi < 50 && kp.toplamSoru >= 2)
    .map((kp) => ({ konu: kp.konu.ad, ders: kp.konu.ders, basari: kp.basariYuzdesi }));

  if (zayiflar.length > 0) {
    const { oneriUret } = require('./oneri.service');
    await oneriUret({ ogrenciId, zayifKonular: zayiflar });
  }

  // Cache temizle (platformlu anahtarlar dahil)
  await cache.sil(`analiz:${ogrenciId}`);
  await cache.sil(`analiz:${ogrenciId}:kpss`);
  await cache.sil(`analiz:${ogrenciId}:yks`);
}

export type AnalizPlatform = 'kpss' | 'yks' | 'hepsi';

export async function ogrenciAnalizGetir(
  ogrenciId: string,
  platform: AnalizPlatform = 'hepsi',
) {
  const cacheAnahtar = `analiz:${ogrenciId}:${platform === 'hepsi' ? 'all' : platform}`;
  const cachedVeri = await cache.al(cacheAnahtar);
  if (cachedVeri) return cachedVeri;

  const sinavTurleri =
    platform === 'kpss'
      ? platformSinavTurleri(true)
      : platform === 'yks'
        ? platformSinavTurleri(false)
        : null;

  const konuOgretim =
    platform === 'kpss' ? KPSS_OGRETIM : platform === 'yks' ? YKS_LGS_OGRETIM : null;

  const [katilimlar, konuPerformanslari] = await Promise.all([
    prisma.sinavKatilim.findMany({
      where: {
        ogrenciId,
        durum: 'TAMAMLANDI',
        ...(sinavTurleri ? { sinav: { tur: { in: sinavTurleri as any } } } : {}),
      },
      orderBy: { olusturuldu: 'desc' },
      take: 20,
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
      where: {
        ogrenciId,
        ...(konuOgretim ? { konu: { ogretimTuru: { in: konuOgretim } } } : {}),
      },
      include: { konu: true },
      orderBy: { basariYuzdesi: 'asc' },
    }),
  ]);

  const toplamSinav = katilimlar.length;
  const ortalamaNe =
    toplamSinav > 0 ? katilimlar.reduce((sum, k) => sum + k.netPuan, 0) / toplamSinav : 0;
  const enIyiSiralama = Math.min(...katilimlar.map((k) => k.ulusalSiralama || 999999));

  // Son tamamlanan sınav için 2000’lik tahmini sıralama (ortalama + dağılım)
  let sonDenemeSiralama: ReturnType<typeof tahminiSiralamaHesapla> & {
    sinavBaslik?: string;
    katilimId?: string;
  } | null = null;
  const sonKatilim = katilimlar[0];
  if (sonKatilim) {
    const cohort = await prisma.sinavKatilim.findMany({
      where: { sinavId: sonKatilim.sinavId, durum: KatilimDurumu.TAMAMLANDI },
      select: { netPuan: true },
    });
    const hesap = tahminiSiralamaHesapla(
      sonKatilim.netPuan,
      cohort.map((c) => c.netPuan),
      SIRALAMA_HAVUZ_BOYUTU,
    );
    if (hesap) {
      sonDenemeSiralama = {
        ...hesap,
        sinavBaslik: sonKatilim.sinav.baslik,
        katilimId: sonKatilim.id,
      };
    }
  }

  // Tüm denemeler içinde en iyi tahmini sıra (en küçük numara)
  let enIyiTahminiSira: number | null = null;
  if (katilimlar.length > 0) {
    const sinavIdler = [...new Set(katilimlar.map((k) => k.sinavId))];
    const cohortlar = await prisma.sinavKatilim.findMany({
      where: { sinavId: { in: sinavIdler }, durum: KatilimDurumu.TAMAMLANDI },
      select: { sinavId: true, netPuan: true },
    });
    const netsBySinav = new Map<string, number[]>();
    for (const c of cohortlar) {
      const list = netsBySinav.get(c.sinavId) || [];
      list.push(c.netPuan);
      netsBySinav.set(c.sinavId, list);
    }
    for (const k of katilimlar) {
      const nets = netsBySinav.get(k.sinavId) || [k.netPuan];
      const h = tahminiSiralamaHesapla(k.netPuan, nets, SIRALAMA_HAVUZ_BOYUTU);
      if (h && (enIyiTahminiSira == null || h.sira < enIyiTahminiSira)) {
        enIyiTahminiSira = h.sira;
      }
    }
  }

  const zayifKonular = konuPerformanslari
    .filter((k) => k.basariYuzdesi < 50 && k.toplamSoru >= 2)
    .map((k) => ({ konu: k.konu.ad, ders: k.konu.ders, basari: k.basariYuzdesi }));

  const dersPerformanslari = gruptaDersPerformanslari(konuPerformanslari);

  const sureAnalizleri = katilimlar
    .map((k) => katilimSureAnaliziOlustur(k))
    .filter((s) => s.kayitliSoruSayisi > 0);

  const sinavGecmisi = katilimlar.map(({ cevaplar: _cevaplar, ...rest }) => rest);

  const sonuc = {
    platform,
    toplamSinav,
    ortalamaNe: parseFloat(ortalamaNe.toFixed(2)),
    /** Dashboard geriye uyum: ortalamaNet alias */
    ortalamaNet: parseFloat(ortalamaNe.toFixed(2)),
    enIyiSiralama: enIyiTahminiSira ?? (enIyiSiralama === 999999 ? null : enIyiSiralama),
    /** Gerçek küçük grup sırası (ham) — isteğe bağlı */
    enIyiGercekSiralama: enIyiSiralama === 999999 ? null : enIyiSiralama,
    siralamaHavuz: SIRALAMA_HAVUZ_BOYUTU,
    sonDenemeSiralama,
    sinavGecmisi,
    sureAnalizleri,
    zayifKonular,
    dersPerformanslari,
    konuPerformanslari: konuPerformanslari.map((k) => ({
      ders: k.konu.ders,
      konu: k.konu.ad,
      ogretimTuru: k.konu.ogretimTuru,
      basari: k.basariYuzdesi,
      toplamSoru: k.toplamSoru,
      dogruSayisi: k.dogruSayisi,
      yanlisSayisi: k.yanlisSayisi,
    })),
  };

  await cache.yaz(cacheAnahtar, sonuc, 300);
  return sonuc;
}

function gruptaDersPerformanslari(
  konuPerformanslari: Array<{
    konu: { ders: string };
    basariYuzdesi: number;
    toplamSoru: number;
    dogruSayisi?: number;
  }>,
) {
  const dersMap = new Map<string, { dogru: number; toplam: number }>();

  for (const kp of konuPerformanslari) {
    const ders = kp.konu.ders;
    const mevcut = dersMap.get(ders) || { dogru: 0, toplam: 0 };
    // Ağırlıklı: mümkünse dogruSayisi kullan, yoksa yüzdeden geri hesapla
    const dogru =
      typeof kp.dogruSayisi === 'number'
        ? kp.dogruSayisi
        : Math.round((kp.basariYuzdesi / 100) * kp.toplamSoru);
    mevcut.dogru += dogru;
    mevcut.toplam += kp.toplamSoru;
    dersMap.set(ders, mevcut);
  }

  return Array.from(dersMap.entries()).map(([ders, veri]) => ({
    ders,
    ortalama: veri.toplam > 0 ? parseFloat(((veri.dogru / veri.toplam) * 100).toFixed(2)) : 0,
    toplamSoru: veri.toplam,
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
  const oneriSureMsPerSoru =
    katilim.cevaplar.length > 0
      ? Math.round((katilim.sinav.sureDakika * 60 * 1000) / katilim.cevaplar.length)
      : null;
  /** Aykırı değer eşiği: önerinin 4 katı veya en fazla 8 dk */
  const aykiriEsikMs =
    oneriSureMsPerSoru != null
      ? Math.min(8 * 60 * 1000, Math.max(oneriSureMsPerSoru * 4, 3 * 60 * 1000))
      : 8 * 60 * 1000;

  const soruSureleri = katilim.cevaplar
    .map((c) => {
      const ham = c.sureMs;
      const olculdu = ham != null && ham > 0;
      const aykiri = olculdu && ham! > aykiriEsikMs;
      return {
        soruId: c.soruId,
        siraNo: c.soru.siraNo,
        ders: c.soru.konu.ders,
        konu: c.soru.konu.ad,
        sureMs: ham,
        dogru: c.dogru,
        olculdu,
        aykiri,
      };
    })
    .sort((a, b) => a.siraNo - b.siraNo);

  const kayitli = soruSureleri.filter((s) => s.olculdu);
  const guvenilir = kayitli.filter((s) => !s.aykiri);
  const aykiriSayisi = kayitli.filter((s) => s.aykiri).length;

  const guvenilirToplam = guvenilir.reduce((a, s) => a + (s.sureMs || 0), 0);
  const hamToplam = kayitli.reduce((a, s) => a + (s.sureMs || 0), 0);
  const toplamSoruSayisi = soruSureleri.length;
  const kapsamaYuzde =
    toplamSoruSayisi > 0 ? Math.round((kayitli.length / toplamSoruSayisi) * 100) : 0;

  const dersOzetiMap = new Map<
    string,
    { ders: string; toplam: number; olculdu: number; toplamSureMs: number; dogru: number; yanlis: number; bos: number }
  >();
  for (const s of soruSureleri) {
    const d = dersOzetiMap.get(s.ders) || {
      ders: s.ders,
      toplam: 0,
      olculdu: 0,
      toplamSureMs: 0,
      dogru: 0,
      yanlis: 0,
      bos: 0,
    };
    d.toplam += 1;
    if (s.olculdu && !s.aykiri) {
      d.olculdu += 1;
      d.toplamSureMs += s.sureMs || 0;
    }
    if (s.dogru === true) d.dogru += 1;
    else if (s.dogru === false) d.yanlis += 1;
    else d.bos += 1;
    dersOzetiMap.set(s.ders, d);
  }
  const dersOzeti = Array.from(dersOzetiMap.values())
    .map((d) => ({
      ...d,
      ortalamaSureMs: d.olculdu > 0 ? Math.round(d.toplamSureMs / d.olculdu) : null,
      basariYuzdesi:
        d.dogru + d.yanlis > 0
          ? Math.round((d.dogru / (d.dogru + d.yanlis)) * 100)
          : null,
    }))
    .sort((a, b) => a.ders.localeCompare(b.ders, 'tr'));

  return {
    katilimId: katilim.id,
    sinavBaslik: katilim.sinav.baslik,
    sinavTur: katilim.sinav.tur,
    netPuan: katilim.netPuan,
    /** Ham toplam (aykırılar dahil) — şeffaflık için */
    toplamSureMs: hamToplam,
    /** Ortalama: aykırı değerler hariç (daha anlamlı) */
    ortalamaSureMs:
      guvenilir.length > 0 ? Math.round(guvenilirToplam / guvenilir.length) : null,
    kayitliSoruSayisi: kayitli.length,
    toplamSoruSayisi,
    kapsamaYuzde,
    aykiriSayisi,
    oneriSureMsPerSoru,
    aykiriEsikMs,
    enYavasSorular: [...guvenilir].sort((a, b) => (b.sureMs ?? 0) - (a.sureMs ?? 0)).slice(0, 5),
    dersOzeti,
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
