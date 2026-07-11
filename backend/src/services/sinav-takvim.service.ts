import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { ogrenciSinavErisimiVar } from './sinav.service';
import { ogrenciBildirimGonder, adminlereSiparisBildirimi } from './bildirim.service';
import { SinavTuru } from '@prisma/client';
import {
  kademeliMiktarDagit,
  kademeliSepetToplamHesapla,
  sinavSepetFiyatAyarlariParse,
  sinavSepetFiyatAyarlariGetir,
} from './sinav-fiyat-kademe.service';
import { paketSinavlariniGetir } from '../utils/paketSinavCozumle';
import { satinAlimPaketHaklariniUygula } from './paket-erisim.service';

function ayAraligi(yil: number, ay: number) {
  const baslangic = new Date(yil, ay - 1, 1);
  const bitis = new Date(yil, ay, 0, 23, 59, 59, 999);
  return { baslangic, bitis };
}

function gosterilenFiyat(ucret: number | null, indirimliUcret: number | null): number | null {
  if (indirimliUcret != null && indirimliUcret > 0) return indirimliUcret;
  if (ucret != null && ucret > 0) return ucret;
  // Açıkça 0 girilmiş = ücretsiz (fiyat tanımlı); ikisi de null = fiyat yok.
  if (ucret === 0 || indirimliUcret === 0) return 0;
  return null;
}

function parseFiyat(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export async function adminSinavTakvimListele(yil: number, ay: number, platformTurleri: string[] = []) {
  const { baslangic, bitis } = ayAraligi(yil, ay);
  const whereClause: any = {
    baslangicZamani: { gte: baslangic, lte: bitis },
  };

  if (platformTurleri.length > 0) {
    whereClause.grup = {
      tur: { in: platformTurleri }
    };
  }

  const sinavlar = await prisma.sinav.findMany({
    where: whereClause,
    orderBy: { baslangicZamani: 'asc' },
    include: {
      grup: { select: { id: true, ad: true, tur: true } },
      _count: { select: { sorular: true, katilimlar: true, ogrenciAtamalari: true } },
    },
  });

  return sinavlar.map((s) => ({
    ...s,
    soruSayisi: s._count.sorular,
    katilimciSayisi: s._count.katilimlar,
    atamaSayisi: s._count.ogrenciAtamalari,
    gosterilenFiyat: gosterilenFiyat(s.ucret, s.indirimliUcret),
  }));
}

export type SinavTakvimFormVeri = {
  baslik: string;
  aciklama?: string | null;
  tur: SinavTuru;
  grupId: string;
  baslangicZamani: Date;
  bitisZamani: Date;
  sureDakika?: number;
  ucret?: number | null;
  indirimliUcret?: number | null;
  takvimdeGoster?: boolean;
  satinAlinabilir?: boolean;
  yayinlandi?: boolean;
};

export async function adminSinavTakvimOlustur(veri: SinavTakvimFormVeri) {
  const sinav = await prisma.sinav.create({
    data: {
      baslik: veri.baslik,
      aciklama: veri.aciklama ?? null,
      tur: veri.tur,
      grupId: veri.grupId,
      baslangicZamani: veri.baslangicZamani,
      bitisZamani: veri.bitisZamani,
      sureDakika: veri.sureDakika ?? 120,
      ucret: veri.ucret ?? null,
      indirimliUcret: veri.indirimliUcret ?? null,
      takvimdeGoster: veri.takvimdeGoster ?? true,
      satinAlinabilir: veri.satinAlinabilir ?? true,
      yayinlandi: veri.yayinlandi ?? true,
    },
    include: { grup: { select: { id: true, ad: true, tur: true } } },
  });
  return sinav;
}

export async function adminSinavTakvimGuncelle(id: string, veri: Partial<SinavTakvimFormVeri>) {
  const mevcut = await prisma.sinav.findUnique({ where: { id } });
  if (!mevcut) throw new AppHatasi('Sınav bulunamadı', 404);

  const sinav = await prisma.sinav.update({
    where: { id },
    data: {
      ...(veri.baslik !== undefined ? { baslik: veri.baslik } : {}),
      ...(veri.aciklama !== undefined ? { aciklama: veri.aciklama } : {}),
      ...(veri.tur !== undefined ? { tur: veri.tur } : {}),
      ...(veri.grupId !== undefined ? { grupId: veri.grupId } : {}),
      ...(veri.baslangicZamani !== undefined ? { baslangicZamani: veri.baslangicZamani } : {}),
      ...(veri.bitisZamani !== undefined ? { bitisZamani: veri.bitisZamani } : {}),
      ...(veri.sureDakika !== undefined ? { sureDakika: veri.sureDakika } : {}),
      ...(veri.ucret !== undefined ? { ucret: veri.ucret } : {}),
      ...(veri.indirimliUcret !== undefined ? { indirimliUcret: veri.indirimliUcret } : {}),
      ...(veri.takvimdeGoster !== undefined ? { takvimdeGoster: veri.takvimdeGoster } : {}),
      ...(veri.satinAlinabilir !== undefined ? { satinAlinabilir: veri.satinAlinabilir } : {}),
      ...(veri.yayinlandi !== undefined ? { yayinlandi: veri.yayinlandi } : {}),
    },
    include: { grup: { select: { id: true, ad: true, tur: true } } },
  });
  return sinav;
}

export async function adminSinavTakvimSil(id: string) {
  const mevcut = await prisma.sinav.findUnique({ where: { id } });
  if (!mevcut) throw new AppHatasi('Sınav bulunamadı', 404);
  await prisma.sinav.delete({ where: { id } });
}

/** Oturum olmadan yayınlanmış takvim sınavları */
export async function publicSinavTakvimListele(yil: number, ay: number) {
  const { baslangic, bitis } = ayAraligi(yil, ay);
  const simdi = new Date();

  const sinavlar = await prisma.sinav.findMany({
    where: {
      yayinlandi: true,
      takvimdeGoster: true,
      baslangicZamani: { gte: baslangic, lte: bitis },
    },
    orderBy: { baslangicZamani: 'asc' },
    include: {
      grup: { select: { id: true, ad: true, tur: true } },
      _count: { select: { sorular: true } },
    },
  });

  return sinavlar.map((s) => ({
    id: s.id,
    baslik: s.baslik,
    aciklama: s.aciklama,
    tur: s.tur,
    grupId: s.grupId,
    grup: s.grup,
    baslangicZamani: s.baslangicZamani,
    bitisZamani: s.bitisZamani,
    sureDakika: s.sureDakika,
    ucret: s.ucret,
    indirimliUcret: s.indirimliUcret,
    gosterilenFiyat: gosterilenFiyat(s.ucret, s.indirimliUcret),
    satinAlinabilir: s.satinAlinabilir,
    soruSayisi: s._count.sorular,
    erisimVar: false,
    bekleyenSatinAlim: false,
    durum: simdi < s.baslangicZamani ? 'YAKINDA' : simdi > s.bitisZamani ? 'BITTI' : 'AKTIF',
  }));
}

export async function ogrenciSinavTakvimListele(ogrenciId: string, kullaniciId: string, yil: number, ay: number) {
  const { baslangic, bitis } = ayAraligi(yil, ay);
  const simdi = new Date();

  const [sinavlar, atamalar, bekleyenSatinAlimlar] = await Promise.all([
    prisma.sinav.findMany({
      where: {
        yayinlandi: true,
        takvimdeGoster: true,
        baslangicZamani: { gte: baslangic, lte: bitis },
      },
      orderBy: { baslangicZamani: 'asc' },
      include: {
        grup: { select: { id: true, ad: true, tur: true } },
        _count: { select: { sorular: true } },
      },
    }),
    prisma.ogrenciSinavAtama.findMany({
      where: { ogrenciId },
      select: { sinavId: true },
    }),
    prisma.satinAlim.findMany({
      where: {
        kullaniciId,
        sinavId: { not: null },
        durum: 'BEKLEMEDE',
      },
      select: { sinavId: true },
    }),
  ]);

  const atamaSet = new Set(atamalar.map((a) => a.sinavId));
  const bekleyenSet = new Set(bekleyenSatinAlimlar.map((b) => b.sinavId!).filter(Boolean));

  const sonuc = await Promise.all(
    sinavlar.map(async (s) => {
      const grupErisim = atamaSet.has(s.id)
        ? true
        : await ogrenciSinavErisimiVar(ogrenciId, { id: s.id, grupId: s.grupId });

      return {
        id: s.id,
        baslik: s.baslik,
        aciklama: s.aciklama,
        tur: s.tur,
        grupId: s.grupId,
        grup: s.grup,
        baslangicZamani: s.baslangicZamani,
        bitisZamani: s.bitisZamani,
        sureDakika: s.sureDakika,
        ucret: s.ucret,
        indirimliUcret: s.indirimliUcret,
        gosterilenFiyat: gosterilenFiyat(s.ucret, s.indirimliUcret),
        satinAlinabilir: s.satinAlinabilir,
        soruSayisi: s._count.sorular,
        erisimVar: grupErisim,
        bekleyenSatinAlim: bekleyenSet.has(s.id),
        durum: simdi < s.baslangicZamani ? 'YAKINDA' : simdi > s.bitisZamani ? 'BITTI' : 'AKTIF',
      };
    })
  );

  return sonuc;
}

export async function sinavSatinAlimOlustur(kullaniciId: string, sinavId: string, notlar?: string) {
  const olusturulan = await sinavSatinAlimKaydet(kullaniciId, sinavId, notlar);

  await ogrenciBildirimGonder({
    kullaniciId,
    baslik: 'Sınav siparişiniz alındı',
    mesaj: `«${olusturulan.sinav?.baslik ?? 'Sınav'}» için siparişiniz oluşturuldu (${olusturulan.miktar.toLocaleString('tr-TR')} ₺). Ödeme onayından sonra sınava erişebilirsiniz.`,
    tur: 'sinav_satin_alim',
    veriJson: { sinavId, satinAlimId: olusturulan.id },
  });

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: {
      email: true,
      ogrenciProfil: { select: { ad: true, soyad: true } },
      veliProfil: { select: { ad: true, soyad: true } },
      adminProfil: { select: { ad: true, soyad: true } },
    },
  });
  await adminlereSiparisBildirimi({
    siparisId: olusturulan.id,
    kullaniciId,
    kullanici,
    urunAd: olusturulan.sinav?.baslik ?? 'Sınav',
    tutar: olusturulan.miktar,
    ucretsiz: olusturulan.miktar <= 0,
    paketMi: false,
  });

  return olusturulan;
}

async function sinavSatinAlimKaydet(
  kullaniciId: string,
  sinavId: string,
  notlar?: string,
  opts?: {
    miktar?: number;
    indirimMiktari?: number;
    listeFiyat?: number;
    paketId?: string | null;
    notEtiketi?: string;
    bekleyenSiparisiYenidenKullan?: boolean;
  }
) {
  const ogrenci = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId } });
  if (!ogrenci) throw new AppHatasi('Öğrenci profili bulunamadı', 404);

  const sinav = await prisma.sinav.findFirst({
    where: {
      id: sinavId,
      yayinlandi: true,
      takvimdeGoster: true,
      satinAlinabilir: true,
    },
  });
  if (!sinav) throw new AppHatasi('Sınav bulunamadı veya satışa kapalı', 404);

  const listeFiyat = opts?.listeFiyat ?? gosterilenFiyat(sinav.ucret, sinav.indirimliUcret);
  const fiyat = opts?.miktar ?? listeFiyat;
  if (fiyat == null || fiyat < 0) {
    throw new AppHatasi('Bu sınav için fiyat tanımlı değil', 400);
  }
  const ucretsizMi = fiyat === 0;

  const erisimVar = await ogrenciSinavErisimiVar(ogrenci.id, { id: sinav.id, grupId: sinav.grupId });
  if (erisimVar) throw new AppHatasi(`«${sinav.baslik}» sınavına zaten erişiminiz var`, 400);

  const mevcutBekleyen = await prisma.satinAlim.findFirst({
    where: { kullaniciId, sinavId, durum: 'BEKLEMEDE' },
  });
  if (mevcutBekleyen) {
    if (opts?.bekleyenSiparisiYenidenKullan === false) {
      throw new AppHatasi(`«${sinav.baslik}» için bekleyen bir siparişiniz zaten var`, 400);
    }
    return prisma.satinAlim.findUniqueOrThrow({
      where: { id: mevcutBekleyen.id },
      include: {
        sinav: { select: { id: true, baslik: true, tur: true, ucret: true, indirimliUcret: true } },
      },
    });
  }

  const ref = `SINAV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8)}`;
  const notParcalari = [opts?.notEtiketi || 'Takvim sınav satın alma', notlar?.trim()].filter(Boolean);
  const indirim = opts?.indirimMiktari ?? 0;
  if (indirim > 0) {
    notParcalari.push(`Kademeli indirim: ${indirim.toLocaleString('tr-TR')} ₺`);
  }
  if (ucretsizMi) {
    notParcalari.push('Ücretsiz deneme — otomatik tanımlandı');
  }
  const notMetni = notParcalari.join(' | ');

  const kayit = await prisma.satinAlim.create({
    data: {
      kullaniciId,
      sinavId: sinav.id,
      ...(opts?.paketId ? { paketId: opts.paketId } : {}),
      miktar: fiyat,
      indirimMiktari: indirim,
      toplamTutar: fiyat,
      durum: ucretsizMi ? 'TAMAMLANDI' : 'BEKLEMEDE',
      odemeZamani: ucretsizMi ? new Date() : null,
      referansNo: ref,
      notlar: notMetni,
      odemeMetodu: ucretsizMi ? 'UCRETSIZ' : 'HAVALE',
    },
    include: {
      sinav: { select: { id: true, baslik: true, tur: true, ucret: true, indirimliUcret: true } },
    },
  });

  // Ücretsiz sınav: ödeme beklemeden erişimi hemen tanımla.
  if (ucretsizMi) {
    await satinAlimPaketHaklariniUygula(kayit.id);
  }

  return kayit;
}

/** Sepetteki sınavlar için toplu sipariş oluşturur */
export async function sinavSepetSatinAlimOlustur(
  kullaniciId: string,
  sinavIds: string[],
  notlar?: string
) {
  const benzersiz = [...new Set(sinavIds.map((id) => id.trim()).filter(Boolean))];
  if (benzersiz.length === 0) throw new AppHatasi('Sepet boş', 400);

  const ogrenci = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId } });
  if (!ogrenci) throw new AppHatasi('Öğrenci profili bulunamadı', 404);

  const sinavlar = await prisma.sinav.findMany({
    where: {
      id: { in: benzersiz },
      yayinlandi: true,
      takvimdeGoster: true,
      satinAlinabilir: true,
    },
  });

  const fiyatAyarlari = await sinavSepetFiyatAyarlariGetir();
  const hazir: { sinavId: string; listeFiyat: number }[] = [];
  const hatalar: { sinavId: string; mesaj: string }[] = [];

  for (const sinavId of benzersiz) {
    const sinav = sinavlar.find((s) => s.id === sinavId);
    if (!sinav) {
      hatalar.push({ sinavId, mesaj: 'Sınav bulunamadı veya satışa kapalı' });
      continue;
    }
    const listeFiyat = gosterilenFiyat(sinav.ucret, sinav.indirimliUcret);
    if (listeFiyat == null || listeFiyat < 0) {
      hatalar.push({ sinavId, mesaj: 'Bu sınav için fiyat tanımlı değil' });
      continue;
    }
    const erisimVar = await ogrenciSinavErisimiVar(ogrenci.id, { id: sinav.id, grupId: sinav.grupId });
    if (erisimVar) {
      hatalar.push({ sinavId, mesaj: `«${sinav.baslik}» sınavına zaten erişiminiz var` });
      continue;
    }
    hazir.push({ sinavId, listeFiyat });
  }

  if (hazir.length === 0) {
    throw new AppHatasi(hatalar[0]?.mesaj || 'Hiçbir sipariş oluşturulamadı', 400);
  }

  const listeToplam = hazir.reduce((t, h) => t + h.listeFiyat, 0);
  const kademeSonuc = kademeliSepetToplamHesapla(hazir.length, listeToplam, fiyatAyarlari);
  const odenecekMiktarlar = kademeSonuc.kademeAktif
    ? kademeliMiktarDagit(kademeSonuc.toplam, hazir.length)
    : hazir.map((h) => h.listeFiyat);
  const toplamIndirim = kademeSonuc.indirim;
  const indirimParcalari =
    toplamIndirim > 0
      ? kademeliMiktarDagit(toplamIndirim, hazir.length).map((d) => Math.max(0, d))
      : hazir.map(() => 0);

  const olusturulan: Awaited<ReturnType<typeof sinavSatinAlimKaydet>>[] = [];

  for (let i = 0; i < hazir.length; i++) {
    const { sinavId, listeFiyat } = hazir[i];
    try {
      const kayit = await sinavSatinAlimKaydet(kullaniciId, sinavId, notlar, {
        miktar: odenecekMiktarlar[i],
        indirimMiktari: indirimParcalari[i],
        listeFiyat,
      });
      olusturulan.push(kayit);
    } catch (e) {
      hatalar.push({
        sinavId,
        mesaj: e instanceof AppHatasi ? e.mesaj : e instanceof Error ? e.message : 'Sipariş oluşturulamadı',
      });
    }
  }

  if (olusturulan.length === 0) {
    throw new AppHatasi(hatalar[0]?.mesaj || 'Hiçbir sipariş oluşturulamadı', 400);
  }

  const toplamTutar = olusturulan.reduce((t, s) => t + s.miktar, 0);
  const baslikListesi = olusturulan
    .map((s) => s.sinav?.baslik)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const indirimMetni =
    kademeSonuc.indirim > 0
      ? ` (liste: ${kademeSonuc.listeToplam.toLocaleString('tr-TR')} ₺, kademeli indirim: ${kademeSonuc.indirim.toLocaleString('tr-TR')} ₺)`
      : '';

  await ogrenciBildirimGonder({
    kullaniciId,
    baslik: 'Sınav siparişleriniz alındı',
    mesaj:
      olusturulan.length === 1
        ? `«${baslikListesi}» için siparişiniz oluşturuldu (${toplamTutar.toLocaleString('tr-TR')} ₺${indirimMetni}). Ödeme onayından sonra erişebilirsiniz.`
        : `${olusturulan.length} sınav için siparişleriniz oluşturuldu (toplam ${toplamTutar.toLocaleString('tr-TR')} ₺${indirimMetni}). Ödeme onayından sonra erişebilirsiniz.`,
    tur: 'sinav_satin_alim',
    veriJson: {
      sinavIds: olusturulan.map((s) => s.sinavId),
      adet: olusturulan.length,
      kademeliIndirim: kademeSonuc.indirim,
    },
  });

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: {
      email: true,
      ogrenciProfil: { select: { ad: true, soyad: true } },
      veliProfil: { select: { ad: true, soyad: true } },
      adminProfil: { select: { ad: true, soyad: true } },
    },
  });
  await adminlereSiparisBildirimi({
    siparisId: olusturulan[0].id,
    kullaniciId,
    kullanici,
    urunAd: baslikListesi || 'Deneme',
    tutar: toplamTutar,
    sinavAdet: olusturulan.length,
    paketMi: false,
  });

  return {
    olusturulan,
    hatalar,
    toplamTutar,
    adet: olusturulan.length,
    listeToplam: kademeSonuc.listeToplam,
    kademeliIndirim: kademeSonuc.indirim,
    kademe: kademeSonuc.kademe ?? null,
  };
}

export async function paketIciSinavSepetSatinAlimOlustur(
  kullaniciId: string,
  paketId: string,
  sinavIds: string[],
  notlar?: string
) {
  const benzersiz = [...new Set(sinavIds.map((id) => id.trim()).filter(Boolean))];
  if (benzersiz.length === 0) throw new AppHatasi('Sepet boş', 400);

  const ogrenci = await prisma.ogrenciProfil.findUnique({ where: { kullaniciId } });
  if (!ogrenci) throw new AppHatasi('Öğrenci profili bulunamadı', 404);

  const paket = await prisma.paket.findFirst({
    where: { id: paketId, aktif: true },
  });
  if (!paket) throw new AppHatasi('Paket bulunamadı veya satışta değil', 404);

  const paketSinavlari = await paketSinavlariniGetir(paket);
  const ucretsizSinavSet = new Set(paket.ucretsizSinavIds || []);
  const ucretliSinavlar = paketSinavlari.filter((sinav) => !ucretsizSinavSet.has(sinav.id));
  const sinavMap = new Map(ucretliSinavlar.map((sinav) => [sinav.id, sinav]));
  const fiyatAyarlari = sinavSepetFiyatAyarlariParse({
    aktif: paket.kademeliFiyatAktif,
    tekDenemeFiyati: paket.tekilSinavFiyati ?? 0,
    kademeler: Array.isArray(paket.fiyatKademeleriJson) ? paket.fiyatKademeleriJson : [],
  });

  const hazir: { sinavId: string; listeFiyat: number }[] = [];
  const hatalar: { sinavId: string; mesaj: string }[] = [];

  for (const sinavId of benzersiz) {
    const sinav = sinavMap.get(sinavId);
    if (!sinav) {
      hatalar.push({ sinavId, mesaj: 'Seçilen sınav bu paketin ücretli denemeleri arasında değil' });
      continue;
    }
    const listeFiyat = gosterilenFiyat(sinav.ucret, sinav.indirimliUcret);
    if (listeFiyat == null || listeFiyat < 0) {
      hatalar.push({ sinavId, mesaj: 'Bu sınav için fiyat tanımlı değil' });
      continue;
    }
    const erisimVar = await ogrenciSinavErisimiVar(ogrenci.id, { id: sinav.id, grupId: sinav.grupId });
    if (erisimVar) {
      hatalar.push({ sinavId, mesaj: `«${sinav.baslik}» sınavına zaten erişiminiz var` });
      continue;
    }
    hazir.push({ sinavId, listeFiyat });
  }

  if (hazir.length === 0) {
    throw new AppHatasi(hatalar[0]?.mesaj || 'Hiçbir sipariş oluşturulamadı', 400);
  }

  const listeToplam = hazir.reduce((t, h) => t + h.listeFiyat, 0);
  const kademeSonuc = kademeliSepetToplamHesapla(hazir.length, listeToplam, fiyatAyarlari);
  const odenecekMiktarlar = kademeSonuc.kademeAktif
    ? kademeliMiktarDagit(kademeSonuc.toplam, hazir.length)
    : hazir.map((h) => h.listeFiyat);
  const toplamIndirim = kademeSonuc.indirim;
  const indirimParcalari =
    toplamIndirim > 0
      ? kademeliMiktarDagit(toplamIndirim, hazir.length).map((d) => Math.max(0, d))
      : hazir.map(() => 0);

  const olusturulan: Awaited<ReturnType<typeof sinavSatinAlimKaydet>>[] = [];

  for (let i = 0; i < hazir.length; i++) {
    const { sinavId, listeFiyat } = hazir[i];
    try {
      const kayit = await sinavSatinAlimKaydet(kullaniciId, sinavId, notlar, {
        miktar: odenecekMiktarlar[i],
        indirimMiktari: indirimParcalari[i],
        listeFiyat,
        paketId: paket.id,
        notEtiketi: `Paket içi deneme satın alma (${paket.ad})`,
        bekleyenSiparisiYenidenKullan: false,
      });
      olusturulan.push(kayit);
    } catch (e) {
      hatalar.push({
        sinavId,
        mesaj: e instanceof AppHatasi ? e.mesaj : e instanceof Error ? e.message : 'Sipariş oluşturulamadı',
      });
    }
  }

  if (olusturulan.length === 0) {
    throw new AppHatasi(hatalar[0]?.mesaj || 'Hiçbir sipariş oluşturulamadı', 400);
  }

  const toplamTutar = olusturulan.reduce((t, s) => t + s.miktar, 0);
  const tumuUcretsiz = toplamTutar === 0;

  await ogrenciBildirimGonder({
    kullaniciId,
    baslik: tumuUcretsiz ? 'Ücretsiz denemeniz tanımlandı' : 'Paket içi sınav siparişiniz alındı',
    mesaj: tumuUcretsiz
      ? olusturulan.length === 1
        ? `«${paket.ad}» içinden 1 ücretsiz deneme hesabınıza tanımlandı. Hemen çözebilirsiniz.`
        : `«${paket.ad}» içinden ${olusturulan.length} ücretsiz deneme hesabınıza tanımlandı. Hemen çözebilirsiniz.`
      : olusturulan.length === 1
        ? `«${paket.ad}» içinden 1 deneme için siparişiniz oluşturuldu (${toplamTutar.toLocaleString('tr-TR')} ₺).`
        : `«${paket.ad}» içinden ${olusturulan.length} deneme için siparişiniz oluşturuldu (toplam ${toplamTutar.toLocaleString('tr-TR')} ₺).`,
    tur: 'sinav_satin_alim',
    veriJson: {
      paketId: paket.id,
      paketAd: paket.ad,
      sinavIds: olusturulan.map((s) => s.sinavId),
      adet: olusturulan.length,
      kademeliIndirim: kademeSonuc.indirim,
    },
  });

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: {
      email: true,
      ogrenciProfil: { select: { ad: true, soyad: true } },
      veliProfil: { select: { ad: true, soyad: true } },
      adminProfil: { select: { ad: true, soyad: true } },
    },
  });
  await adminlereSiparisBildirimi({
    siparisId: olusturulan[0].id,
    kullaniciId,
    kullanici,
    urunAd: paket.ad,
    tutar: toplamTutar,
    ucretsiz: tumuUcretsiz,
    sinavAdet: olusturulan.length,
    paketMi: true,
  });

  return {
    olusturulan,
    hatalar,
    toplamTutar,
    adet: olusturulan.length,
    listeToplam: kademeSonuc.listeToplam,
    kademeliIndirim: kademeSonuc.indirim,
    kademe: kademeSonuc.kademe ?? null,
    paket: { id: paket.id, ad: paket.ad },
  };
}

export { parseFiyat, gosterilenFiyat };
