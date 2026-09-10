import { Prisma, Rol, SoruYazariBasvuruDurum } from '@prisma/client';
import { prisma } from '../config/database';
import { AppHatasi } from '../middlewares/hata.middleware';
import { bildirimGonder } from './bildirim.service';

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
  };
}

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

export async function adminBasvuruSil(id: string) {
  const mevcut = await prisma.soruYazariBasvurusu.findUnique({ where: { id }, select: { id: true } });
  if (!mevcut) throw new AppHatasi('Başvuru bulunamadı', 404);
  await prisma.soruYazariBasvurusu.delete({ where: { id } });
  return { silindi: true };
}
