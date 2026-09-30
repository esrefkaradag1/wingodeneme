import { IndirimPlatformu, IndirimTipi, KomisyonDurumu, Prisma, Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { bildirimGonder } from './bildirim.service';

/** Para tutarlarını 2 haneye yuvarlar */
function tutarYuvarla(deger: number): number {
  return Math.round((deger + Number.EPSILON) * 100) / 100;
}

export function kodNormalize(ham: unknown): string {
  return String(ham || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function platformDegeri(isKpss: boolean): IndirimPlatformu {
  return isKpss ? IndirimPlatformu.KPSS : IndirimPlatformu.YKS_LGS;
}

/** İndirim tutarı — net tutar hiçbir zaman 0'ın altına inmez */
function indirimHesapla(tip: IndirimTipi, deger: number, brut: number): number {
  const ham = tip === IndirimTipi.YUZDE ? (brut * deger) / 100 : deger;
  return tutarYuvarla(Math.max(0, Math.min(ham, brut)));
}

/** Öğretmen komisyonu — net (indirim sonrası) tutar üzerinden hesaplanır */
function komisyonHesapla(tip: IndirimTipi, deger: number, net: number): number {
  if (!deger || deger <= 0) return 0;
  const ham = tip === IndirimTipi.YUZDE ? (net * deger) / 100 : deger;
  return tutarYuvarla(Math.max(0, Math.min(ham, net)));
}

export type KodDogrulamaSonucu = {
  kodId: string;
  kod: string;
  aciklama: string | null;
  ogretmenId: string | null;
  brutTutar: number;
  indirimTutari: number;
  netTutar: number;
  komisyonTutari: number;
};

/**
 * Ödeme öncesi kod doğrulama. Geçersizse anlamlı bir mesajla 400/404 fırlatır.
 * `kullaniciId` verilirse kullanıcı bazlı limit de kontrol edilir.
 */
export async function indirimKoduDogrula(girdi: {
  kod: string;
  brutTutar: number;
  kullaniciId?: string | null;
  isKpssPlatform?: boolean;
}): Promise<KodDogrulamaSonucu> {
  const kod = kodNormalize(girdi.kod);
  if (!kod) throw new AppHatasi('İndirim kodu gerekli', 400);

  const kayit = await prisma.indirimKodu.findUnique({ where: { kod } });
  if (!kayit) throw new AppHatasi('İndirim kodu bulunamadı', 404);
  if (!kayit.aktif) throw new AppHatasi('Bu indirim kodu kullanıma kapalı', 400);

  const simdi = new Date();
  if (kayit.baslangic && kayit.baslangic > simdi) {
    throw new AppHatasi('Bu indirim kodu henüz geçerli değil', 400);
  }
  if (kayit.bitis && kayit.bitis < simdi) {
    throw new AppHatasi('Bu indirim kodunun süresi dolmuş', 400);
  }
  if (kayit.maksKullanim != null && kayit.kullanimSayisi >= kayit.maksKullanim) {
    throw new AppHatasi('Bu indirim kodu kullanım limitine ulaştı', 400);
  }

  const platform = platformDegeri(girdi.isKpssPlatform === true);
  if (kayit.platform !== IndirimPlatformu.HEPSI && kayit.platform !== platform) {
    throw new AppHatasi('Bu indirim kodu bu platformda geçerli değil', 400);
  }

  const brut = tutarYuvarla(Math.max(0, girdi.brutTutar));
  if (kayit.minTutar != null && brut < kayit.minTutar) {
    throw new AppHatasi(`Bu kod en az ${kayit.minTutar} TL tutarındaki siparişlerde geçerli`, 400);
  }

  if (girdi.kullaniciId && kayit.kullaniciLimiti != null) {
    const kullanildi = await prisma.indirimKoduKullanimi.count({
      where: {
        kodId: kayit.id,
        kullaniciId: girdi.kullaniciId,
        komisyonDurumu: { not: KomisyonDurumu.IPTAL },
      },
    });
    if (kullanildi >= kayit.kullaniciLimiti) {
      throw new AppHatasi('Bu kodu daha önce kullandınız', 400);
    }
  }

  if (girdi.kullaniciId && kayit.ogretmenId === girdi.kullaniciId) {
    throw new AppHatasi('Kendi kodunuzu kullanamazsınız', 400);
  }

  const indirimTutari = indirimHesapla(kayit.indirimTipi, kayit.indirimDegeri, brut);
  const netTutar = tutarYuvarla(brut - indirimTutari);
  const komisyonTutari = kayit.ogretmenId
    ? komisyonHesapla(kayit.komisyonTipi, kayit.komisyonDegeri, netTutar)
    : 0;

  return {
    kodId: kayit.id,
    kod: kayit.kod,
    aciklama: kayit.aciklama,
    ogretmenId: kayit.ogretmenId,
    brutTutar: brut,
    indirimTutari,
    netTutar,
    komisyonTutari,
  };
}

/**
 * Sipariş oluşturulduktan sonra kullanım kaydını açar ve kod sayacını artırır.
 * Komisyon, ödeme tamamlanana kadar BEKLEMEDE durumundadır.
 */
export async function indirimKullanimiKaydet(
  satinAlimId: string,
  kullaniciId: string,
  dogrulama: KodDogrulamaSonucu,
  tx: Prisma.TransactionClient = prisma,
) {
  const kullanim = await tx.indirimKoduKullanimi.create({
    data: {
      kodId: dogrulama.kodId,
      kullaniciId,
      satinAlimId,
      ogretmenId: dogrulama.ogretmenId,
      brutTutar: dogrulama.brutTutar,
      indirimTutari: dogrulama.indirimTutari,
      netTutar: dogrulama.netTutar,
      komisyonTutari: dogrulama.komisyonTutari,
      komisyonDurumu: KomisyonDurumu.BEKLEMEDE,
    },
  });
  await tx.indirimKodu.update({
    where: { id: dogrulama.kodId },
    data: { kullanimSayisi: { increment: 1 } },
  });
  return kullanim;
}

/** Ödeme tamamlandığında komisyonu hak edilmiş sayar (her tamamlanma noktasından çağrılır) */
export async function komisyonHakedisiOnayla(satinAlimId: string): Promise<void> {
  const kullanim = await prisma.indirimKoduKullanimi.findUnique({
    where: { satinAlimId },
    include: { kod: { select: { kod: true } } },
  });
  if (!kullanim || kullanim.komisyonDurumu !== KomisyonDurumu.BEKLEMEDE) return;

  const satinAlim = await prisma.satinAlim.findUnique({
    where: { id: satinAlimId },
    select: { durum: true },
  });
  if (satinAlim?.durum !== 'TAMAMLANDI') return;

  await prisma.indirimKoduKullanimi.update({
    where: { id: kullanim.id },
    data: { komisyonDurumu: KomisyonDurumu.ONAYLANDI },
  });

  if (kullanim.ogretmenId && kullanim.komisyonTutari > 0) {
    await bildirimGonder({
      kullaniciId: kullanim.ogretmenId,
      baslik: 'Yeni komisyon kazancı',
      mesaj: `«${kullanim.kod.kod}» kodunuzla yapılan satıştan ${kullanim.komisyonTutari.toFixed(2)} TL kazandınız.`,
      tur: 'komisyon',
    });
  }
}

/** Sipariş iptal / iade edilirse komisyonu düşürür ve kod sayacını geri alır */
export async function komisyonIptalEt(satinAlimId: string): Promise<void> {
  const kullanim = await prisma.indirimKoduKullanimi.findUnique({ where: { satinAlimId } });
  if (!kullanim || kullanim.komisyonDurumu === KomisyonDurumu.IPTAL) return;
  if (kullanim.komisyonDurumu === KomisyonDurumu.ODENDI) return; // ödenmiş komisyon geri alınmaz

  await prisma.$transaction([
    prisma.indirimKoduKullanimi.update({
      where: { id: kullanim.id },
      data: { komisyonDurumu: KomisyonDurumu.IPTAL },
    }),
    prisma.indirimKodu.update({
      where: { id: kullanim.kodId },
      data: { kullanimSayisi: { decrement: 1 } },
    }),
  ]);
}

// ============================================
// ÖĞRETMEN — MUHASEBE PANELİ
// ============================================

export async function ogretmenKazancOzeti(ogretmenId: string) {
  const [kodlar, gruplar, sonKullanimlar] = await Promise.all([
    prisma.indirimKodu.findMany({
      where: { ogretmenId },
      orderBy: { olusturuldu: 'desc' },
      include: {
        _count: { select: { kullanimlar: true } },
      },
    }),
    prisma.indirimKoduKullanimi.groupBy({
      by: ['komisyonDurumu'],
      where: { ogretmenId },
      _sum: { komisyonTutari: true, netTutar: true },
      _count: { _all: true },
    }),
    prisma.indirimKoduKullanimi.findMany({
      where: { ogretmenId, komisyonDurumu: { not: KomisyonDurumu.IPTAL } },
      orderBy: { olusturuldu: 'desc' },
      take: 10,
      include: {
        kod: { select: { kod: true } },
        satinAlim: { select: { paket: { select: { ad: true } }, sinav: { select: { baslik: true } } } },
      },
    }),
  ]);

  const durumTutari = (durum: KomisyonDurumu) =>
    tutarYuvarla(gruplar.find((g) => g.komisyonDurumu === durum)?._sum.komisyonTutari ?? 0);
  const durumAdedi = (durum: KomisyonDurumu) =>
    gruplar.find((g) => g.komisyonDurumu === durum)?._count._all ?? 0;

  const onaylanan = durumTutari(KomisyonDurumu.ONAYLANDI);
  const odenen = durumTutari(KomisyonDurumu.ODENDI);
  const bekleyen = durumTutari(KomisyonDurumu.BEKLEMEDE);

  // Son 6 ayın aylık kazancı
  const altiAyOnce = new Date();
  altiAyOnce.setMonth(altiAyOnce.getMonth() - 5, 1);
  altiAyOnce.setHours(0, 0, 0, 0);

  const aylikHam = await prisma.indirimKoduKullanimi.findMany({
    where: {
      ogretmenId,
      komisyonDurumu: { in: [KomisyonDurumu.ONAYLANDI, KomisyonDurumu.ODENDI] },
      olusturuldu: { gte: altiAyOnce },
    },
    select: { olusturuldu: true, komisyonTutari: true },
  });
  const aylikMap = new Map<string, number>();
  for (const k of aylikHam) {
    const anahtar = `${k.olusturuldu.getFullYear()}-${String(k.olusturuldu.getMonth() + 1).padStart(2, '0')}`;
    aylikMap.set(anahtar, tutarYuvarla((aylikMap.get(anahtar) ?? 0) + k.komisyonTutari));
  }
  const aylik: Array<{ ay: string; tutar: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const t = new Date();
    t.setMonth(t.getMonth() - i, 1);
    const anahtar = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
    aylik.push({ ay: anahtar, tutar: aylikMap.get(anahtar) ?? 0 });
  }

  return {
    ozet: {
      toplamKazanc: tutarYuvarla(onaylanan + odenen),
      odenmisKazanc: odenen,
      odenecekKazanc: onaylanan,
      bekleyenKazanc: bekleyen,
      satisAdedi: durumAdedi(KomisyonDurumu.ONAYLANDI) + durumAdedi(KomisyonDurumu.ODENDI),
      bekleyenAdet: durumAdedi(KomisyonDurumu.BEKLEMEDE),
      ciro: tutarYuvarla(
        gruplar
          .filter((g) => g.komisyonDurumu !== KomisyonDurumu.IPTAL)
          .reduce((s, g) => s + (g._sum.netTutar ?? 0), 0),
      ),
    },
    kodlar: kodlar.map((k) => ({
      id: k.id,
      kod: k.kod,
      aciklama: k.aciklama,
      aktif: k.aktif,
      indirimTipi: k.indirimTipi,
      indirimDegeri: k.indirimDegeri,
      komisyonTipi: k.komisyonTipi,
      komisyonDegeri: k.komisyonDegeri,
      platform: k.platform,
      kullanimSayisi: k._count.kullanimlar,
      maksKullanim: k.maksKullanim,
      bitis: k.bitis?.toISOString() ?? null,
    })),
    aylik,
    sonKullanimlar: sonKullanimlar.map((k) => ({
      id: k.id,
      kod: k.kod.kod,
      urun: k.satinAlim?.paket?.ad ?? k.satinAlim?.sinav?.baslik ?? 'Sipariş',
      netTutar: k.netTutar,
      komisyonTutari: k.komisyonTutari,
      komisyonDurumu: k.komisyonDurumu,
      tarih: k.olusturuldu.toISOString(),
    })),
  };
}

export async function ogretmenKazancHareketleri(
  ogretmenId: string,
  filtre: { durum?: string; kodId?: string; limit?: number } = {},
) {
  const durum = Object.values(KomisyonDurumu).includes(filtre.durum as KomisyonDurumu)
    ? (filtre.durum as KomisyonDurumu)
    : undefined;

  const kayitlar = await prisma.indirimKoduKullanimi.findMany({
    where: {
      ogretmenId,
      ...(durum ? { komisyonDurumu: durum } : {}),
      ...(filtre.kodId ? { kodId: filtre.kodId } : {}),
    },
    orderBy: { olusturuldu: 'desc' },
    take: Math.min(filtre.limit ?? 100, 300),
    include: {
      kod: { select: { kod: true } },
      satinAlim: {
        select: {
          durum: true,
          odemeZamani: true,
          paket: { select: { ad: true } },
          sinav: { select: { baslik: true } },
        },
      },
    },
  });

  return kayitlar.map((k) => ({
    id: k.id,
    kod: k.kod.kod,
    urun: k.satinAlim?.paket?.ad ?? k.satinAlim?.sinav?.baslik ?? 'Sipariş',
    brutTutar: k.brutTutar,
    indirimTutari: k.indirimTutari,
    netTutar: k.netTutar,
    komisyonTutari: k.komisyonTutari,
    komisyonDurumu: k.komisyonDurumu,
    siparisDurumu: k.satinAlim?.durum ?? null,
    odemeTarihi: k.odemeTarihi?.toISOString() ?? null,
    tarih: k.olusturuldu.toISOString(),
  }));
}

// ============================================
// YÖNETİCİ — KOD VE KOMİSYON YÖNETİMİ
// ============================================

type KodGirdisi = {
  kod?: string;
  aciklama?: string;
  ogretmenId?: string | null;
  indirimTipi?: string;
  indirimDegeri?: number | string;
  komisyonTipi?: string;
  komisyonDegeri?: number | string;
  platform?: string;
  aktif?: boolean;
  baslangic?: string | null;
  bitis?: string | null;
  maksKullanim?: number | string | null;
  kullaniciLimiti?: number | string | null;
  minTutar?: number | string | null;
};

function tipCoz(ham: unknown, varsayilan: IndirimTipi): IndirimTipi {
  const deger = String(ham || '').toUpperCase();
  return deger === 'TUTAR' ? IndirimTipi.TUTAR : deger === 'YUZDE' ? IndirimTipi.YUZDE : varsayilan;
}

function platformCoz(ham: unknown): IndirimPlatformu {
  const deger = String(ham || '').toUpperCase();
  if (deger === 'KPSS') return IndirimPlatformu.KPSS;
  if (deger === 'YKS_LGS') return IndirimPlatformu.YKS_LGS;
  return IndirimPlatformu.HEPSI;
}

function sayiCoz(ham: unknown): number | null {
  if (ham === null || ham === undefined || ham === '') return null;
  const n = Number(ham);
  return Number.isFinite(n) ? n : null;
}

function tarihCoz(ham: unknown): Date | null {
  if (!ham) return null;
  const t = new Date(String(ham));
  return Number.isNaN(t.getTime()) ? null : t;
}

function degerDogrula(tip: IndirimTipi, deger: number, alan: string) {
  if (deger < 0) throw new AppHatasi(`${alan} negatif olamaz`, 400);
  if (tip === IndirimTipi.YUZDE && deger > 100) throw new AppHatasi(`${alan} %100'den büyük olamaz`, 400);
}

type SahipProfilSelect = {
  id: true;
  email: true;
  rol: true;
  adminProfil: { select: { ad: true; soyad: true; brans: true } };
  kocProfil: { select: { ad: true; soyad: true; tip: true } };
};

const sahipProfilSelect = {
  id: true,
  email: true,
  rol: true,
  adminProfil: { select: { ad: true, soyad: true, brans: true } },
  kocProfil: { select: { ad: true, soyad: true, tip: true } },
} satisfies SahipProfilSelect;

function sahipAdSoyad(ogretmen: {
  email: string;
  adminProfil?: { ad: string; soyad: string; brans?: string | null } | null;
  kocProfil?: { ad: string; soyad: string } | null;
}): { ad: string; soyad: string; brans: string | null } {
  const ad = ogretmen.adminProfil?.ad || ogretmen.kocProfil?.ad || '';
  const soyad = ogretmen.adminProfil?.soyad || ogretmen.kocProfil?.soyad || '';
  return { ad, soyad, brans: ogretmen.adminProfil?.brans ?? null };
}

export async function adminIndirimKoduListesi(filtre: { q?: string; aktif?: string; ogretmenId?: string } = {}) {
  const q = (filtre.q || '').trim();
  const kodlar = await prisma.indirimKodu.findMany({
    where: {
      ...(filtre.aktif === 'true' ? { aktif: true } : filtre.aktif === 'false' ? { aktif: false } : {}),
      ...(filtre.ogretmenId ? { ogretmenId: filtre.ogretmenId } : {}),
      ...(q
        ? {
            OR: [
              { kod: { contains: q.toUpperCase() } },
              { aciklama: { contains: q, mode: 'insensitive' } },
              { ogretmen: { email: { contains: q, mode: 'insensitive' } } },
              { ogretmen: { adminProfil: { ad: { contains: q, mode: 'insensitive' } } } },
              { ogretmen: { adminProfil: { soyad: { contains: q, mode: 'insensitive' } } } },
              { ogretmen: { kocProfil: { ad: { contains: q, mode: 'insensitive' } } } },
              { ogretmen: { kocProfil: { soyad: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    },
    orderBy: { olusturuldu: 'desc' },
    include: {
      ogretmen: { select: sahipProfilSelect },
      _count: { select: { kullanimlar: true } },
    },
  });

  const kodIds = kodlar.map((k) => k.id);
  const kazanclar = kodIds.length
    ? await prisma.indirimKoduKullanimi.groupBy({
        by: ['kodId'],
        where: { kodId: { in: kodIds }, komisyonDurumu: { not: KomisyonDurumu.IPTAL } },
        _sum: { komisyonTutari: true, netTutar: true },
      })
    : [];
  const kazancMap = new Map(kazanclar.map((k) => [k.kodId, k._sum]));

  return kodlar.map((k) => {
    const sahip = k.ogretmen ? sahipAdSoyad(k.ogretmen) : null;
    return {
      id: k.id,
      kod: k.kod,
      aciklama: k.aciklama,
      aktif: k.aktif,
      indirimTipi: k.indirimTipi,
      indirimDegeri: k.indirimDegeri,
      komisyonTipi: k.komisyonTipi,
      komisyonDegeri: k.komisyonDegeri,
      platform: k.platform,
      baslangic: k.baslangic?.toISOString() ?? null,
      bitis: k.bitis?.toISOString() ?? null,
      maksKullanim: k.maksKullanim,
      kullaniciLimiti: k.kullaniciLimiti,
      minTutar: k.minTutar,
      kullanimSayisi: k._count.kullanimlar,
      olusturuldu: k.olusturuldu.toISOString(),
      ogretmen: k.ogretmen
        ? {
            id: k.ogretmen.id,
            email: k.ogretmen.email,
            rol: k.ogretmen.rol,
            ad: sahip!.ad,
            soyad: sahip!.soyad,
            brans: sahip!.brans,
          }
        : null,
      toplamCiro: tutarYuvarla(kazancMap.get(k.id)?.netTutar ?? 0),
      toplamKomisyon: tutarYuvarla(kazancMap.get(k.id)?.komisyonTutari ?? 0),
    };
  });
}

async function ogretmenDogrula(ogretmenId?: string | null): Promise<string | null> {
  if (!ogretmenId) return null;
  const ku = await prisma.kullanici.findUnique({
    where: { id: ogretmenId },
    select: { id: true, rol: true },
  });
  if (!ku) throw new AppHatasi('Komisyon sahibi bulunamadı', 404);
  const izinliRoller: Rol[] = [Rol.TEACHER, Rol.KOC, Rol.ADMIN, Rol.SUPER_ADMIN];
  if (!izinliRoller.includes(ku.rol)) {
    throw new AppHatasi('Komisyon yalnızca öğretmen veya koç hesaplarına tanımlanabilir', 400);
  }
  return ku.id;
}

/** Yönetici formu: öğretmen + koç hesapları */
export async function komisyonSahibiAdaylari(arama?: string) {
  const q = (arama || '').trim();
  const kullanicilar = await prisma.kullanici.findMany({
    where: {
      rol: { in: [Rol.TEACHER, Rol.KOC] },
      aktif: true,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { adminProfil: { ad: { contains: q, mode: 'insensitive' } } },
              { adminProfil: { soyad: { contains: q, mode: 'insensitive' } } },
              { adminProfil: { brans: { contains: q, mode: 'insensitive' } } },
              { kocProfil: { ad: { contains: q, mode: 'insensitive' } } },
              { kocProfil: { soyad: { contains: q, mode: 'insensitive' } } },
              { kocProfil: { kurumAdi: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { olusturuldu: 'desc' },
    take: 300,
    select: sahipProfilSelect,
  });

  return kullanicilar.map((k) => {
    const adSoyad = sahipAdSoyad(k);
    return {
      kullaniciId: k.id,
      email: k.email,
      rol: k.rol,
      ad: adSoyad.ad,
      soyad: adSoyad.soyad,
      brans: adSoyad.brans,
      tipEtiket: k.rol === Rol.KOC ? 'Koç' : 'Öğretmen',
    };
  });
}

const KOC_MAX_INDIRIM_YUZDE = 50;
const KOC_MAX_KOMISYON_YUZDE = 30;

/** Koç paneli: kendi hesabıyla kod oluşturabilmek için erişim doğrula */
async function kocIndirimErisimDogrula(kullaniciId: string) {
  const { kocProfilGetirVeyaOlustur } = await import('./koc.service');
  await kocProfilGetirVeyaOlustur(kullaniciId);
}

function kocIndirimLimitDogrula(indirimTipi: IndirimTipi, indirimDegeri: number, komisyonTipi: IndirimTipi, komisyonDegeri: number) {
  if (indirimTipi === IndirimTipi.YUZDE && indirimDegeri > KOC_MAX_INDIRIM_YUZDE) {
    throw new AppHatasi(`Koç indirim oranı en fazla %${KOC_MAX_INDIRIM_YUZDE} olabilir`, 400);
  }
  if (komisyonTipi === IndirimTipi.YUZDE && komisyonDegeri > KOC_MAX_KOMISYON_YUZDE) {
    throw new AppHatasi(`Koç komisyon oranı en fazla %${KOC_MAX_KOMISYON_YUZDE} olabilir`, 400);
  }
}

export async function kocIndirimKoduListesi(kullaniciId: string) {
  await kocIndirimErisimDogrula(kullaniciId);
  return adminIndirimKoduListesi({ ogretmenId: kullaniciId });
}

export async function kocIndirimKoduOlustur(kullaniciId: string, girdi: KodGirdisi) {
  await kocIndirimErisimDogrula(kullaniciId);
  const indirimTipi = tipCoz(girdi.indirimTipi, IndirimTipi.YUZDE);
  const indirimDegeri = sayiCoz(girdi.indirimDegeri) ?? 0;
  const komisyonTipi = tipCoz(girdi.komisyonTipi, IndirimTipi.YUZDE);
  // Varsayılan: net tutarın %10'u koça komisyon
  const komisyonDegeri = sayiCoz(girdi.komisyonDegeri) ?? 10;
  kocIndirimLimitDogrula(indirimTipi, indirimDegeri, komisyonTipi, komisyonDegeri);

  return adminIndirimKoduOlustur({
    ...girdi,
    ogretmenId: kullaniciId,
    indirimTipi,
    indirimDegeri,
    komisyonTipi,
    komisyonDegeri,
  });
}

export async function kocIndirimKoduGuncelle(kullaniciId: string, id: string, girdi: KodGirdisi) {
  await kocIndirimErisimDogrula(kullaniciId);
  const mevcut = await prisma.indirimKodu.findUnique({ where: { id } });
  if (!mevcut) throw new AppHatasi('İndirim kodu bulunamadı', 404);
  if (mevcut.ogretmenId !== kullaniciId) throw new AppHatasi('Bu kod size ait değil', 403);

  const indirimTipi = girdi.indirimTipi === undefined ? mevcut.indirimTipi : tipCoz(girdi.indirimTipi, mevcut.indirimTipi);
  const indirimDegeri = girdi.indirimDegeri === undefined ? mevcut.indirimDegeri : sayiCoz(girdi.indirimDegeri) ?? 0;
  const komisyonTipi = girdi.komisyonTipi === undefined ? mevcut.komisyonTipi : tipCoz(girdi.komisyonTipi, mevcut.komisyonTipi);
  const komisyonDegeri = girdi.komisyonDegeri === undefined ? mevcut.komisyonDegeri : sayiCoz(girdi.komisyonDegeri) ?? 0;
  kocIndirimLimitDogrula(indirimTipi, indirimDegeri, komisyonTipi, komisyonDegeri);

  return adminIndirimKoduGuncelle(id, {
    ...girdi,
    ogretmenId: kullaniciId,
  });
}

export async function kocIndirimKoduSil(kullaniciId: string, id: string) {
  await kocIndirimErisimDogrula(kullaniciId);
  const mevcut = await prisma.indirimKodu.findUnique({ where: { id }, select: { id: true, ogretmenId: true } });
  if (!mevcut) throw new AppHatasi('İndirim kodu bulunamadı', 404);
  if (mevcut.ogretmenId !== kullaniciId) throw new AppHatasi('Bu kod size ait değil', 403);
  return adminIndirimKoduSil(id);
}

export async function kocKazancOzeti(kullaniciId: string) {
  await kocIndirimErisimDogrula(kullaniciId);
  return ogretmenKazancOzeti(kullaniciId);
}

export async function kocKazancHareketleri(
  kullaniciId: string,
  filtre: { durum?: string; kodId?: string; limit?: number } = {},
) {
  await kocIndirimErisimDogrula(kullaniciId);
  return ogretmenKazancHareketleri(kullaniciId, filtre);
}

export async function adminIndirimKoduOlustur(girdi: KodGirdisi) {
  const kod = kodNormalize(girdi.kod);
  if (!kod || kod.length < 3) throw new AppHatasi('Kod en az 3 karakter olmalı', 400);
  if (!/^[A-Z0-9._-]+$/.test(kod)) throw new AppHatasi('Kod yalnızca harf, rakam ve - _ . içerebilir', 400);

  const mevcut = await prisma.indirimKodu.findUnique({ where: { kod } });
  if (mevcut) throw new AppHatasi('Bu kod zaten tanımlı', 409);

  const indirimTipi = tipCoz(girdi.indirimTipi, IndirimTipi.YUZDE);
  const indirimDegeri = sayiCoz(girdi.indirimDegeri) ?? 0;
  if (indirimDegeri <= 0) throw new AppHatasi('İndirim değeri sıfırdan büyük olmalı', 400);
  degerDogrula(indirimTipi, indirimDegeri, 'İndirim değeri');

  const komisyonTipi = tipCoz(girdi.komisyonTipi, IndirimTipi.YUZDE);
  const komisyonDegeri = sayiCoz(girdi.komisyonDegeri) ?? 0;
  degerDogrula(komisyonTipi, komisyonDegeri, 'Komisyon değeri');

  const ogretmenId = await ogretmenDogrula(girdi.ogretmenId);
  if (komisyonDegeri > 0 && !ogretmenId) {
    throw new AppHatasi('Komisyon tanımlamak için öğretmen veya koç seçilmeli', 400);
  }

  return prisma.indirimKodu.create({
    data: {
      kod,
      aciklama: String(girdi.aciklama || '').trim() || null,
      ogretmenId,
      indirimTipi,
      indirimDegeri,
      komisyonTipi,
      komisyonDegeri,
      platform: platformCoz(girdi.platform),
      aktif: girdi.aktif !== false,
      baslangic: tarihCoz(girdi.baslangic),
      bitis: tarihCoz(girdi.bitis),
      maksKullanim: sayiCoz(girdi.maksKullanim),
      kullaniciLimiti: sayiCoz(girdi.kullaniciLimiti),
      minTutar: sayiCoz(girdi.minTutar),
    },
  });
}

export async function adminIndirimKoduGuncelle(id: string, girdi: KodGirdisi) {
  const mevcut = await prisma.indirimKodu.findUnique({ where: { id } });
  if (!mevcut) throw new AppHatasi('İndirim kodu bulunamadı', 404);

  const indirimTipi = girdi.indirimTipi === undefined ? mevcut.indirimTipi : tipCoz(girdi.indirimTipi, mevcut.indirimTipi);
  const indirimDegeri = girdi.indirimDegeri === undefined ? mevcut.indirimDegeri : sayiCoz(girdi.indirimDegeri) ?? 0;
  degerDogrula(indirimTipi, indirimDegeri, 'İndirim değeri');

  const komisyonTipi = girdi.komisyonTipi === undefined ? mevcut.komisyonTipi : tipCoz(girdi.komisyonTipi, mevcut.komisyonTipi);
  const komisyonDegeri = girdi.komisyonDegeri === undefined ? mevcut.komisyonDegeri : sayiCoz(girdi.komisyonDegeri) ?? 0;
  degerDogrula(komisyonTipi, komisyonDegeri, 'Komisyon değeri');

  const ogretmenId =
    girdi.ogretmenId === undefined ? mevcut.ogretmenId : await ogretmenDogrula(girdi.ogretmenId);
  if (komisyonDegeri > 0 && !ogretmenId) {
    throw new AppHatasi('Komisyon tanımlamak için öğretmen veya koç seçilmeli', 400);
  }

  return prisma.indirimKodu.update({
    where: { id },
    data: {
      aciklama: girdi.aciklama === undefined ? mevcut.aciklama : String(girdi.aciklama || '').trim() || null,
      ogretmenId,
      indirimTipi,
      indirimDegeri,
      komisyonTipi,
      komisyonDegeri,
      platform: girdi.platform === undefined ? mevcut.platform : platformCoz(girdi.platform),
      aktif: typeof girdi.aktif === 'boolean' ? girdi.aktif : mevcut.aktif,
      baslangic: girdi.baslangic === undefined ? mevcut.baslangic : tarihCoz(girdi.baslangic),
      bitis: girdi.bitis === undefined ? mevcut.bitis : tarihCoz(girdi.bitis),
      maksKullanim: girdi.maksKullanim === undefined ? mevcut.maksKullanim : sayiCoz(girdi.maksKullanim),
      kullaniciLimiti: girdi.kullaniciLimiti === undefined ? mevcut.kullaniciLimiti : sayiCoz(girdi.kullaniciLimiti),
      minTutar: girdi.minTutar === undefined ? mevcut.minTutar : sayiCoz(girdi.minTutar),
    },
  });
}

export async function adminIndirimKoduSil(id: string) {
  const kullanim = await prisma.indirimKoduKullanimi.count({ where: { kodId: id } });
  if (kullanim > 0) {
    // Kullanılmış kodlar geçmiş kayıtlar için silinmez, pasife alınır
    await prisma.indirimKodu.update({ where: { id }, data: { aktif: false } });
    return { silindi: false, pasifeAlindi: true, kullanim };
  }
  await prisma.indirimKodu.delete({ where: { id } });
  return { silindi: true, pasifeAlindi: false, kullanim: 0 };
}

export async function adminKomisyonListesi(filtre: { durum?: string; ogretmenId?: string; limit?: number } = {}) {
  const durum = Object.values(KomisyonDurumu).includes(filtre.durum as KomisyonDurumu)
    ? (filtre.durum as KomisyonDurumu)
    : undefined;

  const [kayitlar, gruplar] = await Promise.all([
    prisma.indirimKoduKullanimi.findMany({
      where: {
        ...(durum ? { komisyonDurumu: durum } : {}),
        ...(filtre.ogretmenId ? { ogretmenId: filtre.ogretmenId } : {}),
      },
      orderBy: { olusturuldu: 'desc' },
      take: Math.min(filtre.limit ?? 200, 500),
      include: {
        kod: { select: { kod: true } },
        ogretmen: {
          select: {
            id: true,
            email: true,
            adminProfil: { select: { ad: true, soyad: true } },
            kocProfil: { select: { ad: true, soyad: true } },
          },
        },
        kullanici: { select: { email: true, ogrenciProfil: { select: { ad: true, soyad: true } } } },
        satinAlim: { select: { durum: true, paket: { select: { ad: true } }, sinav: { select: { baslik: true } } } },
      },
    }),
    prisma.indirimKoduKullanimi.groupBy({
      by: ['komisyonDurumu'],
      _sum: { komisyonTutari: true },
      _count: { _all: true },
    }),
  ]);

  const ozet: Record<string, { tutar: number; adet: number }> = {};
  for (const d of Object.values(KomisyonDurumu)) ozet[d] = { tutar: 0, adet: 0 };
  for (const g of gruplar) {
    ozet[g.komisyonDurumu] = {
      tutar: tutarYuvarla(g._sum.komisyonTutari ?? 0),
      adet: g._count._all,
    };
  }

  return {
    ozet,
    kayitlar: kayitlar.map((k) => {
      const sahip = k.ogretmen ? sahipAdSoyad(k.ogretmen) : null;
      return {
      id: k.id,
      kod: k.kod.kod,
      ogretmen: k.ogretmen
        ? {
            id: k.ogretmen.id,
            email: k.ogretmen.email,
            ad: [sahip?.ad, sahip?.soyad].filter(Boolean).join(' '),
          }
        : null,
      ogrenci: {
        email: k.kullanici.email,
        ad: [k.kullanici.ogrenciProfil?.ad, k.kullanici.ogrenciProfil?.soyad].filter(Boolean).join(' '),
      },
      urun: k.satinAlim?.paket?.ad ?? k.satinAlim?.sinav?.baslik ?? 'Sipariş',
      brutTutar: k.brutTutar,
      indirimTutari: k.indirimTutari,
      netTutar: k.netTutar,
      komisyonTutari: k.komisyonTutari,
      komisyonDurumu: k.komisyonDurumu,
      siparisDurumu: k.satinAlim?.durum ?? null,
      odemeTarihi: k.odemeTarihi?.toISOString() ?? null,
      tarih: k.olusturuldu.toISOString(),
    };
    }),
  };
}

/** Yönetici: seçilen komisyonları ödendi olarak işaretler */
export async function adminKomisyonOde(kullanimIds: string[], not?: string) {
  const idler = [...new Set((kullanimIds || []).filter(Boolean))];
  if (!idler.length) throw new AppHatasi('Ödenecek kayıt seçilmedi', 400);

  const kayitlar = await prisma.indirimKoduKullanimi.findMany({
    where: { id: { in: idler }, komisyonDurumu: KomisyonDurumu.ONAYLANDI },
    select: { id: true, ogretmenId: true, komisyonTutari: true },
  });
  if (!kayitlar.length) throw new AppHatasi('Ödenecek onaylı komisyon bulunamadı', 400);

  await prisma.indirimKoduKullanimi.updateMany({
    where: { id: { in: kayitlar.map((k) => k.id) } },
    data: {
      komisyonDurumu: KomisyonDurumu.ODENDI,
      odemeTarihi: new Date(),
      odemeNotu: String(not || '').trim() || null,
    },
  });

  // Öğretmen bazında bildirim
  const ogretmenToplam = new Map<string, number>();
  for (const k of kayitlar) {
    if (!k.ogretmenId) continue;
    ogretmenToplam.set(k.ogretmenId, tutarYuvarla((ogretmenToplam.get(k.ogretmenId) ?? 0) + k.komisyonTutari));
  }
  for (const [ogretmenId, tutar] of ogretmenToplam) {
    await bildirimGonder({
      kullaniciId: ogretmenId,
      baslik: 'Komisyon ödemeniz yapıldı',
      mesaj: `${tutar.toFixed(2)} TL tutarındaki komisyon ödemeniz gerçekleştirildi.`,
      tur: 'komisyon_odeme',
    });
  }

  return { odenen: kayitlar.length, toplamTutar: tutarYuvarla(kayitlar.reduce((s, k) => s + k.komisyonTutari, 0)) };
}
