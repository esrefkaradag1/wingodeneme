import { prisma } from '../config/database';
import { bildirimGonder } from './bildirim.service';
import { AppHatasi } from '../middlewares/hata.middleware';
import { KocTipi, KurumBasvuruDurum, Rol, KatilimDurumu } from '@prisma/client';
import { ogrenciAnalizGetir } from './analiz.service';
import { sinavListesiGetir } from './sinav.service';
import { denemeKarnesiGetir } from './deneme-karnesi.service';

function referansKodUret(): string {
  const alfabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let kod = '';
  for (let i = 0; i < 6; i++) {
    kod += alfabet[Math.floor(Math.random() * alfabet.length)];
  }
  return `WINGO-${kod}`;
}

export function referansKodNormalize(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export async function benzersizReferansKodUret(maxDeneme = 12): Promise<string> {
  for (let i = 0; i < maxDeneme; i++) {
    const kod = referansKodUret();
    const varMi = await prisma.kocProfil.findUnique({ where: { referansKod: kod }, select: { id: true } });
    if (!varMi) return kod;
  }
  throw new AppHatasi('Referans kodu üretilemedi, tekrar deneyin', 500);
}

type ErisimSonucu = { erisim: boolean; sebep?: string; mesaj?: string };

/** Kurumsal profilin (veya kurum öğretmeninin bağlı olduğu kurumun) panele erişip erişemeyeceği */
function kurumErisimDegerlendir(profil: {
  tip: KocTipi;
  aktif: boolean;
  basvuruDurum: KurumBasvuruDurum;
  demoBitis: Date | null;
  kararNotu: string | null;
}): ErisimSonucu {
  switch (profil.basvuruDurum) {
    case KurumBasvuruDurum.BEKLEMEDE:
      return {
        erisim: false,
        sebep: 'BEKLEMEDE',
        mesaj: 'Kurum başvurunuz yönetici incelemesinde. Onaylandığında paneliniz açılacak.',
      };
    case KurumBasvuruDurum.REDDEDILDI:
      return {
        erisim: false,
        sebep: 'REDDEDILDI',
        mesaj: profil.kararNotu
          ? `Başvurunuz reddedildi: ${profil.kararNotu}`
          : 'Başvurunuz reddedildi. Detay için yönetici ile iletişime geçin.',
      };
    case KurumBasvuruDurum.PASIF:
      return {
        erisim: false,
        sebep: 'PASIF',
        mesaj: profil.kararNotu || 'Kurum hesabınız pasife alındı. Yönetici ile iletişime geçin.',
      };
    default:
      break;
  }
  if (!profil.aktif) {
    return { erisim: false, sebep: 'PASIF', mesaj: 'Hesabınız pasif durumda. Yönetici ile iletişime geçin.' };
  }
  if (profil.demoBitis && profil.demoBitis.getTime() < Date.now()) {
    return {
      erisim: false,
      sebep: 'DEMO_BITTI',
      mesaj: 'Demo süreniz doldu. Devam etmek için yönetici ile iletişime geçin.',
    };
  }
  return { erisim: true };
}

/** Profil + (kurum öğretmeni ise) bağlı olduğu kurumun erişim durumu */
async function kocErisimDurumu(profil: {
  id: string;
  tip: KocTipi;
  aktif: boolean;
  basvuruDurum: KurumBasvuruDurum;
  demoBitis: Date | null;
  kararNotu: string | null;
  ustKurumId: string | null;
}): Promise<ErisimSonucu> {
  const kendi = kurumErisimDegerlendir(profil);
  if (!kendi.erisim) return kendi;

  if (profil.tip === KocTipi.KURUM_OGRETMENI && profil.ustKurumId) {
    const kurum = await prisma.kocProfil.findUnique({
      where: { id: profil.ustKurumId },
      select: { tip: true, aktif: true, basvuruDurum: true, demoBitis: true, kararNotu: true },
    });
    if (!kurum) {
      return { erisim: false, sebep: 'KURUM_YOK', mesaj: 'Bağlı olduğunuz kurum bulunamadı.' };
    }
    const kurumDurumu = kurumErisimDegerlendir(kurum);
    if (!kurumDurumu.erisim) {
      return {
        erisim: false,
        sebep: kurumDurumu.sebep,
        mesaj: 'Bağlı olduğunuz kurumun paneli şu anda erişime kapalı. Kurum yöneticinize başvurun.',
      };
    }
  }
  return { erisim: true };
}

/** Panel erişim durumu — 403 fırlatmaz, bilgilendirme ekranı için kullanılır */
export async function kocDurumGetir(kullaniciId: string) {
  const profil = await prisma.kocProfil.findUnique({ where: { kullaniciId } });
  if (!profil) {
    const ku = await prisma.kullanici.findUnique({ where: { id: kullaniciId }, select: { rol: true } });
    return {
      profilVar: false,
      erisim: false,
      sebep: ku?.rol === Rol.TEACHER ? 'YETKI_YOK' : 'PROFIL_YOK',
      mesaj:
        ku?.rol === Rol.TEACHER
          ? 'Koç paneli yetkiniz yok. Yönetici panelinden koç yetkisi verilmesi gerekiyor.'
          : 'Koç profili bulunamadı.',
    };
  }

  const durum = await kocErisimDurumu(profil);
  return {
    profilVar: true,
    erisim: durum.erisim,
    sebep: durum.sebep ?? null,
    mesaj: durum.mesaj ?? null,
    koc: {
      ad: profil.ad,
      soyad: profil.soyad,
      tip: profil.tip,
      kurumAdi: profil.kurumAdi,
      referansKod: profil.referansKod,
      basvuruDurum: profil.basvuruDurum,
      demoBitis: profil.demoBitis?.toISOString() ?? null,
      basvuruTarihi: profil.olusturuldu.toISOString(),
      kararNotu: profil.kararNotu,
      kurumYoneticisi: profil.tip === KocTipi.KURUMSAL,
      kurumOgretmeni: profil.tip === KocTipi.KURUM_OGRETMENI,
    },
  };
}

/**
 * Koç panelini kullanan hesabın profilini döndürür.
 * - Rol KOC: profil yoksa otomatik oluşturulur (kayıt akışı dışından gelen hesaplar için).
 * - Rol TEACHER: yalnızca yönetici tarafından koç yetkisi verilmişse (profil zaten varsa) erişir.
 * Pasife alınmış profiller panele erişemez.
 */
export async function kocProfilGetirVeyaOlustur(kullaniciId: string) {
  const mevcut = await prisma.kocProfil.findUnique({ where: { kullaniciId } });
  if (mevcut) {
    const durum = await kocErisimDurumu(mevcut);
    if (!durum.erisim) {
      throw new AppHatasi(durum.mesaj || 'Panel erişiminiz kapalı', 403);
    }
    return mevcut;
  }

  const ku = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: { email: true, rol: true, adminProfil: { select: { ad: true, soyad: true } } },
  });
  if (!ku) throw new AppHatasi('Koç profili bulunamadı', 404);

  if (ku.rol === Rol.TEACHER) {
    throw new AppHatasi(
      'Koç paneli yetkiniz yok. Yönetici panelinden koç yetkisi verilmesi gerekiyor.',
      403,
    );
  }
  if (ku.rol !== Rol.KOC) {
    throw new AppHatasi('Koç profili bulunamadı', 404);
  }

  const local = ku.email.split('@')[0] || 'koc';
  const ad = ku.adminProfil?.ad || local.charAt(0).toUpperCase() + local.slice(1);
  const referansKod = await benzersizReferansKodUret();

  return prisma.kocProfil.create({
    data: {
      kullaniciId,
      ad,
      soyad: ku.adminProfil?.soyad || '',
      referansKod,
      tip: KocTipi.BIREYSEL,
    },
  });
}

/**
 * Koç kapsamı — profilin hangi öğrencileri görebileceğini belirler.
 * - BIREYSEL / KURUMSAL: doğrudan kendine bağlı öğrenciler
 * - KURUM_OGRETMENI: bağlı olduğu kurumun öğrencilerinden, atandığı sınıflardakiler
 */
export async function kocKapsamGetir(kocKullaniciId: string) {
  const profil = await kocProfilGetirVeyaOlustur(kocKullaniciId);

  if (profil.tip === KocTipi.KURUM_OGRETMENI) {
    if (!profil.ustKurumId) {
      throw new AppHatasi('Kurum bağlantınız bulunamadı. Kurum yöneticinize başvurun.', 403);
    }
    const atamalar = await prisma.kurumSinifOgretmen.findMany({
      where: { kocProfilId: profil.id },
      select: { sinifId: true },
    });
    const sinifIds = atamalar.map((a) => a.sinifId);
    return {
      profil,
      kurumId: profil.ustKurumId,
      sinifIds,
      ogrenciWhere: { kocId: profil.ustKurumId, kurumSinifId: { in: sinifIds } } as const,
      yonetici: false,
    };
  }

  return {
    profil,
    kurumId: profil.tip === KocTipi.KURUMSAL ? profil.id : null,
    sinifIds: null as string[] | null,
    ogrenciWhere: { kocId: profil.id } as const,
    yonetici: true,
  };
}

/** Yalnızca kurumsal hesaplar — kurum yönetim uçları için */
export async function kurumKapsamGetir(kocKullaniciId: string) {
  const profil = await kocProfilGetirVeyaOlustur(kocKullaniciId);
  if (profil.tip !== KocTipi.KURUMSAL) {
    throw new AppHatasi('Bu işlem yalnızca kurumsal hesaplar içindir', 403);
  }
  return profil;
}

export async function kocOgrenciBaglaEmail(kocKullaniciId: string, ogrenciEmail: string) {
  const email = ogrenciEmail.trim().toLowerCase();
  if (!email.length) throw new AppHatasi('Öğrenci e-postası gerekli', 400);

  const kocProfil = await kocProfilGetirVeyaOlustur(kocKullaniciId);
  if (kocProfil.tip === KocTipi.KURUM_OGRETMENI) {
    throw new AppHatasi('Öğrenci ekleme yetkisi kurum yöneticisindedir', 403);
  }

  const ogrenciKu = await prisma.kullanici.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { ogrenciProfil: true },
  });
  if (!ogrenciKu) throw new AppHatasi('Bu e-posta ile kayıtlı öğrenci bulunamadı', 404);
  if (ogrenciKu.rol !== Rol.OGRENCI) throw new AppHatasi('Bu e-posta bir öğrenci hesabına ait değil', 400);
  if (!ogrenciKu.ogrenciProfil) throw new AppHatasi('Öğrenci profili eksik', 400);

  const op = ogrenciKu.ogrenciProfil;
  if (op.kocId && op.kocId !== kocProfil.id) {
    throw new AppHatasi('Bu öğrenci başka bir koç / kuruma bağlı', 409);
  }
  if (op.kocId === kocProfil.id) {
    return { zatenBagli: true, ogrenci: { id: op.id, ad: op.ad, soyad: op.soyad } as const };
  }

  await prisma.ogrenciProfil.update({
    where: { id: op.id },
    data: { kocId: kocProfil.id },
  });

  return { zatenBagli: false, ogrenci: { id: op.id, ad: op.ad, soyad: op.soyad } as const };
}

/** Öğrenci kendi hesabından referans kodu ile koça bağlanır */
export async function ogrenciKocReferansBagla(ogrenciKullaniciId: string, referansKodHam: string) {
  const kod = referansKodNormalize(referansKodHam);
  if (!kod) throw new AppHatasi('Referans kodu gerekli', 400);

  const ogrenciKu = await prisma.kullanici.findUnique({
    where: { id: ogrenciKullaniciId },
    include: { ogrenciProfil: true },
  });
  if (!ogrenciKu?.ogrenciProfil || ogrenciKu.rol !== Rol.OGRENCI) {
    throw new AppHatasi('Yalnızca öğrenciler referans kodu girebilir', 403);
  }

  const koc = await prisma.kocProfil.findUnique({ where: { referansKod: kod } });
  if (!koc || !koc.aktif) throw new AppHatasi('Geçersiz veya pasif referans kodu', 404);

  const op = ogrenciKu.ogrenciProfil;
  if (op.kocId && op.kocId !== koc.id) {
    throw new AppHatasi('Zaten başka bir koç / kuruma bağlısınız. Değiştirmek için destek ile iletişime geçin.', 409);
  }
  if (op.kocId === koc.id) {
    return {
      zatenBagli: true,
      koc: { ad: koc.ad, soyad: koc.soyad, tip: koc.tip, kurumAdi: koc.kurumAdi, referansKod: koc.referansKod },
    };
  }

  await prisma.ogrenciProfil.update({
    where: { id: op.id },
    data: { kocId: koc.id },
  });

  return {
    zatenBagli: false,
    koc: { ad: koc.ad, soyad: koc.soyad, tip: koc.tip, kurumAdi: koc.kurumAdi, referansKod: koc.referansKod },
  };
}

export async function kocOgrenciDogrula(kocKullaniciId: string, ogrenciProfilId: string) {
  const kapsam = await kocKapsamGetir(kocKullaniciId);
  const ogrenci = await prisma.ogrenciProfil.findFirst({
    where: { id: ogrenciProfilId, ...kapsam.ogrenciWhere },
    include: {
      kullanici: { select: { id: true, email: true } },
      koc: { select: { ad: true, soyad: true, tip: true, kurumAdi: true } },
    },
  });
  if (!ogrenci) throw new AppHatasi('Bu öğrenciye erişim yetkiniz yok', 403);
  return ogrenci;
}

export async function kocOzetGetir(kocKullaniciId: string) {
  const kapsam = await kocKapsamGetir(kocKullaniciId);
  const kocProfil = kapsam.profil;

  const ogrenciler = await prisma.ogrenciProfil.findMany({
    where: kapsam.ogrenciWhere,
    orderBy: { ad: 'asc' },
    include: {
      kurumSinif: { select: { id: true, ad: true } },
      sinavKatilimlari: {
        where: { durum: 'TAMAMLANDI' },
        orderBy: { olusturuldu: 'desc' },
        take: 8,
        include: { sinav: { select: { baslik: true, tur: true } } },
      },
    },
  });

  const ogrenciOzetleri = ogrenciler.map((o) => {
    const katilimlar = o.sinavKatilimlari;
    const n = katilimlar.length;
    const ortalamaNet =
      n > 0 ? katilimlar.reduce((s, k) => s + k.netPuan, 0) / n : 0;
    const siralamalar = katilimlar.map((k) => k.ulusalSiralama).filter((x): x is number => x != null);
    const enIyiSiralama = siralamalar.length > 0 ? Math.min(...siralamalar) : null;

    return {
      id: o.id,
      ad: o.ad,
      soyad: o.soyad,
      sinif: o.sinif,
      okul: o.okul,
      ogretimTuru: o.ogretimTuru,
      kurumSinifId: o.kurumSinifId,
      kurumSinifAdi: o.kurumSinif?.ad ?? null,
      ozet: {
        tamamlananDeneme: n,
        ortalamaNet: parseFloat(ortalamaNet.toFixed(2)),
        enIyiSiralama,
      },
      sonDenemeler: katilimlar.map((k) => ({
        katilimId: k.id,
        sinavBaslik: k.sinav.baslik,
        sinavTur: k.sinav.tur,
        net: k.netPuan,
        siralama: k.ulusalSiralama,
        tarih: k.olusturuldu.toISOString(),
      })),
    };
  });

  const denemeli = ogrenciOzetleri.filter((o) => o.ozet.tamamlananDeneme > 0);
  const toplamDeneme = ogrenciOzetleri.reduce((s, o) => s + o.ozet.tamamlananDeneme, 0);
  const sinifOrtNet =
    denemeli.length > 0
      ? denemeli.reduce((s, o) => s + o.ozet.ortalamaNet, 0) / denemeli.length
      : 0;

  const paketSatinAlim = await prisma.satinAlim.count({
    where: { kocProfilId: kocProfil.id, durum: 'TAMAMLANDI' },
  });

  const kurumsal = kocProfil.tip === KocTipi.KURUMSAL;
  const [sinifSayisi, ogretmenSayisi] = kurumsal
    ? await Promise.all([
        prisma.kurumSinif.count({ where: { kurumId: kocProfil.id } }),
        prisma.kocProfil.count({ where: { ustKurumId: kocProfil.id } }),
      ])
    : [0, 0];

  return {
    koc: {
      ad: kocProfil.ad,
      soyad: kocProfil.soyad,
      tip: kocProfil.tip,
      kurumAdi: kocProfil.kurumAdi,
      referansKod: kocProfil.referansKod,
      /** Kurum yöneticisi mi (öğretmen/öğrenci ekleyebilir) */
      kurumYoneticisi: kurumsal,
      kurumOgretmeni: kocProfil.tip === KocTipi.KURUM_OGRETMENI,
    },
    ogrenciSayisi: ogrenciOzetleri.length,
    toplu: {
      toplamDeneme,
      sinifOrtalamaNet: parseFloat(sinifOrtNet.toFixed(2)),
      aktifOgrenci: denemeli.length,
      tamamlananPaketSatisi: paketSatinAlim,
      sinifSayisi,
      ogretmenSayisi,
    },
    ogrenciler: ogrenciOzetleri,
  };
}

export async function kocTopluAnalizGetir(
  kocKullaniciId: string,
  filtre: { sinifId?: string } = {},
) {
  const kapsam = await kocKapsamGetir(kocKullaniciId);
  const ogrenciler = await prisma.ogrenciProfil.findMany({
    where: {
      ...kapsam.ogrenciWhere,
      ...(filtre.sinifId ? { kurumSinifId: filtre.sinifId } : {}),
    },
    select: {
      id: true,
      ad: true,
      soyad: true,
      ogretimTuru: true,
      kurumSinifId: true,
      kurumSinif: { select: { id: true, ad: true } },
    },
  });

  // Filtre seçenekleri için tüm kapsamdaki sınıflar (filtre uygulanmadan)
  const tumSiniflarHam = await prisma.ogrenciProfil.findMany({
    where: kapsam.ogrenciWhere,
    select: { kurumSinifId: true, kurumSinif: { select: { id: true, ad: true } } },
  });
  const sinifSecenekleriMap = new Map<string, string>();
  for (const o of tumSiniflarHam) {
    if (o.kurumSinifId && o.kurumSinif) {
      sinifSecenekleriMap.set(o.kurumSinif.id, o.kurumSinif.ad);
    }
  }
  const sinifSecenekleri = [...sinifSecenekleriMap.entries()]
    .map(([id, ad]) => ({ id, ad }))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

  const sinifAdMap = new Map(ogrenciler.map((o) => [o.id, o.kurumSinif?.ad ?? null]));
  const sinifIdMap = new Map(ogrenciler.map((o) => [o.id, o.kurumSinifId]));
  const ogrenciIds = ogrenciler.map((o) => o.id);

  if (ogrenciIds.length === 0) {
    return {
      sinavBazli: [],
      ogrenciSiralamasi: [],
      sinifBazli: [],
      dersBazli: [],
      zayifKonular: [],
      sinifSecenekleri,
      seciliSinifId: filtre.sinifId ?? null,
      ozet: { ogrenciSayisi: 0, toplamKatilim: 0, ortalamaNet: 0 },
    };
  }

  const [katilimlar, konuPerformanslari] = await Promise.all([
    prisma.sinavKatilim.findMany({
      where: { ogrenciId: { in: ogrenciIds }, durum: 'TAMAMLANDI' },
      orderBy: { olusturuldu: 'desc' },
      include: {
        sinav: { select: { id: true, baslik: true, tur: true } },
        ogrenci: { select: { id: true, ad: true, soyad: true } },
      },
      take: 800,
    }),
    prisma.konuPerformansi.findMany({
      where: { ogrenciId: { in: ogrenciIds }, toplamSoru: { gt: 0 } },
      include: { konu: { select: { ad: true, ders: true } } },
    }),
  ]);

  const sinavMap = new Map<
    string,
    { sinavId: string; baslik: string; tur: string; katilimSayisi: number; toplamNet: number; netler: number[] }
  >();
  const ogrenciNetMap = new Map<string, { ad: string; soyad: string; netler: number[]; deneme: number }>();

  for (const k of katilimlar) {
    const sKey = k.sinav.id;
    const sMevcut = sinavMap.get(sKey) || {
      sinavId: k.sinav.id,
      baslik: k.sinav.baslik,
      tur: k.sinav.tur,
      katilimSayisi: 0,
      toplamNet: 0,
      netler: [] as number[],
    };
    sMevcut.katilimSayisi += 1;
    sMevcut.toplamNet += k.netPuan;
    sMevcut.netler.push(k.netPuan);
    sinavMap.set(sKey, sMevcut);

    const oKey = k.ogrenci.id;
    const oMevcut = ogrenciNetMap.get(oKey) || {
      ad: k.ogrenci.ad,
      soyad: k.ogrenci.soyad,
      netler: [] as number[],
      deneme: 0,
    };
    oMevcut.deneme += 1;
    oMevcut.netler.push(k.netPuan);
    ogrenciNetMap.set(oKey, oMevcut);
  }

  const sinavBazli = [...sinavMap.values()]
    .map((s) => ({
      sinavId: s.sinavId,
      baslik: s.baslik,
      tur: s.tur,
      katilimSayisi: s.katilimSayisi,
      ortalamaNet: parseFloat((s.toplamNet / s.katilimSayisi).toFixed(2)),
      enYuksekNet: Math.max(...s.netler),
      enDusukNet: Math.min(...s.netler),
    }))
    .sort((a, b) => b.katilimSayisi - a.katilimSayisi);

  const ogrenciSiralamasi = [...ogrenciNetMap.entries()]
    .map(([id, o]) => ({
      ogrenciId: id,
      ad: o.ad,
      soyad: o.soyad,
      kurumSinifAdi: sinifAdMap.get(id) ?? null,
      denemeSayisi: o.deneme,
      ortalamaNet: parseFloat((o.netler.reduce((a, b) => a + b, 0) / o.netler.length).toFixed(2)),
    }))
    .sort((a, b) => b.ortalamaNet - a.ortalamaNet);

  const sinifMap = new Map<string, { ad: string; netler: number[]; ogrenciler: Set<string>; deneme: number }>();
  for (const [ogrenciId, o] of ogrenciNetMap.entries()) {
    const sinifId = sinifIdMap.get(ogrenciId);
    if (!sinifId) continue;
    const mevcut = sinifMap.get(sinifId) || {
      ad: sinifAdMap.get(ogrenciId) || 'Sınıf',
      netler: [] as number[],
      ogrenciler: new Set<string>(),
      deneme: 0,
    };
    mevcut.netler.push(...o.netler);
    mevcut.ogrenciler.add(ogrenciId);
    mevcut.deneme += o.deneme;
    sinifMap.set(sinifId, mevcut);
  }
  const sinifBazli = [...sinifMap.entries()]
    .map(([sinifId, s]) => ({
      sinifId,
      ad: s.ad,
      ogrenciSayisi: s.ogrenciler.size,
      denemeSayisi: s.deneme,
      ortalamaNet: parseFloat((s.netler.reduce((a, b) => a + b, 0) / s.netler.length).toFixed(2)),
      enYuksekNet: Math.max(...s.netler),
    }))
    .sort((a, b) => b.ortalamaNet - a.ortalamaNet);

  // Ders / konu cohort
  const dersMap = new Map<string, { toplamSoru: number; dogru: number; yanlis: number }>();
  const konuMap = new Map<
    string,
    { ders: string; konu: string; toplamSoru: number; dogru: number; yanlis: number }
  >();
  for (const kp of konuPerformanslari) {
    const ders = kp.konu.ders || 'Diğer';
    const dMevcut = dersMap.get(ders) || { toplamSoru: 0, dogru: 0, yanlis: 0 };
    dMevcut.toplamSoru += kp.toplamSoru;
    dMevcut.dogru += kp.dogruSayisi;
    dMevcut.yanlis += kp.yanlisSayisi;
    dersMap.set(ders, dMevcut);

    const kKey = `${ders}::${kp.konu.ad}`;
    const kMevcut = konuMap.get(kKey) || {
      ders,
      konu: kp.konu.ad,
      toplamSoru: 0,
      dogru: 0,
      yanlis: 0,
    };
    kMevcut.toplamSoru += kp.toplamSoru;
    kMevcut.dogru += kp.dogruSayisi;
    kMevcut.yanlis += kp.yanlisSayisi;
    konuMap.set(kKey, kMevcut);
  }

  const dersBazli = [...dersMap.entries()]
    .map(([ders, d]) => ({
      ders,
      toplamSoru: d.toplamSoru,
      basari: d.toplamSoru > 0 ? parseFloat(((d.dogru / d.toplamSoru) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.basari - a.basari);

  const zayifKonular = [...konuMap.values()]
    .filter((k) => k.toplamSoru >= 3)
    .map((k) => ({
      ders: k.ders,
      konu: k.konu,
      toplamSoru: k.toplamSoru,
      basari: parseFloat(((k.dogru / k.toplamSoru) * 100).toFixed(1)),
    }))
    .sort((a, b) => a.basari - b.basari)
    .slice(0, 15);

  const tumNetler = ogrenciSiralamasi.map((o) => o.ortalamaNet);
  const ortalamaNet =
    tumNetler.length > 0
      ? parseFloat((tumNetler.reduce((a, b) => a + b, 0) / tumNetler.length).toFixed(2))
      : 0;

  return {
    sinavBazli,
    ogrenciSiralamasi,
    sinifBazli,
    dersBazli,
    zayifKonular,
    sinifSecenekleri,
    seciliSinifId: filtre.sinifId ?? null,
    ozet: {
      ogrenciSayisi: ogrenciler.length,
      toplamKatilim: katilimlar.length,
      ortalamaNet,
    },
  };
}

export async function kocOgrenciProfilGetir(kocKullaniciId: string, ogrenciProfilId: string) {
  const ogrenci = await kocOgrenciDogrula(kocKullaniciId, ogrenciProfilId);
  return {
    id: ogrenci.id,
    ad: ogrenci.ad,
    soyad: ogrenci.soyad,
    sinif: ogrenci.sinif,
    okul: ogrenci.okul,
    ogretimTuru: ogrenci.ogretimTuru,
    hedefUniversite: ogrenci.hedefUniversite,
    hedefBolum: ogrenci.hedefBolum,
    email: ogrenci.kullanici.email,
  };
}

export async function kocOgrenciAnalizGetir(kocKullaniciId: string, ogrenciProfilId: string) {
  const ogrenci = await kocOgrenciDogrula(kocKullaniciId, ogrenciProfilId);
  const analiz = await ogrenciAnalizGetir(ogrenci.id);
  const sonAi = await prisma.aIAnaliz.findFirst({
    where: { ogrenciId: ogrenci.id },
    orderBy: { olusturuldu: 'desc' },
  });
  return { analiz, aiAnaliz: sonAi?.oneriler ?? null };
}

export async function kocOgrenciSinavlarGetir(
  kocKullaniciId: string,
  ogrenciProfilId: string,
  isKpssPlatform = false,
) {
  const ogrenci = await kocOgrenciDogrula(kocKullaniciId, ogrenciProfilId);
  return sinavListesiGetir(ogrenci.id, isKpssPlatform);
}

export async function kocOgrenciSonucGetir(
  kocKullaniciId: string,
  ogrenciProfilId: string,
  katilimId: string,
) {
  const ogrenci = await kocOgrenciDogrula(kocKullaniciId, ogrenciProfilId);

  const katilim = await prisma.sinavKatilim.findUnique({
    where: { id: katilimId },
    include: {
      sinav: { select: { id: true, baslik: true, tur: true } },
      cevaplar: { include: { soru: { include: { konu: true } } } },
    },
  });
  if (!katilim) throw new AppHatasi('Katılım bulunamadı', 404);
  if (katilim.ogrenciId !== ogrenci.id) throw new AppHatasi('Bu sonuca erişim yetkiniz yok', 403);

  return {
    katilim: {
      id: katilim.id,
      durum: katilim.durum,
      dogruSayisi: katilim.dogruSayisi,
      yanlisSayisi: katilim.yanlisSayisi,
      bosSayisi: katilim.bosSayisi,
      netPuan: katilim.netPuan,
      hamPuan: katilim.hamPuan,
      ulusalSiralama: katilim.ulusalSiralama,
      yuzdelik: katilim.yuzdelik,
      baslangicZamani: katilim.baslangicZamani,
      bitisZamani: katilim.bitisZamani,
    },
    sinav: katilim.sinav,
    cevaplar: katilim.cevaplar.map((c) => ({
      soruId: c.soruId,
      secilen: c.secilen,
      dogru: c.dogru,
      ders: c.soru.konu.ders,
      konu: c.soru.konu.ad,
      dogruCevap: c.soru.dogruCevap,
    })),
  };
}

/**
 * Koç/kurum kapsamındaki öğrencilerin bir sınavdaki sonuç listesi (admin sonuclar benzeri).
 */
export async function kocSinavKatilimlariListele(kocKullaniciId: string, sinavId: string) {
  const kapsam = await kocKapsamGetir(kocKullaniciId);

  const sinav = await prisma.sinav.findUnique({
    where: { id: sinavId },
    select: { id: true, baslik: true, tur: true, baslangicZamani: true },
  });
  if (!sinav) throw new AppHatasi('Sınav bulunamadı', 404);

  if (
    kapsam.profil.tip === KocTipi.KURUM_OGRETMENI &&
    (!kapsam.sinifIds || kapsam.sinifIds.length === 0)
  ) {
    return { sinav, katilimlar: [], toplam: 0 };
  }

  const katilimlar = await prisma.sinavKatilim.findMany({
    where: {
      sinavId,
      durum: KatilimDurumu.TAMAMLANDI,
      ogrenci: kapsam.ogrenciWhere,
    },
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
      ogrenci: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          sinif: true,
          okul: true,
          kurumSinif: { select: { id: true, ad: true } },
        },
      },
    },
  });

  return { sinav, katilimlar, toplam: katilimlar.length };
}

/** Koç/kurum: kendi öğrencisinin deneme karnesi (admin karnesi ile aynı içerik) */
export async function kocDenemeKarnesiGetir(kocKullaniciId: string, katilimId: string) {
  const katilim = await prisma.sinavKatilim.findUnique({
    where: { id: katilimId },
    select: { id: true, ogrenciId: true },
  });
  if (!katilim) throw new AppHatasi('Katılım bulunamadı', 404);
  await kocOgrenciDogrula(kocKullaniciId, katilim.ogrenciId);
  return denemeKarnesiGetir(katilimId);
}

/** Kayıt sırasında referans kodundan kocId çöz */
export async function kocIdReferansKoddan(referansKodHam?: string | null): Promise<string | null> {
  if (!referansKodHam || !String(referansKodHam).trim()) return null;
  const kod = referansKodNormalize(String(referansKodHam));
  const koc = await prisma.kocProfil.findUnique({
    where: { referansKod: kod },
    select: { id: true, aktif: true },
  });
  if (!koc?.aktif) return null;
  return koc.id;
}

// ============================================
// YÖNETİCİ — KOÇ YÖNETİMİ
// ============================================

type KocYetkiGirdisi = {
  tip?: string | null;
  kurumAdi?: string | null;
  ad?: string | null;
  soyad?: string | null;
  telefon?: string | null;
};

function kocTipiCoz(raw?: string | null): KocTipi {
  return String(raw || '').toUpperCase() === 'KURUMSAL' ? KocTipi.KURUMSAL : KocTipi.BIREYSEL;
}

/** Yönetici: koç yetkisi olan tüm hesaplar (KOC rolü + koç yetkisi verilmiş TEACHER) */
/**
 * Yönetici listesi.
 * kapsam = 'KURUM' → yalnızca kurumsal hesaplar (başvuru/onay yönetimi)
 * kapsam = 'KOC'   → bireysel koçlar ve koç yetkisi verilmiş öğretmenler
 * kapsam yoksa kurum öğretmenleri dahil hepsi döner.
 */
export async function adminKocListesi(arama?: string, durum?: string, kapsam?: string) {
  const q = (arama || '').trim();
  const tipFiltresi =
    kapsam === 'KURUM'
      ? { tip: KocTipi.KURUMSAL }
      : kapsam === 'KOC'
        ? { tip: KocTipi.BIREYSEL }
        : {};
  const durumFiltre = Object.values(KurumBasvuruDurum).includes(durum as KurumBasvuruDurum)
    ? (durum as KurumBasvuruDurum)
    : undefined;

  const koclar = await prisma.kocProfil.findMany({
    where: {
      ...tipFiltresi,
      ...(durumFiltre ? { basvuruDurum: durumFiltre } : {}),
      ...(q
      ? {
          OR: [
            { ad: { contains: q, mode: 'insensitive' } },
            { soyad: { contains: q, mode: 'insensitive' } },
            { kurumAdi: { contains: q, mode: 'insensitive' } },
            { referansKod: { contains: q.toUpperCase() } },
            { kullanici: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    },
    orderBy: [{ olusturuldu: 'desc' }],
    include: {
      kullanici: { select: { id: true, email: true, rol: true, aktif: true } },
      ustKurum: { select: { id: true, kurumAdi: true, ad: true, soyad: true } },
      _count: { select: { ogrenciler: true, ogretmenler: true } },
    },
  });

  const satislar = await prisma.satinAlim.groupBy({
    by: ['kocProfilId'],
    where: { kocProfilId: { in: koclar.map((k) => k.id) }, durum: 'TAMAMLANDI' },
    _count: { _all: true },
  });
  const satisMap = new Map(satislar.map((s) => [s.kocProfilId, s._count._all]));

  // Sekme sayaçları arama/durum filtresinden bağımsız, kapsam içinde
  const durumSayimlari = await prisma.kocProfil.groupBy({
    by: ['basvuruDurum'],
    where: tipFiltresi,
    _count: { _all: true },
  });
  const sayilar = {
    BEKLEMEDE: 0,
    AKTIF: 0,
    REDDEDILDI: 0,
    PASIF: 0,
  } as Record<string, number>;
  for (const d of durumSayimlari) sayilar[d.basvuruDurum] = d._count._all;

  return {
    koclar: koclar.map((k) => ({
      id: k.id,
      kullaniciId: k.kullaniciId,
      email: k.kullanici.email,
      rol: k.kullanici.rol,
      hesapAktif: k.kullanici.aktif,
      ad: k.ad,
      soyad: k.soyad,
      telefon: k.telefon,
      tip: k.tip,
      kurumAdi: k.kurumAdi,
      referansKod: k.referansKod,
      aktif: k.aktif,
      basvuruDurum: k.basvuruDurum,
      demoBitis: k.demoBitis?.toISOString() ?? null,
      kararTarihi: k.kararTarihi?.toISOString() ?? null,
      kararNotu: k.kararNotu,
      sehir: k.sehir,
      beklenenOgrenci: k.beklenenOgrenci,
      basvuruNotu: k.basvuruNotu,
      /** Kurum öğretmeni ise bağlı olduğu kurum */
      ustKurumId: k.ustKurumId,
      ustKurumAdi: k.ustKurum
        ? k.ustKurum.kurumAdi || [k.ustKurum.ad, k.ustKurum.soyad].filter(Boolean).join(' ')
        : null,
      kurumOgretmenSayisi: k._count.ogretmenler,
      ogrenciSayisi: k._count.ogrenciler,
      tamamlananSatis: satisMap.get(k.id) ?? 0,
      olusturuldu: k.olusturuldu.toISOString(),
    })),
    ozet: {
      toplamKoc: koclar.length,
      aktifKoc: koclar.filter((k) => k.basvuruDurum === KurumBasvuruDurum.AKTIF).length,
      bagliOgrenci: koclar.reduce((s, k) => s + k._count.ogrenciler, 0),
    },
    sayilar,
  };
}

/**
 * Yönetici: sistemdeki öğretmen hesapları — koç yetkisi olanlar işaretli döner.
 * Yetki verme ekranında tüm öğretmenlerin görünmesi için profili olanlar da listelenir.
 */
export async function adminKocAdaylari(arama?: string) {
  const q = (arama || '').trim();
  const kullanicilar = await prisma.kullanici.findMany({
    where: {
      rol: Rol.TEACHER,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { adminProfil: { ad: { contains: q, mode: 'insensitive' } } },
              { adminProfil: { soyad: { contains: q, mode: 'insensitive' } } },
              { adminProfil: { brans: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { olusturuldu: 'desc' },
    take: 200,
    select: {
      id: true,
      email: true,
      rol: true,
      aktif: true,
      olusturuldu: true,
      adminProfil: { select: { ad: true, soyad: true, brans: true, ogretimTuru: true } },
      kocProfil: { select: { id: true, aktif: true, tip: true, referansKod: true, ogrenciler: { select: { id: true } } } },
    },
  });

  return kullanicilar.map((k) => ({
    kullaniciId: k.id,
    email: k.email,
    rol: k.rol,
    hesapAktif: k.aktif,
    ad: k.adminProfil?.ad ?? '',
    soyad: k.adminProfil?.soyad ?? '',
    brans: k.adminProfil?.brans ?? null,
    ogretimTuru: k.adminProfil?.ogretimTuru ?? null,
    kayitTarihi: k.olusturuldu.toISOString(),
    /** Koç yetkisi verilmiş mi */
    kocYetkisi: Boolean(k.kocProfil),
    kocProfilId: k.kocProfil?.id ?? null,
    kocAktif: k.kocProfil?.aktif ?? false,
    referansKod: k.kocProfil?.referansKod ?? null,
    ogrenciSayisi: k.kocProfil?.ogrenciler.length ?? 0,
  }));
}

/** Yönetici: mevcut bir öğretmen / koç hesabına koç yetkisi verir (profil yoksa oluşturur, pasifse yeniden açar) */
export async function adminKocYetkiVer(kullaniciId: string, girdi: KocYetkiGirdisi = {}) {
  const ku = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: {
      id: true,
      email: true,
      rol: true,
      adminProfil: { select: { ad: true, soyad: true } },
      kocProfil: true,
    },
  });
  if (!ku) throw new AppHatasi('Kullanıcı bulunamadı', 404);
  if (ku.rol !== Rol.TEACHER && ku.rol !== Rol.KOC) {
    throw new AppHatasi('Koç yetkisi yalnızca öğretmen veya koç hesaplarına verilebilir', 400);
  }

  const tip = kocTipiCoz(girdi.tip ?? ku.kocProfil?.tip);
  const kurumAdi = (girdi.kurumAdi ?? ku.kocProfil?.kurumAdi ?? '') || null;
  if (tip === KocTipi.KURUMSAL && !kurumAdi) {
    throw new AppHatasi('Kurumsal koç için kurum adı gerekli', 400);
  }

  if (ku.kocProfil) {
    return prisma.kocProfil.update({
      where: { id: ku.kocProfil.id },
      data: {
        aktif: true,
        tip,
        kurumAdi: tip === KocTipi.KURUMSAL ? kurumAdi : null,
        ad: (girdi.ad || '').trim() || ku.kocProfil.ad,
        soyad: (girdi.soyad ?? ku.kocProfil.soyad ?? '').trim(),
        telefon: (girdi.telefon || '').trim() || ku.kocProfil.telefon,
      },
    });
  }

  const local = ku.email.split('@')[0] || 'koc';
  const ad = (girdi.ad || '').trim() || ku.adminProfil?.ad || local.charAt(0).toUpperCase() + local.slice(1);
  const soyad = (girdi.soyad || '').trim() || ku.adminProfil?.soyad || '';
  const referansKod = await benzersizReferansKodUret();

  return prisma.kocProfil.create({
    data: {
      kullaniciId: ku.id,
      ad,
      soyad,
      telefon: (girdi.telefon || '').trim() || null,
      tip,
      kurumAdi: tip === KocTipi.KURUMSAL ? kurumAdi : null,
      referansKod,
      aktif: true,
    },
  });
}

/** Yönetici: koç profilini günceller (ad, tip, kurum, aktiflik) */
export async function adminKocGuncelle(
  kocProfilId: string,
  girdi: KocYetkiGirdisi & { aktif?: boolean },
) {
  const mevcut = await prisma.kocProfil.findUnique({ where: { id: kocProfilId } });
  if (!mevcut) throw new AppHatasi('Koç profili bulunamadı', 404);

  const tip = girdi.tip === undefined ? mevcut.tip : kocTipiCoz(girdi.tip);
  const kurumAdi = (girdi.kurumAdi ?? mevcut.kurumAdi ?? '') || null;
  if (tip === KocTipi.KURUMSAL && !kurumAdi) {
    throw new AppHatasi('Kurumsal koç için kurum adı gerekli', 400);
  }

  return prisma.kocProfil.update({
    where: { id: kocProfilId },
    data: {
      ad: (girdi.ad || '').trim() || mevcut.ad,
      soyad: girdi.soyad === undefined ? mevcut.soyad : String(girdi.soyad || '').trim(),
      telefon: girdi.telefon === undefined ? mevcut.telefon : String(girdi.telefon || '').trim() || null,
      tip,
      kurumAdi: tip === KocTipi.KURUMSAL ? kurumAdi : null,
      aktif: typeof girdi.aktif === 'boolean' ? girdi.aktif : mevcut.aktif,
    },
  });
}

/** Yönetici: koç yetkisini tamamen kaldırır — bağlı öğrencilerin bağlantısı da düşer */
export async function adminKocYetkiKaldir(kocProfilId: string) {
  const mevcut = await prisma.kocProfil.findUnique({
    where: { id: kocProfilId },
    include: { _count: { select: { ogrenciler: true } } },
  });
  if (!mevcut) throw new AppHatasi('Koç profili bulunamadı', 404);

  await prisma.ogrenciProfil.updateMany({
    where: { kocId: kocProfilId },
    data: { kocId: null },
  });
  await prisma.kocProfil.delete({ where: { id: kocProfilId } });

  return { silindi: true, cozulenOgrenci: mevcut._count.ogrenciler };
}

/** Yönetici: bir koça bağlı öğrenciler */
export async function adminKocOgrencileri(kocProfilId: string) {
  const koc = await prisma.kocProfil.findUnique({
    where: { id: kocProfilId },
    include: { kullanici: { select: { email: true, rol: true } } },
  });
  if (!koc) throw new AppHatasi('Koç profili bulunamadı', 404);

  const ogrenciler = await prisma.ogrenciProfil.findMany({
    where: { kocId: kocProfilId },
    orderBy: [{ ad: 'asc' }, { soyad: 'asc' }],
    include: {
      kullanici: { select: { email: true, aktif: true } },
      _count: { select: { sinavKatilimlari: true } },
    },
  });

  return {
    koc: {
      id: koc.id,
      ad: koc.ad,
      soyad: koc.soyad,
      email: koc.kullanici.email,
      rol: koc.kullanici.rol,
      tip: koc.tip,
      kurumAdi: koc.kurumAdi,
      referansKod: koc.referansKod,
      aktif: koc.aktif,
    },
    ogrenciler: ogrenciler.map((o) => ({
      id: o.id,
      ad: o.ad,
      soyad: o.soyad,
      email: o.kullanici.email,
      hesapAktif: o.kullanici.aktif,
      sinif: o.sinif,
      okul: o.okul,
      ogretimTuru: o.ogretimTuru,
      katilimSayisi: o._count.sinavKatilimlari,
    })),
  };
}

/** Yönetici: öğrenciyi koça bağlar — başka koça bağlıysa devreder */
export async function adminKocOgrenciAta(kocProfilId: string, ogrenciEmail: string) {
  const email = (ogrenciEmail || '').trim().toLowerCase();
  if (!email) throw new AppHatasi('Öğrenci e-postası gerekli', 400);

  const koc = await prisma.kocProfil.findUnique({ where: { id: kocProfilId } });
  if (!koc) throw new AppHatasi('Koç profili bulunamadı', 404);

  const ogrenciKu = await prisma.kullanici.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { ogrenciProfil: true },
  });
  if (!ogrenciKu?.ogrenciProfil || ogrenciKu.rol !== Rol.OGRENCI) {
    throw new AppHatasi('Bu e-posta ile kayıtlı öğrenci bulunamadı', 404);
  }

  const op = ogrenciKu.ogrenciProfil;
  if (op.kocId === koc.id) {
    return { zatenBagli: true, devredildi: false, ogrenci: { id: op.id, ad: op.ad, soyad: op.soyad } };
  }
  const devredildi = Boolean(op.kocId);

  await prisma.ogrenciProfil.update({ where: { id: op.id }, data: { kocId: koc.id } });
  return { zatenBagli: false, devredildi, ogrenci: { id: op.id, ad: op.ad, soyad: op.soyad } };
}

/** Yönetici: öğrencinin koç bağlantısını kaldırır */
export async function adminKocOgrenciKaldir(kocProfilId: string, ogrenciProfilId: string) {
  const ogrenci = await prisma.ogrenciProfil.findFirst({
    where: { id: ogrenciProfilId, kocId: kocProfilId },
    select: { id: true, ad: true, soyad: true },
  });
  if (!ogrenci) throw new AppHatasi('Öğrenci bu koça bağlı değil', 404);

  await prisma.ogrenciProfil.update({ where: { id: ogrenci.id }, data: { kocId: null } });
  return { kaldirildi: true, ogrenci };
}

/** Yönetici: kurum başvurusunu onaylar — panel erişimi açılır */
export async function adminKocOnayla(kocProfilId: string, demoGun?: number | null) {
  const mevcut = await prisma.kocProfil.findUnique({
    where: { id: kocProfilId },
    include: { kullanici: { select: { id: true, email: true } } },
  });
  if (!mevcut) throw new AppHatasi('Kurum başvurusu bulunamadı', 404);

  const gun = Number(demoGun);
  const demoBitis =
    Number.isFinite(gun) && gun > 0
      ? new Date(Date.now() + Math.min(Math.round(gun), 3650) * 24 * 60 * 60 * 1000)
      : null;

  const guncel = await prisma.kocProfil.update({
    where: { id: kocProfilId },
    data: {
      basvuruDurum: KurumBasvuruDurum.AKTIF,
      aktif: true,
      kararTarihi: new Date(),
      kararNotu: null,
      demoBitis,
    },
  });

  await bildirimGonder({
    kullaniciId: mevcut.kullanici.id,
    baslik: 'Kurum hesabınız onaylandı',
    mesaj: demoBitis
      ? `Paneliniz açıldı. Demo erişiminiz ${demoBitis.toLocaleDateString('tr-TR')} tarihine kadar geçerli. Referans kodunuz: ${mevcut.referansKod}`
      : `Paneliniz açıldı. Öğretmen ve öğrencilerinizi ekleyebilirsiniz. Referans kodunuz: ${mevcut.referansKod}`,
    tur: 'kurum_onay',
  });

  return guncel;
}

/** Yönetici: kurum başvurusunu reddeder */
export async function adminKocReddet(kocProfilId: string, neden?: string) {
  const mevcut = await prisma.kocProfil.findUnique({
    where: { id: kocProfilId },
    include: { kullanici: { select: { id: true } } },
  });
  if (!mevcut) throw new AppHatasi('Kurum başvurusu bulunamadı', 404);

  const guncel = await prisma.kocProfil.update({
    where: { id: kocProfilId },
    data: {
      basvuruDurum: KurumBasvuruDurum.REDDEDILDI,
      aktif: false,
      kararTarihi: new Date(),
      kararNotu: String(neden || '').trim() || null,
    },
  });

  await bildirimGonder({
    kullaniciId: mevcut.kullanici.id,
    baslik: 'Kurum başvurunuz reddedildi',
    mesaj: guncel.kararNotu || 'Başvurunuz onaylanmadı. Detay için bizimle iletişime geçebilirsiniz.',
    tur: 'kurum_red',
  });

  return guncel;
}

/** Yönetici: kurum durumunu değiştirir (pasife alma / yeniden aktifleştirme) */
export async function adminKocDurumDegistir(
  kocProfilId: string,
  yeniDurum: string,
  not?: string,
) {
  if (!Object.values(KurumBasvuruDurum).includes(yeniDurum as KurumBasvuruDurum)) {
    throw new AppHatasi('Geçersiz durum', 400);
  }
  const mevcut = await prisma.kocProfil.findUnique({ where: { id: kocProfilId } });
  if (!mevcut) throw new AppHatasi('Kurum bulunamadı', 404);

  const durum = yeniDurum as KurumBasvuruDurum;
  return prisma.kocProfil.update({
    where: { id: kocProfilId },
    data: {
      basvuruDurum: durum,
      aktif: durum === KurumBasvuruDurum.AKTIF,
      kararTarihi: new Date(),
      kararNotu: not === undefined ? mevcut.kararNotu : String(not || '').trim() || null,
    },
  });
}

/** Yönetici: demo süresini uzatır (gun<=0 ise süresiz yapar) */
export async function adminKocDemoUzat(kocProfilId: string, gun: number) {
  const mevcut = await prisma.kocProfil.findUnique({ where: { id: kocProfilId } });
  if (!mevcut) throw new AppHatasi('Kurum bulunamadı', 404);

  const ekGun = Number(gun);
  if (!Number.isFinite(ekGun)) throw new AppHatasi('Geçersiz gün sayısı', 400);
  if (ekGun <= 0) {
    return prisma.kocProfil.update({ where: { id: kocProfilId }, data: { demoBitis: null } });
  }

  const baslangic =
    mevcut.demoBitis && mevcut.demoBitis.getTime() > Date.now() ? mevcut.demoBitis : new Date();
  const yeni = new Date(baslangic.getTime() + Math.min(Math.round(ekGun), 3650) * 24 * 60 * 60 * 1000);

  return prisma.kocProfil.update({ where: { id: kocProfilId }, data: { demoBitis: yeni } });
}

/** Yönetici: kurumun sınıf ve öğretmen özeti */
export async function adminKurumDetay(kocProfilId: string) {
  const kurum = await prisma.kocProfil.findUnique({
    where: { id: kocProfilId },
    include: {
      kullanici: { select: { email: true, rol: true, aktif: true, olusturuldu: true } },
      siniflar: {
        orderBy: { ad: 'asc' },
        include: { _count: { select: { ogrenciler: true, ogretmenler: true } } },
      },
      ogretmenler: {
        include: { kullanici: { select: { email: true, aktif: true } } },
      },
      _count: { select: { ogrenciler: true } },
    },
  });
  if (!kurum) throw new AppHatasi('Kurum bulunamadı', 404);

  return {
    kurum: {
      id: kurum.id,
      ad: kurum.ad,
      soyad: kurum.soyad,
      email: kurum.kullanici.email,
      telefon: kurum.telefon,
      tip: kurum.tip,
      kurumAdi: kurum.kurumAdi,
      sehir: kurum.sehir,
      beklenenOgrenci: kurum.beklenenOgrenci,
      basvuruNotu: kurum.basvuruNotu,
      basvuruDurum: kurum.basvuruDurum,
      demoBitis: kurum.demoBitis?.toISOString() ?? null,
      kararTarihi: kurum.kararTarihi?.toISOString() ?? null,
      kararNotu: kurum.kararNotu,
      referansKod: kurum.referansKod,
      basvuruTarihi: kurum.olusturuldu.toISOString(),
      ogrenciSayisi: kurum._count.ogrenciler,
    },
    siniflar: kurum.siniflar.map((s) => ({
      id: s.id,
      ad: s.ad,
      seviye: s.seviye,
      aktif: s.aktif,
      ogrenciSayisi: s._count.ogrenciler,
      ogretmenSayisi: s._count.ogretmenler,
    })),
    ogretmenler: kurum.ogretmenler.map((o) => ({
      id: o.id,
      ad: o.ad,
      soyad: o.soyad,
      email: o.kullanici.email,
      aktif: o.aktif && o.kullanici.aktif,
    })),
  };
}
