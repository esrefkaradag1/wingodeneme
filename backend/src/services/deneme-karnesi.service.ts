import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { KatilimDurumu } from '@prisma/client';

type CevapSatir = {
  soruId: string;
  siraNo: number;
  ders: string;
  konu: string;
  kazanim: string | null;
  dogruCevap: string;
  secilen: string | null;
  dogru: boolean | null;
  sureMs: number | null;
};

function netHesapla(dogru: number, yanlis: number): number {
  return parseFloat((dogru - yanlis / 4).toFixed(2));
}

function basariYuzdesi(dogru: number, toplam: number): number {
  if (toplam <= 0) return 0;
  return parseFloat(((dogru / toplam) * 100).toFixed(1));
}

function siraBul(
  liste: Array<{ ogrenciId: string; netPuan: number }>,
  ogrenciId: string
): { sira: number | null; toplam: number } {
  const sorted = [...liste].sort((a, b) => b.netPuan - a.netPuan || 0);
  const idx = sorted.findIndex((k) => k.ogrenciId === ogrenciId);
  return { sira: idx >= 0 ? idx + 1 : null, toplam: sorted.length };
}

function dersOzetiOlustur(cevaplar: CevapSatir[]) {
  const map = new Map<
    string,
    { ders: string; soruSayisi: number; dogru: number; yanlis: number; bos: number }
  >();

  for (const c of cevaplar) {
    const mevcut = map.get(c.ders) || { ders: c.ders, soruSayisi: 0, dogru: 0, yanlis: 0, bos: 0 };
    mevcut.soruSayisi += 1;
    if (c.dogru === true) mevcut.dogru += 1;
    else if (c.dogru === false) mevcut.yanlis += 1;
    else mevcut.bos += 1;
    map.set(c.ders, mevcut);
  }

  return Array.from(map.values())
    .map((d) => ({
      ...d,
      net: netHesapla(d.dogru, d.yanlis),
      basariYuzdesi: basariYuzdesi(d.dogru, d.soruSayisi),
    }))
    .sort((a, b) => a.ders.localeCompare(b.ders, 'tr'));
}

function konuOzetiOlustur(cevaplar: CevapSatir[]) {
  const map = new Map<
    string,
    { ders: string; konu: string; soruSayisi: number; dogru: number; yanlis: number; bos: number }
  >();

  for (const c of cevaplar) {
    const key = `${c.ders}::${c.konu}`;
    const mevcut = map.get(key) || {
      ders: c.ders,
      konu: c.konu,
      soruSayisi: 0,
      dogru: 0,
      yanlis: 0,
      bos: 0,
    };
    mevcut.soruSayisi += 1;
    if (c.dogru === true) mevcut.dogru += 1;
    else if (c.dogru === false) mevcut.yanlis += 1;
    else mevcut.bos += 1;
    map.set(key, mevcut);
  }

  return Array.from(map.values())
    .map((k) => ({
      ...k,
      basariYuzdesi: basariYuzdesi(k.dogru, k.soruSayisi),
    }))
    .sort((a, b) => a.ders.localeCompare(b.ders, 'tr') || a.basariYuzdesi - b.basariYuzdesi);
}

function dersGenelOrtalamalari(
  tumCevaplar: Array<{ ders: string; dogru: boolean | null }>
): Map<string, number> {
  const map = new Map<string, { dogru: number; toplam: number }>();
  for (const c of tumCevaplar) {
    const mevcut = map.get(c.ders) || { dogru: 0, toplam: 0 };
    mevcut.toplam += 1;
    if (c.dogru === true) mevcut.dogru += 1;
    map.set(c.ders, mevcut);
  }
  const out = new Map<string, number>();
  for (const [ders, v] of map) {
    out.set(ders, basariYuzdesi(v.dogru, v.toplam));
  }
  return out;
}

export async function denemeKarnesiGetir(katilimId: string) {
  const katilim = await prisma.sinavKatilim.findUnique({
    where: { id: katilimId },
    include: {
      ogrenci: { select: { id: true, ad: true, soyad: true, sinif: true, okul: true, sehir: true, ilce: true } },
      sinav: {
        select: {
          id: true,
          baslik: true,
          tur: true,
          baslangicZamani: true,
          konuDagilimi: true,
          kitapcikBolumAdi: true,
          grup: { select: { ad: true } },
        },
      },
      cevaplar: {
        include: {
          soru: {
            select: {
              id: true,
              siraNo: true,
              dogruCevap: true,
              kazanim: true,
              konu: { select: { ad: true, ders: true } },
            },
          },
        },
      },
    },
  });

  if (!katilim) throw new AppHatasi('Katılım bulunamadı', 404);
  if (katilim.durum !== KatilimDurumu.TAMAMLANDI) {
    throw new AppHatasi('Sınav henüz tamamlanmamış', 400);
  }

  const cevapSatirlari: CevapSatir[] = katilim.cevaplar
    .map((c) => ({
      soruId: c.soruId,
      siraNo: c.soru.siraNo,
      ders: c.soru.konu.ders,
      konu: c.soru.konu.ad,
      kazanim: c.soru.kazanim,
      dogruCevap: c.soru.dogruCevap,
      secilen: c.secilen,
      dogru: c.dogru,
      sureMs: c.sureMs,
    }))
    .sort((a, b) => a.siraNo - b.siraNo);

  const dersOzeti = dersOzetiOlustur(cevapSatirlari);
  const konuOzeti = konuOzetiOlustur(cevapSatirlari);

  const [tumKatilimlar, sinavIstatistik, gecmisSinavlar] = await Promise.all([
    prisma.sinavKatilim.findMany({
      where: { sinavId: katilim.sinavId, durum: KatilimDurumu.TAMAMLANDI },
      select: {
        ogrenciId: true,
        netPuan: true,
        hamPuan: true,
        ogrenci: { select: { sinif: true, okul: true, ilce: true, sehir: true } },
      },
    }),
    prisma.sinavKatilim.aggregate({
      where: { sinavId: katilim.sinavId, durum: KatilimDurumu.TAMAMLANDI },
      _avg: { netPuan: true, hamPuan: true },
      _max: { hamPuan: true },
      _count: true,
    }),
    prisma.sinavKatilim.findMany({
      where: {
        ogrenciId: katilim.ogrenciId,
        durum: KatilimDurumu.TAMAMLANDI,
        id: { not: katilimId },
      },
      orderBy: { olusturuldu: 'desc' },
      take: 5,
      select: {
        id: true,
        hamPuan: true,
        netPuan: true,
        olusturuldu: true,
        sinav: { select: { baslik: true } },
      },
    }),
  ]);

  const genelListe = tumKatilimlar.map((k) => ({ ogrenciId: k.ogrenciId, netPuan: k.netPuan }));
  const sinifListe = tumKatilimlar
    .filter((k) => k.ogrenci.sinif && k.ogrenci.sinif === katilim.ogrenci.sinif)
    .map((k) => ({ ogrenciId: k.ogrenciId, netPuan: k.netPuan }));
  const okulListe = tumKatilimlar
    .filter((k) => k.ogrenci.okul && k.ogrenci.okul === katilim.ogrenci.okul)
    .map((k) => ({ ogrenciId: k.ogrenciId, netPuan: k.netPuan }));
  const ilceListe = tumKatilimlar
    .filter((k) => k.ogrenci.ilce && k.ogrenci.ilce === katilim.ogrenci.ilce)
    .map((k) => ({ ogrenciId: k.ogrenciId, netPuan: k.netPuan }));
  const ilListe = tumKatilimlar
    .filter((k) => k.ogrenci.sehir && k.ogrenci.sehir === katilim.ogrenci.sehir)
    .map((k) => ({ ogrenciId: k.ogrenciId, netPuan: k.netPuan }));

  const dereceler = {
    genel: siraBul(genelListe, katilim.ogrenciId),
    sinif: sinifListe.length > 1 ? siraBul(sinifListe, katilim.ogrenciId) : { sira: null, toplam: sinifListe.length },
    okul: okulListe.length > 1 ? siraBul(okulListe, katilim.ogrenciId) : { sira: null, toplam: okulListe.length },
    ilce: ilceListe.length > 1 ? siraBul(ilceListe, katilim.ogrenciId) : { sira: null, toplam: ilceListe.length },
    il: ilListe.length > 1 ? siraBul(ilListe, katilim.ogrenciId) : { sira: null, toplam: ilListe.length },
  };

  const tumSinavCevaplari = await prisma.ogrenciCevap.findMany({
    where: {
      katilim: { sinavId: katilim.sinavId, durum: KatilimDurumu.TAMAMLANDI },
    },
    select: {
      dogru: true,
      soru: { select: { konu: { select: { ders: true } } } },
    },
  });

  const dersGenelOrt = dersGenelOrtalamalari(
    tumSinavCevaplari.map((c) => ({ ders: c.soru.konu.ders, dogru: c.dogru }))
  );

  const dersOzetiGenel = dersOzeti.map((d) => ({
    ...d,
    genelBasariYuzdesi: dersGenelOrt.get(d.ders) ?? null,
  }));

  const toplamSatir = {
    ders: 'TOPLAM',
    soruSayisi: cevapSatirlari.length,
    dogru: katilim.dogruSayisi,
    yanlis: katilim.yanlisSayisi,
    bos: katilim.bosSayisi,
    net: katilim.netPuan,
    basariYuzdesi: basariYuzdesi(katilim.dogruSayisi, cevapSatirlari.length),
    genelBasariYuzdesi:
      tumSinavCevaplari.length > 0
        ? basariYuzdesi(
            tumSinavCevaplari.filter((c) => c.dogru === true).length,
            tumSinavCevaplari.length
          )
        : null,
  };

  const cevapAnahtari = cevapSatirlari.map((c) => ({
    siraNo: c.siraNo,
    ders: c.ders,
    dogruCevap: c.dogruCevap,
    secilen: c.secilen,
    dogru: c.dogru,
  }));

  const konuGenelOrtMap = new Map<string, number>();
  const konuAgg = new Map<string, { dogru: number; toplam: number }>();
  const tumKonuCevaplar = await prisma.ogrenciCevap.findMany({
    where: { katilim: { sinavId: katilim.sinavId, durum: KatilimDurumu.TAMAMLANDI } },
    select: {
      dogru: true,
      soru: { select: { konu: { select: { ders: true, ad: true } } } },
    },
  });
  for (const c of tumKonuCevaplar) {
    const key = `${c.soru.konu.ders}::${c.soru.konu.ad}`;
    const mevcut = konuAgg.get(key) || { dogru: 0, toplam: 0 };
    mevcut.toplam += 1;
    if (c.dogru === true) mevcut.dogru += 1;
    konuAgg.set(key, mevcut);
  }
  for (const [key, v] of konuAgg) {
    konuGenelOrtMap.set(key, basariYuzdesi(v.dogru, v.toplam));
  }

  const konuGruplu = konuOzeti.reduce<
    Record<string, Array<(typeof konuOzeti)[number] & { genelBasariYuzdesi: number | null }>>
  >((acc, k) => {
    if (!acc[k.ders]) acc[k.ders] = [];
    acc[k.ders].push({
      ...k,
      genelBasariYuzdesi: konuGenelOrtMap.get(`${k.ders}::${k.konu}`) ?? null,
    });
    return acc;
  }, {});

  return {
    katilimId: katilim.id,
    ogrenci: {
      ad: katilim.ogrenci.ad,
      soyad: katilim.ogrenci.soyad,
      sinif: katilim.ogrenci.sinif,
      okul: katilim.ogrenci.okul,
      ilce: katilim.ogrenci.ilce,
      sehir: katilim.ogrenci.sehir,
    },
    sinav: {
      id: katilim.sinav.id,
      baslik: katilim.sinav.baslik,
      tur: katilim.sinav.tur,
      baslangicZamani: katilim.sinav.baslangicZamani,
      grupAdi: katilim.sinav.grup.ad,
      konuDagilimi: katilim.sinav.konuDagilimi,
      kitapcikBolumAdi: katilim.sinav.kitapcikBolumAdi,
    },
    ozet: {
      dogruSayisi: katilim.dogruSayisi,
      yanlisSayisi: katilim.yanlisSayisi,
      bosSayisi: katilim.bosSayisi,
      netPuan: katilim.netPuan,
      hamPuan: katilim.hamPuan,
      ulusalSiralama: katilim.ulusalSiralama,
      yuzdelik: katilim.yuzdelik,
    },
    karsilastirma: {
      sinavOrtHamPuan: sinavIstatistik._avg.hamPuan
        ? parseFloat(sinavIstatistik._avg.hamPuan.toFixed(2))
        : null,
      sinavOrtNet: sinavIstatistik._avg.netPuan
        ? parseFloat(sinavIstatistik._avg.netPuan.toFixed(2))
        : null,
      enYuksekHamPuan: sinavIstatistik._max.hamPuan,
      katilimciSayisi: sinavIstatistik._count,
    },
    dereceler,
    dersOzeti: [...dersOzetiGenel, toplamSatir],
    konuGruplu,
    cevapAnahtari,
    gecmisSinavlar: gecmisSinavlar
      .reverse()
      .map((g) => ({
        katilimId: g.id,
        baslik: g.sinav.baslik,
        hamPuan: g.hamPuan,
        netPuan: g.netPuan,
        tarih: g.olusturuldu,
      })),
    gecmisSinavlarGuncel: {
      baslik: katilim.sinav.baslik,
      hamPuan: katilim.hamPuan,
      netPuan: katilim.netPuan,
    },
  };
}

export async function sinavKatilimlariListele(sinavId: string) {
  const sinav = await prisma.sinav.findUnique({
    where: { id: sinavId },
    select: { id: true, baslik: true, tur: true, baslangicZamani: true },
  });
  if (!sinav) throw new AppHatasi('Sınav bulunamadı', 404);

  const katilimlar = await prisma.sinavKatilim.findMany({
    where: { sinavId, durum: KatilimDurumu.TAMAMLANDI },
    orderBy: [{ netPuan: 'desc' }, { bitisZamani: 'asc' }],
    select: {
      id: true,
      netPuan: true,
      hamPuan: true,
      dogruSayisi: true,
      yanlisSayisi: true,
      bosSayisi: true,
      ulusalSiralama: true,
      yuzdelik: true,
      bitisZamani: true,
      ogrenci: { select: { id: true, ad: true, soyad: true, sinif: true, okul: true } },
    },
  });

  return { sinav, katilimlar, toplam: katilimlar.length };
}
