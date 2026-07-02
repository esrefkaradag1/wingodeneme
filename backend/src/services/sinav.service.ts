import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { AppHatasi } from '../middlewares/hata.middleware';
import { analizHesapla } from './analiz.service';
import { KatilimDurumu, CevapYontemi, SoruOnayDurumu } from '@prisma/client';
import { parseKayitliOturumlar } from '../utils/sinavOturum';

/** Grup üyeliği veya doğrudan sınav ataması (paket / admin) */
export async function ogrenciSinavErisimiVar(
  ogrenciId: string,
  sinav: { id: string; grupId: string }
): Promise<boolean> {
  const uyelik = await prisma.grupUyelik.findFirst({
    where: { ogrenciId, grupId: sinav.grupId },
  });
  if (uyelik) return true;

  const atama = await prisma.ogrenciSinavAtama.findUnique({
    where: { ogrenciId_sinavId: { ogrenciId, sinavId: sinav.id } },
  });
  return !!atama;
}

export async function sinavListesiGetir(ogrenciId: string) {
  const ogrenci = await prisma.ogrenciProfil.findUnique({
    where: { id: ogrenciId },
    include: { gruplar: { include: { grup: true } } },
  });

  if (!ogrenci) throw new AppHatasi('Öğrenci bulunamadı', 404);

  const grupIdleri = ogrenci.gruplar.map((g) => g.grupId);
  const simdi = new Date();

  const [grupSinavlari, atamalar, katilimlar] = await Promise.all([
    grupIdleri.length
      ? prisma.sinav.findMany({
          where: { grupId: { in: grupIdleri }, yayinlandi: true },
          orderBy: { baslangicZamani: 'desc' },
          include: {
            _count: { select: { sorular: true, katilimlar: true } },
          },
        })
      : [],
    prisma.ogrenciSinavAtama.findMany({
      where: { ogrenciId },
      select: { sinavId: true },
    }),
    prisma.sinavKatilim.findMany({
      where: { ogrenciId },
      select: { sinavId: true },
    }),
  ]);

  const atamaIdleri = atamalar.map((a) => a.sinavId);
  const katildigimIdler = katilimlar.map((k) => k.sinavId);
  const tumEkIdler = [...new Set([...atamaIdleri, ...katildigimIdler])];

  // Grup sınavlarında taslaklar gösterilmez; öğrenciye doğrudan/paket atanan sınavlarda
  // veya zaten katıldığı sınavlarda listede görünsün.
  const ekSinavlar =
    tumEkIdler.length > 0
      ? await prisma.sinav.findMany({
          where: { id: { in: tumEkIdler } },
          orderBy: { baslangicZamani: 'desc' },
          include: {
            _count: { select: { sorular: true, katilimlar: true } },
          },
        })
      : [];

  const birlesik = new Map<string, (typeof grupSinavlari)[0]>();
  for (const s of grupSinavlari) birlesik.set(s.id, s);
  for (const s of ekSinavlar) birlesik.set(s.id, s);

  const sinavlar = [...birlesik.values()].sort(
    (a, b) => b.baslangicZamani.getTime() - a.baslangicZamani.getTime()
  );

  const sinavIdleri = sinavlar.map((s) => s.id);
  const ogrenciKatilimlari =
    sinavIdleri.length > 0
      ? await prisma.sinavKatilim.findMany({
          where: { ogrenciId, sinavId: { in: sinavIdleri } },
          select: { id: true, sinavId: true, durum: true },
        })
      : [];
  const katilimSinavaGore = new Map(ogrenciKatilimlari.map((k) => [k.sinavId, k]));

  return sinavlar.map((s) => {
    const k = katilimSinavaGore.get(s.id);
    return {
      ...s,
      durum: simdi < s.baslangicZamani ? 'YAKINDA' : simdi > s.bitisZamani ? 'BITTI' : 'AKTIF',
      soruSayisi: s._count.sorular,
      katilimciSayisi: s._count.katilimlar,
      katilimId: k?.id ?? null,
      katilimDurumu: k?.durum ?? null,
    };
  });
}

export async function sinavDetayGetir(sinavId: string, ogrenciId?: string) {
  const cacheAnahtar = `sinav:${sinavId}`;
  if (!ogrenciId) {
    const cachedVeri = await cache.al(cacheAnahtar);
    if (cachedVeri) return cachedVeri;
  }

  const sinav = await prisma.sinav.findUnique({
    where: { id: sinavId },
    include: {
      grup: true,
      _count: { select: { sorular: true } },
    },
  });

  if (!sinav) throw new AppHatasi('Sınav bulunamadı', 404);

  const simdi = new Date();
  const sinavAktif = simdi >= sinav.baslangicZamani && simdi <= sinav.bitisZamani;

  let erisim = false;
  if (ogrenciId) {
    erisim = await ogrenciSinavErisimiVar(ogrenciId, sinav);
  }

  let sorular = null;
  if (sinavAktif && ogrenciId && erisim) {
    sorular = await prisma.soru.findMany({
      where: { sinavId, onayDurumu: SoruOnayDurumu.ONAYLANDI },
      orderBy: { siraNo: 'asc' },
      select: {
        id: true,
        siraNo: true,
        metinHtml: true,
        gorselUrl: true,
        secenekler: true,
        zorluk: true,
        konu: { select: { ad: true, ders: true } },
      },
    });
  }

  const sonuc = { ...sinav, sinavAktif, sorular, erisim: !!ogrenciId && erisim };
  if (!ogrenciId && !sinavAktif) await cache.yaz(cacheAnahtar, sonuc, 300);

  return sonuc;
}

export async function sinavaKatil(sinavId: string, ogrenciId: string) {
  const sinav = await prisma.sinav.findUnique({ where: { id: sinavId } });
  if (!sinav) throw new AppHatasi('Sınav bulunamadı', 404);

  const erisim = await ogrenciSinavErisimiVar(ogrenciId, sinav);
  if (!erisim) {
    throw new AppHatasi('Bu sınava erişim yetkiniz yok. Grup üyeliği veya paket / atama gerekir.', 403);
  }

  let mevcutKatilim = await prisma.sinavKatilim.findUnique({
    where: { sinavId_ogrenciId: { sinavId, ogrenciId } },
  });

  const sinavBilgisi = {
    baslik: sinav.baslik,
    tur: sinav.tur,
    sureDakika: sinav.sureDakika,
    baslangicZamani: sinav.baslangicZamani.toISOString(),
    kitapcikBolumAdi: sinav.kitapcikBolumAdi,
    kitapcikTarihMetni: sinav.kitapcikTarihMetni,
    kitapcikUrl: sinav.kitapcikUrl,
    konuDagilimi: sinav.konuDagilimi,
    oturumlar: parseKayitliOturumlar(sinav.oturumlar),
  };

  if (mevcutKatilim?.durum === KatilimDurumu.TAMAMLANDI) {
    const sorular = await prisma.soru.findMany({
      where: { sinavId, onayDurumu: SoruOnayDurumu.ONAYLANDI },
      orderBy: { siraNo: 'asc' },
      select: {
        id: true,
        siraNo: true,
        metinHtml: true,
        gorselUrl: true,
        secenekler: true,
        zorluk: true,
        konuId: true,
        konu: { select: { ad: true, ders: true } },
      },
    });
    const kayitliCevaplar = await prisma.ogrenciCevap.findMany({
      where: { katilimId: mevcutKatilim.id },
      select: { soruId: true, secilen: true },
    });

    return {
      katilim: mevcutKatilim,
      sorular,
      sureDakika: sinav.sureDakika,
      sinav: sinavBilgisi,
      incelemeModu: true,
      kayitliCevaplar,
    };
  }

  const simdi = new Date();
  const sinavAcikZamanda = simdi >= sinav.baslangicZamani && simdi <= sinav.bitisZamani;
  /** Süre bitti ama sınav ekranı açık kaldıysa teslim için tekrar yüklenebilsin */
  const devamEden = mevcutKatilim?.durum === KatilimDurumu.DEVAM_EDIYOR;

  if (!sinavAcikZamanda && !devamEden) {
    if (simdi < sinav.baslangicZamani) {
      throw new AppHatasi('Sınav henüz başlamadı', 400);
    }
    throw new AppHatasi('Sınav süresi doldu', 400);
  }

  const katilim = await prisma.sinavKatilim.upsert({
    where: { sinavId_ogrenciId: { sinavId, ogrenciId } },
    update: { durum: KatilimDurumu.DEVAM_EDIYOR },
    create: {
      sinavId,
      ogrenciId,
      durum: KatilimDurumu.DEVAM_EDIYOR,
      baslangicZamani: simdi,
    },
  });

  const sorular = await prisma.soru.findMany({
    where: { sinavId, onayDurumu: SoruOnayDurumu.ONAYLANDI },
    orderBy: { siraNo: 'asc' },
    select: {
      id: true,
      siraNo: true,
      metinHtml: true,
      gorselUrl: true,
      secenekler: true,
      zorluk: true,
      konuId: true,
      konu: { select: { ad: true, ders: true } },
    },
  });

  return {
    katilim,
    sorular,
    sureDakika: sinav.sureDakika,
    sinav: sinavBilgisi,
  };
}

export async function cevapGonder(
  katilimId: string,
  cevaplar: Array<{ soruId: string; secilen: string | null; sureMs?: number | null }>,
  ogrenciId: string
) {
  const katilim = await prisma.sinavKatilim.findUnique({
    where: { id: katilimId },
    include: { sinav: { include: { sorular: true } } },
  });

  if (!katilim) throw new AppHatasi('Katılım bulunamadı', 404);
  if (katilim.ogrenciId !== ogrenciId) throw new AppHatasi('Yetkisiz erişim', 403);
  if (katilim.durum === KatilimDurumu.TAMAMLANDI) throw new AppHatasi('Sınav zaten tamamlandı', 400);

  const soruMap = new Map(katilim.sinav.sorular.map((s) => [s.id, s]));

  let dogru = 0, yanlis = 0, bos = 0;
  const cevapKayitlari = [];

  for (const cevap of cevaplar) {
    const soru = soruMap.get(cevap.soruId);
    if (!soru) continue;

    let dogruMu: boolean | null = null;
    if (!cevap.secilen) {
      bos++;
    } else if (cevap.secilen === soru.dogruCevap) {
      dogru++;
      dogruMu = true;
    } else {
      yanlis++;
      dogruMu = false;
    }

    cevapKayitlari.push({
      katilimId,
      soruId: cevap.soruId,
      secilen: cevap.secilen,
      dogru: dogruMu,
      sureMs: typeof cevap.sureMs === 'number' && cevap.sureMs >= 0 ? Math.round(cevap.sureMs) : null,
    });
  }

  const net = dogru - yanlis / 4;
  const toplamSoru = katilim.sinav.sorular.length;
  const ham = (dogru / toplamSoru) * 100;

  await prisma.$transaction([
    prisma.sinavKatilim.update({
      where: { id: katilimId },
      data: {
        durum: KatilimDurumu.TAMAMLANDI,
        bitisZamani: new Date(),
        dogruSayisi: dogru,
        yanlisSayisi: yanlis,
        bosSayisi: bos,
        netPuan: parseFloat(net.toFixed(2)),
        hamPuan: parseFloat(ham.toFixed(2)),
      },
    }),
    ...cevapKayitlari.map((c) =>
      prisma.ogrenciCevap.upsert({
        where: { katilimId_soruId: { katilimId: c.katilimId, soruId: c.soruId } },
        update: { secilen: c.secilen, dogru: c.dogru, sureMs: c.sureMs },
        create: c,
      })
    ),
  ]);

  // Sıralama ve analiz hesapla
  await ulusalSiralamaGuncelle(katilim.sinavId);
  await analizHesapla(ogrenciId, katilimId);

  return { dogru, yanlis, bos, net, ham };
}

export async function optikFormYukle(katilimId: string, dosyaUrl: string, ogrenciId: string) {
  const katilim = await prisma.sinavKatilim.findUnique({ where: { id: katilimId } });
  if (!katilim || katilim.ogrenciId !== ogrenciId) throw new AppHatasi('Katılım bulunamadı', 404);

  await prisma.sinavKatilim.update({
    where: { id: katilimId },
    data: {
      optikFormUrl: dosyaUrl,
      cevapYontemi: CevapYontemi.OPTIK_FORM,
      optikOkundu: false,
    },
  });

  return { mesaj: 'Optik form yüklendi, işleme alındı', url: dosyaUrl };
}

export async function sinavSureAnaliziGetir(sinavId: string) {
  const sinav = await prisma.sinav.findUnique({
    where: { id: sinavId },
    select: {
      id: true,
      baslik: true,
      sureDakika: true,
      sorular: {
        orderBy: { siraNo: 'asc' },
        select: {
          id: true,
          siraNo: true,
          konu: { select: { ad: true, ders: true } },
        },
      },
    },
  });
  if (!sinav) throw new AppHatasi('Sınav bulunamadı', 404);

  const katilimlar = await prisma.sinavKatilim.findMany({
    where: { sinavId, durum: KatilimDurumu.TAMAMLANDI },
    select: {
      id: true,
      ogrenci: { select: { ad: true, soyad: true } },
      cevaplar: { select: { soruId: true, sureMs: true } },
    },
  });

  const soruSureMap = new Map<string, number[]>();
  for (const soru of sinav.sorular) {
    soruSureMap.set(soru.id, []);
  }

  const ogrenciOzetleri: Array<{
    katilimId: string;
    ogrenciAd: string;
    toplamSureMs: number;
    ortalamaSureMs: number | null;
    kayitliSoruSayisi: number;
  }> = [];

  for (const katilim of katilimlar) {
    let toplamMs = 0;
    let kayitli = 0;
    for (const cevap of katilim.cevaplar) {
      if (cevap.sureMs == null || cevap.sureMs <= 0) continue;
      toplamMs += cevap.sureMs;
      kayitli += 1;
      const liste = soruSureMap.get(cevap.soruId);
      if (liste) liste.push(cevap.sureMs);
    }
    ogrenciOzetleri.push({
      katilimId: katilim.id,
      ogrenciAd: `${katilim.ogrenci.ad} ${katilim.ogrenci.soyad}`.trim(),
      toplamSureMs: toplamMs,
      ortalamaSureMs: kayitli > 0 ? Math.round(toplamMs / kayitli) : null,
      kayitliSoruSayisi: kayitli,
    });
  }

  const soruAnalizi = sinav.sorular.map((soru) => {
    const sureler = soruSureMap.get(soru.id) || [];
    const ortalamaSureMs =
      sureler.length > 0 ? Math.round(sureler.reduce((a, b) => a + b, 0) / sureler.length) : null;
    return {
      soruId: soru.id,
      siraNo: soru.siraNo,
      ders: soru.konu.ders,
      konu: soru.konu.ad,
      katilimSayisi: sureler.length,
      ortalamaSureMs,
      minSureMs: sureler.length > 0 ? Math.min(...sureler) : null,
      maxSureMs: sureler.length > 0 ? Math.max(...sureler) : null,
    };
  });

  soruAnalizi.sort((a, b) => (b.ortalamaSureMs ?? 0) - (a.ortalamaSureMs ?? 0));
  ogrenciOzetleri.sort((a, b) => b.toplamSureMs - a.toplamSureMs);

  const soruSayisi = sinav.sorular.length;
  const oneriSureMsPerSoru =
    soruSayisi > 0 ? Math.round((sinav.sureDakika * 60 * 1000) / soruSayisi) : null;

  return {
    sinav: {
      id: sinav.id,
      baslik: sinav.baslik,
      sureDakika: sinav.sureDakika,
      soruSayisi,
      oneriSureMsPerSoru,
    },
    katilimSayisi: katilimlar.length,
    soruAnalizi,
    ogrenciOzetleri,
  };
}

async function ulusalSiralamaGuncelle(sinavId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "sinav_katilimlar" AS sk
    SET
      "ulusalSiralama" = sirali.sira,
      "yuzdelik" = ROUND(
        ((sirali.toplam - sirali.sira + 1)::numeric / NULLIF(sirali.toplam, 0)) * 100,
        2
      )::double precision
    FROM (
      SELECT
        "id",
        ROW_NUMBER() OVER (
          ORDER BY "netPuan" DESC, "bitisZamani" ASC NULLS LAST, "id" ASC
        )::integer AS sira,
        COUNT(*) OVER ()::integer AS toplam
      FROM "sinav_katilimlar"
      WHERE "sinavId" = ${sinavId}
        AND "durum" = ${KatilimDurumu.TAMAMLANDI}::"KatilimDurumu"
    ) AS sirali
    WHERE sk."id" = sirali."id"
  `;
}
