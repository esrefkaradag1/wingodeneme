import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { KocTipi, KurumBasvuruDurum, OgretimTuru, Prisma, Rol, SoruYazariBasvuruDurum } from '@prisma/client';
import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { bildirimGonder } from './bildirim.service';
import { adminIndirimKoduOlustur } from './indirimKodu.service';
import { benzersizReferansKodUret } from './koc.service';
import {
  KPSS_BRANSLARI,
  LGS_BRANSLARI,
  YKS_BRANSLARI,
  branslarBirlestir,
  ogretmenBransKayitNormalize,
} from './ogretmenSinirlama';

/** Kademe etiketleri — başvuru formunda ve panelde aynı sırayla gösterilir */
const KADEME_SIRASI = [
  'YKS',
  'SINIF_11',
  'SINIF_10',
  'SINIF_9',
  'LGS',
  'SINIF_7',
  'SINIF_6',
  'KPSS_LISANS',
  'KPSS_ONLISANS',
  'KPSS_ORTAOGRETIM',
];

export const KADEME_ETIKETLERI: Record<string, string> = {
  YKS: 'YKS (12 / mezun)',
  SINIF_11: '11. Sınıf',
  SINIF_10: '10. Sınıf',
  SINIF_9: '9. Sınıf',
  LGS: 'LGS (8. Sınıf)',
  SINIF_7: '7. Sınıf',
  SINIF_6: '6. Sınıf',
  KPSS_LISANS: 'KPSS Lisans',
  KPSS_ONLISANS: 'KPSS Ön Lisans',
  KPSS_ORTAOGRETIM: 'KPSS Ortaöğretim',
};

/** Form için kademe → branş listesi (konu ağacındaki gerçek dersler) */
export async function basvuruBranslariGetir() {
  const dersler = await prisma.konu.findMany({
    select: { ogretimTuru: true, ders: true },
    distinct: ['ogretimTuru', 'ders'],
    orderBy: [{ ogretimTuru: 'asc' }, { ders: 'asc' }],
  });

  const harita = new Map<string, string[]>();
  for (const d of dersler) {
    const liste = harita.get(d.ogretimTuru) ?? [];
    if (!liste.includes(d.ders)) liste.push(d.ders);
    harita.set(d.ogretimTuru, liste);
  }

  return KADEME_SIRASI.filter((k) => harita.has(k)).map((kademe) => ({
    kademe,
    etiket: KADEME_ETIKETLERI[kademe] ?? kademe,
    branslar: (harita.get(kademe) ?? []).sort((a, b) => a.localeCompare(b, 'tr')),
  }));
}

type BasvuruGirdisi = {
  ad?: unknown;
  soyad?: unknown;
  dogumTarihi?: unknown;
  email?: unknown;
  telefon?: unknown;
  universite?: unknown;
  fakulte?: unknown;
  bolum?: unknown;
  mezuniyetYili?: unknown;
  deneyimYili?: unknown;
  branslar?: unknown;
  soruBasinaUcret?: unknown;
  aylikSoruKapasitesi?: unknown;
  ornekCalismaUrl?: unknown;
  aciklama?: unknown;
  ipAdresi?: string | null;
};

function metin(deger: unknown, alan: string, zorunlu = true, minUzunluk = 2): string {
  const v = String(deger ?? '').trim();
  if (!v) {
    if (zorunlu) throw new AppHatasi(`${alan} zorunludur`, 400);
    return '';
  }
  if (v.length < minUzunluk) throw new AppHatasi(`${alan} en az ${minUzunluk} karakter olmalı`, 400);
  return v;
}

function sayi(deger: unknown): number | null {
  if (deger === undefined || deger === null || deger === '') return null;
  const n = Number(deger);
  return Number.isFinite(n) ? n : null;
}

function telefonNormalize(deger: unknown): string {
  const rakamlar = String(deger ?? '').replace(/\D/g, '');
  const temiz = rakamlar.startsWith('90') && rakamlar.length === 12 ? rakamlar.slice(2) : rakamlar;
  const son = temiz.startsWith('0') ? temiz.slice(1) : temiz;
  if (son.length !== 10 || !son.startsWith('5')) {
    throw new AppHatasi('Geçerli bir cep telefonu girin (5XX XXX XX XX)', 400);
  }
  return `0${son}`;
}

/** { "YKS": ["Matematik"], ... } — en az bir branş seçilmiş olmalı */
function branslariDogrula(ham: unknown): Record<string, string[]> {
  if (!ham || typeof ham !== 'object' || Array.isArray(ham)) {
    throw new AppHatasi('En az bir branş seçmelisiniz', 400);
  }
  const temiz: Record<string, string[]> = {};
  let toplam = 0;
  for (const [kademe, liste] of Object.entries(ham as Record<string, unknown>)) {
    if (!Array.isArray(liste)) continue;
    const branslar = [...new Set(liste.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))]
      .map((x) => x.trim())
      .slice(0, 40);
    if (branslar.length) {
      temiz[kademe] = branslar;
      toplam += branslar.length;
    }
  }
  if (toplam === 0) throw new AppHatasi('En az bir branş seçmelisiniz', 400);
  return temiz;
}

export async function soruYazariBasvurusuOlustur(girdi: BasvuruGirdisi) {
  const ad = metin(girdi.ad, 'Ad');
  const soyad = metin(girdi.soyad, 'Soyad');
  const email = metin(girdi.email, 'E-posta').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppHatasi('Geçerli bir e-posta adresi girin', 400);
  }
  const telefon = telefonNormalize(girdi.telefon);
  const universite = metin(girdi.universite, 'Mezun olduğunuz üniversite');
  const branslar = branslariDogrula(girdi.branslar);

  const ucret = sayi(girdi.soruBasinaUcret);
  if (ucret === null || ucret <= 0) {
    throw new AppHatasi('Soru başına ücret talebinizi girin', 400);
  }
  if (ucret > 10000) throw new AppHatasi('Soru başına ücret çok yüksek görünüyor', 400);

  let dogumTarihi: Date | null = null;
  if (girdi.dogumTarihi) {
    const t = new Date(String(girdi.dogumTarihi));
    if (Number.isNaN(t.getTime())) throw new AppHatasi('Geçerli bir doğum tarihi girin', 400);
    const yas = (Date.now() - t.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (yas < 18 || yas > 90) throw new AppHatasi('Doğum tarihi geçerli aralıkta olmalı', 400);
    dogumTarihi = t;
  }

  // Aynı e-postadan bekleyen başvuru varsa tekrar açma
  const bekleyen = await prisma.soruYazariBasvurusu.findFirst({
    where: { email, durum: { in: [SoruYazariBasvuruDurum.YENI, SoruYazariBasvuruDurum.INCELENIYOR] } },
    select: { id: true },
  });
  if (bekleyen) {
    throw new AppHatasi('Bu e-posta ile değerlendirme aşamasında bir başvurunuz zaten var', 409);
  }

  const basvuru = await prisma.soruYazariBasvurusu.create({
    data: {
      ad,
      soyad,
      dogumTarihi,
      email,
      telefon,
      universite,
      fakulte: metin(girdi.fakulte, 'Fakülte', false) || null,
      bolum: metin(girdi.bolum, 'Bölüm', false) || null,
      mezuniyetYili: sayi(girdi.mezuniyetYili),
      deneyimYili: sayi(girdi.deneyimYili),
      branslar: branslar as Prisma.InputJsonValue,
      soruBasinaUcret: Math.round(ucret * 100) / 100,
      aylikSoruKapasitesi: sayi(girdi.aylikSoruKapasitesi),
      ornekCalismaUrl: metin(girdi.ornekCalismaUrl, 'Örnek çalışma', false, 5) || null,
      aciklama: metin(girdi.aciklama, 'Açıklama', false) || null,
      ipAdresi: girdi.ipAdresi ?? null,
    },
  });

  // Yöneticilere bildirim
  const yoneticiler = await prisma.kullanici.findMany({
    where: { rol: { in: [Rol.ADMIN, Rol.SUPER_ADMIN] }, aktif: true },
    select: { id: true },
  });
  const bransOzeti = Object.values(branslar).flat().slice(0, 4).join(', ');
  await Promise.all(
    yoneticiler.map((y) =>
      bildirimGonder({
        kullaniciId: y.id,
        baslik: 'Yeni soru yazarı başvurusu',
        mesaj: `${ad} ${soyad} — ${bransOzeti} · soru başına ${basvuru.soruBasinaUcret} TL talep ediyor.`,
        tur: 'soru_yazari_basvuru',
        veriJson: { basvuruId: basvuru.id },
      }).catch(() => undefined),
    ),
  );

  return { id: basvuru.id, ad, soyad, email };
}

// ============================================
// YÖNETİCİ
// ============================================

function basvuruCiktisi(b: {
  id: string;
  ad: string;
  soyad: string;
  dogumTarihi: Date | null;
  email: string;
  telefon: string;
  universite: string;
  fakulte: string | null;
  bolum: string | null;
  mezuniyetYili: number | null;
  deneyimYili: number | null;
  branslar: Prisma.JsonValue;
  soruBasinaUcret: number;
  aylikSoruKapasitesi: number | null;
  ornekCalismaUrl: string | null;
  aciklama: string | null;
  durum: SoruYazariBasvuruDurum;
  adminNotu: string | null;
  kararTarihi: Date | null;
  olusturuldu: Date;
  kullanici?: {
    id: string;
    rol: Rol;
    email: string;
    kocProfil: { referansKod: string } | null;
    indirimKodlari: Array<{
      id: string;
      kod: string;
      indirimTipi: string;
      indirimDegeri: number;
      komisyonTipi: string;
      komisyonDegeri: number;
      aktif: boolean;
    }>;
  } | null;
}) {
  const branslar = (b.branslar as Record<string, string[]> | null) ?? {};
  return {
    id: b.id,
    ad: b.ad,
    soyad: b.soyad,
    dogumTarihi: b.dogumTarihi?.toISOString() ?? null,
    email: b.email,
    telefon: b.telefon,
    universite: b.universite,
    fakulte: b.fakulte,
    bolum: b.bolum,
    mezuniyetYili: b.mezuniyetYili,
    deneyimYili: b.deneyimYili,
    branslar: Object.entries(branslar).map(([kademe, liste]) => ({
      kademe,
      etiket: KADEME_ETIKETLERI[kademe] ?? kademe,
      branslar: liste,
    })),
    bransSayisi: Object.values(branslar).flat().length,
    soruBasinaUcret: b.soruBasinaUcret,
    aylikSoruKapasitesi: b.aylikSoruKapasitesi,
    aylikTahminiTutar:
      b.aylikSoruKapasitesi && b.aylikSoruKapasitesi > 0
        ? Math.round(b.aylikSoruKapasitesi * b.soruBasinaUcret * 100) / 100
        : null,
    ornekCalismaUrl: b.ornekCalismaUrl,
    aciklama: b.aciklama,
    durum: b.durum,
    adminNotu: b.adminNotu,
    kararTarihi: b.kararTarihi?.toISOString() ?? null,
    olusturuldu: b.olusturuldu.toISOString(),
    hesap: b.kullanici
      ? {
          kullaniciId: b.kullanici.id,
          rol: b.kullanici.rol,
          rolEtiket: b.kullanici.rol === Rol.KOC ? 'Koç' : 'Öğretmen',
          email: b.kullanici.email,
          referansKod: b.kullanici.kocProfil?.referansKod ?? null,
          indirimKodlari: b.kullanici.indirimKodlari.map((k) => ({
            id: k.id,
            kod: k.kod,
            indirimTipi: k.indirimTipi,
            indirimDegeri: k.indirimDegeri,
            komisyonTipi: k.komisyonTipi,
            komisyonDegeri: k.komisyonDegeri,
            aktif: k.aktif,
          })),
        }
      : null,
  };
}

const basvuruKullaniciSelect = {
  id: true,
  rol: true,
  email: true,
  kocProfil: { select: { referansKod: true } },
  indirimKodlari: {
    orderBy: { olusturuldu: 'desc' as const },
    take: 5,
    select: {
      id: true,
      kod: true,
      indirimTipi: true,
      indirimDegeri: true,
      komisyonTipi: true,
      komisyonDegeri: true,
      aktif: true,
    },
  },
};

export async function adminBasvuruListesi(filtre: { durum?: string; q?: string; brans?: string } = {}) {
  const durum = Object.values(SoruYazariBasvuruDurum).includes(filtre.durum as SoruYazariBasvuruDurum)
    ? (filtre.durum as SoruYazariBasvuruDurum)
    : undefined;
  const q = (filtre.q || '').trim();

  const [kayitlar, sayimlar] = await Promise.all([
    prisma.soruYazariBasvurusu.findMany({
      where: {
        ...(durum ? { durum } : {}),
        ...(q
          ? {
              OR: [
                { ad: { contains: q, mode: 'insensitive' } },
                { soyad: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { universite: { contains: q, mode: 'insensitive' } },
                { bolum: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { olusturuldu: 'desc' },
      take: 300,
      include: { kullanici: { select: basvuruKullaniciSelect } },
    }),
    prisma.soruYazariBasvurusu.groupBy({ by: ['durum'], _count: { _all: true } }),
  ]);

  const sayilar: Record<string, number> = {};
  for (const d of Object.values(SoruYazariBasvuruDurum)) sayilar[d] = 0;
  for (const s of sayimlar) sayilar[s.durum] = s._count._all;

  const listelenen = kayitlar.map(basvuruCiktisi);
  const bransFiltreli = filtre.brans
    ? listelenen.filter((b) => b.branslar.some((g) => g.branslar.includes(filtre.brans!)))
    : listelenen;

  const ucretler = bransFiltreli.map((b) => b.soruBasinaUcret);
  return {
    basvurular: bransFiltreli,
    sayilar,
    ozet: {
      toplam: bransFiltreli.length,
      ortalamaUcret: ucretler.length
        ? Math.round((ucretler.reduce((a, b) => a + b, 0) / ucretler.length) * 100) / 100
        : 0,
      enDusukUcret: ucretler.length ? Math.min(...ucretler) : 0,
      enYuksekUcret: ucretler.length ? Math.max(...ucretler) : 0,
    },
  };
}

export async function adminBasvuruDurumGuncelle(id: string, durum: string, adminNotu?: string) {
  if (!Object.values(SoruYazariBasvuruDurum).includes(durum as SoruYazariBasvuruDurum)) {
    throw new AppHatasi('Geçersiz durum', 400);
  }
  const mevcut = await prisma.soruYazariBasvurusu.findUnique({ where: { id } });
  if (!mevcut) throw new AppHatasi('Başvuru bulunamadı', 404);

  const guncel = await prisma.soruYazariBasvurusu.update({
    where: { id },
    data: {
      durum: durum as SoruYazariBasvuruDurum,
      adminNotu: adminNotu === undefined ? mevcut.adminNotu : String(adminNotu || '').trim() || null,
      kararTarihi: new Date(),
    },
  });
  return basvuruCiktisi(guncel);
}

const KADEME_IZINLI = new Set<string>(Object.values(OgretimTuru));

/** Felsefe grubu başvurularda Psikoloji / Sosyoloji öğretmen kaydına Felsefe olarak yazılır */
const BRANS_ALIAS: Record<string, string> = {
  Psikoloji: 'Felsefe',
  Sosyoloji: 'Felsefe',
  Mantık: 'Felsefe',
};

function kademeIcinIzinli(kademe: string): readonly string[] {
  if (kademe === 'LGS' || kademe === 'SINIF_6' || kademe === 'SINIF_7') return LGS_BRANSLARI;
  if (kademe.startsWith('KPSS')) return KPSS_BRANSLARI;
  return YKS_BRANSLARI;
}

function basvuruBranslariniOgretmene(ham: Prisma.JsonValue): {
  brans: string;
  ogretimTurleri: OgretimTuru[];
  branslarByTur: Record<string, string[]>;
} {
  const kaynak = (ham && typeof ham === 'object' && !Array.isArray(ham) ? ham : {}) as Record<string, unknown>;
  const branslarByTur: Record<string, string[]> = {};
  for (const [kademe, liste] of Object.entries(kaynak)) {
    if (!KADEME_IZINLI.has(kademe) || !Array.isArray(liste)) continue;
    const izinli = new Set(kademeIcinIzinli(kademe));
    const temiz = [
      ...new Set(
        liste
          .filter((x): x is string => typeof x === 'string')
          .map((x) => BRANS_ALIAS[x.trim()] ?? x.trim())
          .filter((x) => izinli.has(x)),
      ),
    ];
    if (!temiz.length) continue;
    try {
      const birlesik = ogretmenBransKayitNormalize({ branslar: temiz }, kademe);
      branslarByTur[kademe] = birlesik.split(',').map((s) => s.trim()).filter(Boolean);
    } catch {
      /* bu kademe yazılamazsa diğerleri kalsın */
    }
  }
  const turler = Object.keys(branslarByTur) as OgretimTuru[];
  if (!turler.length) {
    throw new AppHatasi('Başvurudaki branşlar öğretmen hesabına yazılamadı. En az bir geçerli ders olmalı.', 400);
  }
  return {
    brans: branslarBirlestir(Object.values(branslarByTur).flat()),
    ogretimTurleri: turler,
    branslarByTur,
  };
}

function geciciSifreUret(): string {
  const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const kucuk = 'abcdefghijkmnpqrstuvwxyz';
  let govde = '';
  for (let i = 0; i < 4; i++) govde += kucuk[randomInt(kucuk.length)];
  return `${harfler[randomInt(harfler.length)]}${govde}${randomInt(1000, 9999)}`;
}

function kodOneriTemizle(ad: string, soyad: string): string {
  const tr: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  const ham = `${soyad}${ad}`
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (c) => tr[c] || c)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
  return ham.length >= 3 ? ham : 'WINGO';
}

async function bosTelefon(telefon: string): Promise<string | null> {
  const sahip = await prisma.kullanici.findUnique({ where: { telefon }, select: { id: true } });
  return sahip ? null : telefon;
}

type KabulGirdisi = {
  rol?: unknown;
  adminNotu?: unknown;
  kod?: unknown;
  indirimTipi?: unknown;
  indirimDegeri?: unknown;
  komisyonTipi?: unknown;
  komisyonDegeri?: unknown;
};

/**
 * Başvuruyu öğretmen veya koç hesabı olarak kabul eder ve indirim kodu + komisyon tanımlar.
 * Aynı e-postada öğretmen/koç hesabı varsa yeni hesap açmaz, kodu ona bağlar.
 */
export async function adminBasvuruKabulEt(id: string, girdi: KabulGirdisi) {
  const mevcut = await prisma.soruYazariBasvurusu.findUnique({
    where: { id },
    include: { kullanici: { select: { id: true, rol: true, email: true } } },
  });
  if (!mevcut) throw new AppHatasi('Başvuru bulunamadı', 404);
  if (mevcut.durum === SoruYazariBasvuruDurum.RED) {
    throw new AppHatasi('Reddedilmiş başvuru kabul edilemez', 400);
  }

  const istenenRol = String(girdi.rol || '').toUpperCase();
  if (istenenRol !== Rol.TEACHER && istenenRol !== Rol.KOC) {
    throw new AppHatasi('Kabul rolü öğretmen veya koç olmalı', 400);
  }
  const rol = istenenRol as typeof Rol.TEACHER | typeof Rol.KOC;

  const indirimDegeri = Number(girdi.indirimDegeri);
  const komisyonDegeri = Number(girdi.komisyonDegeri);
  if (!Number.isFinite(indirimDegeri) || indirimDegeri <= 0) {
    throw new AppHatasi('Öğrenci indirimi sıfırdan büyük olmalı', 400);
  }
  if (!Number.isFinite(komisyonDegeri) || komisyonDegeri < 0) {
    throw new AppHatasi('Komisyon negatif olamaz', 400);
  }

  const email = mevcut.email.trim().toLowerCase();
  let hesap = await prisma.kullanici.findUnique({
    where: { email },
    select: { id: true, rol: true, email: true, adminProfil: { select: { id: true } }, kocProfil: { select: { id: true, referansKod: true } } },
  });

  if (hesap && hesap.rol !== Rol.TEACHER && hesap.rol !== Rol.KOC) {
    throw new AppHatasi(
      `Bu e-posta zaten bir ${hesap.rol === Rol.OGRENCI ? 'öğrenci' : 'başka'} hesabında kayıtlı. Öğretmen veya koç olarak bağlanamaz.`,
      409,
    );
  }
  if (hesap && mevcut.kullaniciId && mevcut.kullaniciId !== hesap.id) {
    throw new AppHatasi('Başvuru başka bir hesaba bağlı', 409);
  }
  if (mevcut.kullanici && mevcut.kullanici.rol !== rol && !hesap) {
    throw new AppHatasi('Başvuru farklı bir rolle kabul edilmiş', 409);
  }

  let yeniHesap = false;
  let geciciSifre: string | null = null;
  let referansKod: string | null = hesap?.kocProfil?.referansKod ?? null;

  if (!hesap) {
    const sifre = geciciSifreUret();
    const hash = await bcrypt.hash(sifre, 12);
    const telefon = await bosTelefon(mevcut.telefon);
    if (rol === Rol.TEACHER) {
      const bransKaydi = basvuruBranslariniOgretmene(mevcut.branslar);
      hesap = await prisma.kullanici.create({
        data: {
          email,
          sifre: hash,
          telefon,
          rol: Rol.TEACHER,
          aktif: true,
          emailDogrulandi: true,
          adminProfil: {
            create: {
              ad: mevcut.ad,
              soyad: mevcut.soyad,
              brans: bransKaydi.brans,
              ogretimTuru: bransKaydi.ogretimTurleri[0],
              ogretimTurleri: bransKaydi.ogretimTurleri,
              ogretmenBranslar: bransKaydi.branslarByTur as Prisma.InputJsonValue,
            },
          },
        },
        select: { id: true, rol: true, email: true, adminProfil: { select: { id: true } }, kocProfil: { select: { id: true, referansKod: true } } },
      });
    } else {
      referansKod = await benzersizReferansKodUret();
      hesap = await prisma.kullanici.create({
        data: {
          email,
          sifre: hash,
          telefon,
          rol: Rol.KOC,
          aktif: true,
          emailDogrulandi: true,
          kocProfil: {
            create: {
              ad: mevcut.ad,
              soyad: mevcut.soyad,
              telefon,
              tip: KocTipi.BIREYSEL,
              referansKod,
              aktif: true,
              basvuruDurum: KurumBasvuruDurum.AKTIF,
            },
          },
        },
        select: { id: true, rol: true, email: true, adminProfil: { select: { id: true } }, kocProfil: { select: { id: true, referansKod: true } } },
      });
    }
    yeniHesap = true;
    geciciSifre = sifre;
  } else if (hesap.rol !== rol) {
    throw new AppHatasi(
      `Bu e-posta zaten ${hesap.rol === Rol.KOC ? 'koç' : 'öğretmen'} hesabı. Kodu bu role tanımlayın veya mevcut hesabı kullanın.`,
      409,
    );
  }

  const kodHam = String(girdi.kod || '').trim() || kodOneriTemizle(mevcut.ad, mevcut.soyad);
  const indirim = await adminIndirimKoduOlustur({
    kod: kodHam,
    aciklama: `${mevcut.ad} ${mevcut.soyad} soru yazarı kabulü`,
    ogretmenId: hesap.id,
    indirimTipi: typeof girdi.indirimTipi === 'string' ? girdi.indirimTipi : undefined,
    indirimDegeri,
    komisyonTipi: typeof girdi.komisyonTipi === 'string' ? girdi.komisyonTipi : undefined,
    komisyonDegeri,
    aktif: true,
  });

  const notMetin = girdi.adminNotu === undefined ? mevcut.adminNotu : String(girdi.adminNotu || '').trim() || null;
  await prisma.soruYazariBasvurusu.update({
    where: { id },
    data: {
      durum: SoruYazariBasvuruDurum.KABUL,
      adminNotu: notMetin,
      kararTarihi: new Date(),
      kullaniciId: hesap.id,
    },
  });

  const rolEtiket = rol === Rol.KOC ? 'koç' : 'öğretmen';
  const komisyonMetin =
    String(girdi.komisyonTipi || 'YUZDE').toUpperCase() === 'TUTAR'
      ? `${komisyonDegeri} TL`
      : `%${komisyonDegeri}`;
  const indirimMetin =
    String(girdi.indirimTipi || 'YUZDE').toUpperCase() === 'TUTAR'
      ? `${indirimDegeri} TL`
      : `%${indirimDegeri}`;

  const mesaj = yeniHesap
    ? `${rolEtiket} hesabınız açıldı. Giriş: ${email}. Geçici şifre: ${geciciSifre}. İndirim kodunuz ${indirim.kod} (öğrenci indirimi ${indirimMetin}, komisyonunuz ${komisyonMetin}).${referansKod ? ` Referans kodunuz: ${referansKod}.` : ''}`
    : `Hesabınıza indirim kodu tanımlandı: ${indirim.kod}. Öğrenci indirimi ${indirimMetin}, komisyonunuz ${komisyonMetin}.`;

  const epostaGonderildi = Boolean(process.env.SMTP_USER);
  await bildirimGonder({
    kullaniciId: hesap.id,
    baslik: yeniHesap ? 'Wingo hesabınız hazır' : 'İndirim kodunuz tanımlandı',
    mesaj: `${mesaj} Panele wingodeneme.com/giris adresinden girebilirsiniz.`,
    tur: 'soru_yazari_kabul',
    veriJson: { basvuruId: id, kod: indirim.kod },
  }).catch(() => undefined);

  const guncel = await prisma.soruYazariBasvurusu.findUniqueOrThrow({
    where: { id },
    include: { kullanici: { select: basvuruKullaniciSelect } },
  });

  return {
    basvuru: basvuruCiktisi(guncel),
    yeniHesap,
    geciciSifre,
    epostaGonderildi,
    referansKod,
    indirimKodu: {
      id: indirim.id,
      kod: indirim.kod,
      indirimTipi: indirim.indirimTipi,
      indirimDegeri: indirim.indirimDegeri,
      komisyonTipi: indirim.komisyonTipi,
      komisyonDegeri: indirim.komisyonDegeri,
    },
  };
}

export async function adminBasvuruSil(id: string) {
  const mevcut = await prisma.soruYazariBasvurusu.findUnique({ where: { id }, select: { id: true } });
  if (!mevcut) throw new AppHatasi('Başvuru bulunamadı', 404);
  await prisma.soruYazariBasvurusu.delete({ where: { id } });
  return { silindi: true };
}
