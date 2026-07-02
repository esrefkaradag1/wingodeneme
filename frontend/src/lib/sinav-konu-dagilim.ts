import {
  dersKitapcikEtiketi,
  formatOsymDagilimCumlesi,
  type DagilimBloku,
} from '@/lib/kitapcikDagilimMetni';

export interface KonuDagilimSatiri {
  konuId: string;
  adet: number;
  bolumAdi?: string;
  altBolumAdi?: string;
  aciklama?: string;
  soruBas?: number;
  soruBit?: number;
}

export interface SinavAltBolumForm {
  id: string;
  ad: string;
  aciklama: string;
  soruBas: number | null;
  soruBit: number | null;
  satirlar: KonuDagilimSatiri[];
}

export interface SinavBolumForm {
  id: string;
  ad: string;
  satirlar: KonuDagilimSatiri[];
  altBolumler: SinavAltBolumForm[];
}

/** Veritabanında tam bölüm/alt bölüm ağacı (boş alt bölümler dahil) */
export type KonuDagilimiV2 = {
  version: 2;
  bolumler: Array<{
    ad: string;
    altBolumler: Array<{
      ad: string;
      aciklama: string;
      soruBas: number | null;
      soruBit: number | null;
      satirlar: Array<{ konuId: string; adet: number }>;
    }>;
  }>;
};

export function isKonuDagilimiV2(raw: unknown): raw is KonuDagilimiV2 {
  return (
    !!raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    (raw as KonuDagilimiV2).version === 2 &&
    Array.isArray((raw as KonuDagilimiV2).bolumler)
  );
}

const SOZEL_DERSLER = new Set([
  'Türkçe',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü ve Ahlak Bilgisi',
  'T.C. İnkılap Tarihi ve Atatürkçülük',
  'İngilizce',
]);

const SAYISAL_DERSLER = new Set([
  'Matematik',
  'Geometri',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Fen Bilimleri',
]);

const TYT_ALT_BOLUM_SIRASI = [
  { anahtar: 'TR', ad: 'TÜRKÇE TESTİ', soruBas: 1, soruBit: 40 },
  { anahtar: 'SOS', ad: 'SOSYAL BİLİMLER TESTİ', soruBas: 1, soruBit: 20 },
  { anahtar: 'MAT', ad: 'TEMEL MATEMATİK TESTİ', soruBas: 1, soruBit: 40 },
  { anahtar: 'FEN', ad: 'FEN BİLİMLERİ TESTİ', soruBas: 1, soruBit: 20 },
] as const;

const AYT_ALT_BOLUM_SIRASI = [
  { anahtar: 'TD_SB1', ad: 'TÜRK DİLİ VE EDEBİYATI TESTİ', soruBas: 1, soruBit: 40 },
  { anahtar: 'SOS_SB2', ad: 'SOSYAL BİLİMLER TESTİ', soruBas: 1, soruBit: 40 },
  { anahtar: 'MAT', ad: 'MATEMATİK TESTİ', soruBas: 1, soruBit: 40 },
  { anahtar: 'FEN', ad: 'FEN BİLİMLERİ TESTİ', soruBas: 1, soruBit: 40 },
] as const;

const LGS_ALT_BOLUM_SIRASI = [
  { anahtar: 'TR', ad: 'TÜRKÇE TESTİ', soruBas: 1, soruBit: 20 },
  { anahtar: 'INK', ad: 'T.C. İNKILAP TARİHİ VE ATATÜRKÇÜLÜK TESTİ', soruBas: 1, soruBit: 10 },
  { anahtar: 'DIN', ad: 'DİN KÜLTÜRÜ VE AHLAK BİLGİSİ TESTİ', soruBas: 1, soruBit: 10 },
  { anahtar: 'ING', ad: 'İNGİLİZCE TESTİ', soruBas: 1, soruBit: 10 },
  { anahtar: 'MAT', ad: 'MATEMATİK TESTİ', soruBas: 1, soruBit: 20 },
  { anahtar: 'FEN', ad: 'FEN BİLİMLERİ TESTİ', soruBas: 1, soruBit: 20 },
] as const;

const AYT_SOZEL_DERSLER = new Set([
  'Edebiyat',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Psikoloji',
  'Sosyoloji',
  'Mantık',
  'Din Kültürü ve Ahlak Bilgisi',
]);

const AYT_SAYISAL_DERSLER = new Set(['Matematik', 'Fizik', 'Kimya', 'Biyoloji']);

function yeniBolumId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `bolum-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function yeniAltBolumId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `alt-bolum-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normTr(s: string): string {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tytAltBolumAnahtari(ders: string): 'TR' | 'SOS' | 'MAT' | 'FEN' | 'DIGER' {
  if (ders === 'Türkçe') return 'TR';
  if (ders === 'Matematik' || ders === 'Geometri') return 'MAT';
  if (ders === 'Fizik' || ders === 'Kimya' || ders === 'Biyoloji') return 'FEN';
  if (SOZEL_DERSLER.has(ders)) return 'SOS';
  return 'DIGER';
}

function aytAltBolumAnahtari(ders: string, uniteAdi: string): 'TD_SB1' | 'SOS_SB2' | 'MAT' | 'FEN' | 'DIGER' {
  const d = ders.trim();
  const u = normTr(uniteAdi);

  if (d === 'Matematik') return 'MAT';
  if (d === 'Fizik' || d === 'Kimya' || d === 'Biyoloji') return 'FEN';
  if (d === 'Edebiyat') return 'TD_SB1';
  if (u.includes('tarih 1') || u.includes('tarih-1')) return 'TD_SB1';
  if (u.includes('cografya 1') || u.includes('cografya-1')) return 'TD_SB1';
  if (u.includes('tarih 2') || u.includes('tarih-2')) return 'SOS_SB2';
  if (u.includes('cografya 2') || u.includes('cografya-2')) return 'SOS_SB2';
  if (u.includes('felsefe grubu')) return 'SOS_SB2';
  if (d === 'Felsefe' || d === 'Psikoloji' || d === 'Sosyoloji' || d === 'Mantık') return 'SOS_SB2';
  if (d === 'Din Kültürü ve Ahlak Bilgisi') return 'SOS_SB2';
  if (d === 'Tarih') return u.includes('1') ? 'TD_SB1' : 'SOS_SB2';
  if (d === 'Coğrafya') return u.includes('1') ? 'TD_SB1' : 'SOS_SB2';
  return 'DIGER';
}

function lgsAltBolumAnahtari(ders: string): 'TR' | 'INK' | 'DIN' | 'ING' | 'MAT' | 'FEN' | 'DIGER' {
  const d = ders.trim();
  if (d === 'Türkçe') return 'TR';
  if (d === 'T.C. İnkılap Tarihi ve Atatürkçülük') return 'INK';
  if (d === 'Din Kültürü ve Ahlak Bilgisi') return 'DIN';
  if (d === 'İngilizce') return 'ING';
  if (d === 'Matematik') return 'MAT';
  if (d === 'Fen Bilimleri') return 'FEN';
  return 'DIGER';
}

type KonuMetaKaynak = { id: string; ders?: string | null; uniteAdi?: string | null };

function konuMeta(konuId: string, konular: KonuMetaKaynak[]): { ders: string; uniteAdi: string } {
  const konu = konular.find((k) => k.id === konuId);
  return {
    ders: String(konu?.ders ?? '').trim(),
    uniteAdi: String(konu?.uniteAdi ?? '').trim(),
  };
}

function anaBolumAltBolumleriOlustur(
  satirlar: KonuDagilimSatiri[],
  konular: KonuMetaKaynak[],
  anaBolumAdi: string,
  sablonlar: ReadonlyArray<{ anahtar: string; ad: string; soruBas: number; soruBit: number }>,
  anahtarCoz: (konuId: string) => string,
  anaBolumFiltre?: (anahtar: string, anaBolumAdi: string) => boolean,
): SinavAltBolumForm[] {
  const gruplar = new Map<string, KonuDagilimSatiri[]>();

  for (const satir of satirlar) {
    const anahtar = anahtarCoz(satir.konuId);
    if (!gruplar.has(anahtar)) gruplar.set(anahtar, []);
    gruplar.get(anahtar)!.push({ konuId: satir.konuId, adet: satir.adet });
  }

  return sablonlar
    .filter((row) => (anaBolumFiltre ? anaBolumFiltre(row.anahtar, anaBolumAdi) : true))
    .map((row) => {
      const altSatirlar = gruplar.get(row.anahtar) || [];
      if (altSatirlar.length === 0) return null;
      return {
        id: yeniAltBolumId(),
        ad: row.ad,
        aciklama: altBolumDagilimMetni(altSatirlar, konular, row.soruBas),
        soruBas: row.soruBas,
        soruBit: row.soruBit,
        satirlar: altSatirlar,
      } satisfies SinavAltBolumForm;
    })
    .filter((row): row is SinavAltBolumForm => row != null);
}

function sozelSayisalAltBolumFiltre(anahtar: string, anaBolumAdi: string, sozelAnahtarlar: string[]): boolean {
  const sozelMi = anaBolumAdi.includes('Sözel');
  const sayisalMi = anaBolumAdi.includes('Sayısal');
  if (sozelMi) return sozelAnahtarlar.includes(anahtar);
  if (sayisalMi) return !sozelAnahtarlar.includes(anahtar);
  return true;
}

function parseKonuDagilimSatiri(o: Record<string, unknown>): KonuDagilimSatiri | null {
  const konuId = typeof o.konuId === 'string' ? o.konuId : '';
  const adet = Math.max(0, parseInt(String(o.adet), 10) || 0);
  if (!konuId || adet <= 0) return null;

  const bolumAdi = typeof o.bolumAdi === 'string' ? o.bolumAdi.trim() : '';
  const altBolumAdi = typeof o.altBolumAdi === 'string' ? o.altBolumAdi.trim() : '';
  const aciklama = typeof o.aciklama === 'string' ? o.aciklama.trim() : '';
  const soruBasRaw = o.soruBas != null ? parseInt(String(o.soruBas), 10) : NaN;
  const soruBitRaw = o.soruBit != null ? parseInt(String(o.soruBit), 10) : NaN;

  return {
    konuId,
    adet,
    ...(bolumAdi ? { bolumAdi } : {}),
    ...(altBolumAdi ? { altBolumAdi } : {}),
    ...(aciklama ? { aciklama } : {}),
    ...(Number.isFinite(soruBasRaw) ? { soruBas: soruBasRaw } : {}),
    ...(Number.isFinite(soruBitRaw) ? { soruBit: soruBitRaw } : {}),
  };
}

export function bosSinavAltBolum(ad = ''): SinavAltBolumForm {
  return { id: yeniAltBolumId(), ad, aciklama: '', soruBas: null, soruBit: null, satirlar: [] };
}

export function bosSinavBolum(ad = ''): SinavBolumForm {
  return { id: yeniBolumId(), ad, satirlar: [], altBolumler: [bosSinavAltBolum()] };
}

export function bosKonuDagilimSatiri(): KonuDagilimSatiri {
  return { konuId: '', adet: 1 };
}

function altBolumleriDuzelt(bolum: SinavBolumForm): SinavBolumForm {
  if (bolum.altBolumler.length === 0 && bolum.satirlar.length > 0) {
    return {
      ...bolum,
      satirlar: [],
      altBolumler: [{ ...bosSinavAltBolum(), satirlar: bolum.satirlar }],
    };
  }
  if (bolum.altBolumler.length === 0) {
    return { ...bolum, altBolumler: [bosSinavAltBolum()] };
  }
  return { ...bolum, satirlar: [] };
}

export function altBolumDagilimMetni(
  satirlar: Array<{ konuId: string; adet: number }>,
  konular: Array<{ id: string; ders?: string | null }>,
  soruBas = 1,
): string {
  const dersById = new Map(konular.map((k) => [k.id, String(k.ders ?? '').trim()]));
  const bloklar: DagilimBloku[] = [];
  let no = soruBas;

  for (const satir of satirlar) {
    if (!satir.konuId || satir.adet <= 0) continue;
    const etiket = dersKitapcikEtiketi(dersById.get(satir.konuId) || '');
    const bas = no;
    const bit = no + satir.adet - 1;
    no = bit + 1;
    bloklar.push({ etiket, bas, bit });
  }

  const toplam = Math.max(0, no - soruBas);
  return formatOsymDagilimCumlesi(bloklar, toplam);
}

function turAnaBolumAltBolumleri(
  tur: string,
  satirlar: KonuDagilimSatiri[],
  konular: KonuMetaKaynak[],
  anaBolumAdi: string,
): SinavAltBolumForm[] {
  if (tur === 'TYT') {
    return anaBolumAltBolumleriOlustur(
      satirlar,
      konular,
      anaBolumAdi,
      TYT_ALT_BOLUM_SIRASI,
      (konuId) => tytAltBolumAnahtari(konuMeta(konuId, konular).ders),
      (anahtar, ad) => sozelSayisalAltBolumFiltre(anahtar, ad, ['TR', 'SOS']),
    );
  }

  if (tur === 'AYT' || tur === 'AYT_TYT') {
    return anaBolumAltBolumleriOlustur(
      satirlar,
      konular,
      anaBolumAdi,
      AYT_ALT_BOLUM_SIRASI,
      (konuId) => {
        const { ders, uniteAdi } = konuMeta(konuId, konular);
        return aytAltBolumAnahtari(ders, uniteAdi);
      },
      (anahtar, ad) => sozelSayisalAltBolumFiltre(anahtar, ad, ['TD_SB1', 'SOS_SB2']),
    );
  }

  if (tur === 'LGS') {
    return anaBolumAltBolumleriOlustur(
      satirlar,
      konular,
      anaBolumAdi,
      LGS_ALT_BOLUM_SIRASI,
      (konuId) => lgsAltBolumAnahtari(konuMeta(konuId, konular).ders),
      (anahtar, ad) => sozelSayisalAltBolumFiltre(anahtar, ad, ['TR', 'INK', 'DIN', 'ING']),
    );
  }

  return satirlar.length > 0 ? [{ ...bosSinavAltBolum(), satirlar }] : [bosSinavAltBolum()];
}

function bolumlerV2ToForm(stored: KonuDagilimiV2['bolumler']): SinavBolumForm[] {
  if (stored.length === 0) return [bosSinavBolum()];

  return stored.map((bolum) =>
    altBolumleriDuzelt({
      id: yeniBolumId(),
      ad: bolum.ad || '',
      satirlar: [],
      altBolumler:
        bolum.altBolumler.length > 0
          ? bolum.altBolumler.map((alt) => ({
              id: yeniAltBolumId(),
              ad: alt.ad || '',
              aciklama: alt.aciklama || '',
              soruBas: alt.soruBas ?? null,
              soruBit: alt.soruBit ?? null,
              satirlar: (alt.satirlar || [])
                .filter((satir) => satir.konuId && satir.adet > 0)
                .map((satir) => ({ konuId: satir.konuId, adet: satir.adet })),
            }))
          : [bosSinavAltBolum()],
    }),
  );
}

/** Form kaydı: boş alt bölümler dahil tam yapı */
export function bolumlerToKonuDagilimi(bolumler: SinavBolumForm[]): KonuDagilimiV2 {
  const kaynak = bolumler.length > 0 ? bolumler : [bosSinavBolum()];

  return {
    version: 2,
    bolumler: kaynak.map((bolum) => {
      const altKaynak =
        bolum.altBolumler.length > 0
          ? bolum.altBolumler
          : [{ ...bosSinavAltBolum(), satirlar: bolum.satirlar }];

      return {
        ad: bolum.ad.trim(),
        altBolumler: altKaynak.map((alt) => ({
          ad: alt.ad.trim(),
          aciklama: alt.aciklama.trim(),
          soruBas: alt.soruBas,
          soruBit: alt.soruBit,
          satirlar: alt.satirlar
            .filter((satir) => satir.konuId && satir.adet > 0)
            .map((satir) => ({ konuId: satir.konuId, adet: satir.adet })),
        })),
      };
    }),
  };
}

/** Kitapçık / eski API: düz satır listesi */
export function flatKonuDagilimSatirlari(raw: unknown): KonuDagilimSatiri[] {
  if (isKonuDagilimiV2(raw)) {
    return bolumlerToApi(bolumlerV2ToForm(raw.bolumler));
  }
  if (!Array.isArray(raw)) return [];
  const out: KonuDagilimSatiri[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const parsed = parseKonuDagilimSatiri(item as Record<string, unknown>);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function bolumlerFromKonuDagilimi(raw: unknown): SinavBolumForm[] {
  if (isKonuDagilimiV2(raw)) {
    return bolumlerV2ToForm(raw.bolumler);
  }
  return bolumlerFromApi(raw);
}

export function bolumlerFromApi(raw: unknown): SinavBolumForm[] {
  const satirlar = flatKonuDagilimSatirlari(raw);

  if (satirlar.length === 0) {
    return [bosSinavBolum()];
  }

  const bolumSirasi: string[] = [];
  const anaGruplar = new Map<
    string,
    Map<
      string,
      {
        aciklama: string;
        soruBas: number | null;
        soruBit: number | null;
        satirlar: KonuDagilimSatiri[];
      }
    >
  >();
  const sonAltBolumPerBolum = new Map<string, string>();

  for (const satir of satirlar) {
    const bolumAdi = satir.bolumAdi?.trim() || 'Genel';
    let altBolumAdi = satir.altBolumAdi?.trim() || '';
    if (altBolumAdi) {
      sonAltBolumPerBolum.set(bolumAdi, altBolumAdi);
    } else {
      altBolumAdi = sonAltBolumPerBolum.get(bolumAdi) || '__varsayilan__';
    }
    if (!anaGruplar.has(bolumAdi)) {
      anaGruplar.set(bolumAdi, new Map());
      bolumSirasi.push(bolumAdi);
    }
    const altGruplar = anaGruplar.get(bolumAdi)!;
    if (!altGruplar.has(altBolumAdi)) {
      altGruplar.set(altBolumAdi, {
        aciklama: '',
        soruBas: null,
        soruBit: null,
        satirlar: [],
      });
    }
    const alt = altGruplar.get(altBolumAdi)!;
    if (satir.aciklama) alt.aciklama = satir.aciklama;
    if (satir.soruBas != null) alt.soruBas = satir.soruBas;
    if (satir.soruBit != null) alt.soruBit = satir.soruBit;
    alt.satirlar.push({ konuId: satir.konuId, adet: satir.adet });
  }

  return bolumSirasi.map((ad) => {
    const altGruplar = anaGruplar.get(ad) || new Map();
    const altBolumler = [...altGruplar.entries()].map(([altAd, alt]) => ({
      id: yeniAltBolumId(),
      ad: altAd === '__varsayilan__' ? '' : altAd,
      aciklama: alt.aciklama,
      soruBas: alt.soruBas,
      soruBit: alt.soruBit,
      satirlar: alt.satirlar,
    }));
    return altBolumleriDuzelt({
      id: yeniBolumId(),
      ad: ad === 'Genel' ? '' : ad,
      satirlar: [],
      altBolumler,
    });
  });
}

export function bolumlerToApi(bolumler: SinavBolumForm[]): KonuDagilimSatiri[] {
  const out: KonuDagilimSatiri[] = [];

  for (const bolum of bolumler) {
    const bolumAdi = bolum.ad.trim();
    const altKaynak =
      bolum.altBolumler.length > 0
        ? bolum.altBolumler
        : [{ ...bosSinavAltBolum(), satirlar: bolum.satirlar }];

    for (const alt of altKaynak) {
      const altBolumAdi = alt.ad.trim();
      const aciklama = alt.aciklama.trim();
      const soruBas = alt.soruBas;
      const soruBit = alt.soruBit;

      const gecerliSatirlar = alt.satirlar.filter((satir) => satir.konuId && satir.adet > 0);
      gecerliSatirlar.forEach((satir, idx) => {
        out.push({
          konuId: satir.konuId,
          adet: satir.adet,
          ...(bolumAdi ? { bolumAdi } : {}),
          ...(altBolumAdi ? { altBolumAdi } : {}),
          ...(aciklama && idx === 0 ? { aciklama } : {}),
          ...(idx === 0 && soruBas != null ? { soruBas } : {}),
          ...(idx === 0 && soruBit != null ? { soruBit } : {}),
        });
      });
    }
  }

  return out;
}

export function dagilimToplamSoru(bolumler: SinavBolumForm[]): number {
  return bolumler.reduce((toplam, bolum) => {
    const altToplam = bolum.altBolumler.reduce(
      (alt, altBolum) => alt + altBolum.satirlar.reduce((satirToplam, satir) => satirToplam + (satir.adet || 0), 0),
      0,
    );
    const duzToplam = bolum.satirlar.reduce((satirToplam, satir) => satirToplam + (satir.adet || 0), 0);
    return toplam + altToplam + duzToplam;
  }, 0);
}

export function dagilimSatirSayisi(bolumler: SinavBolumForm[]): number {
  return bolumler.reduce((toplam, bolum) => {
    const altSatir = bolum.altBolumler.reduce((alt, altBolum) => alt + altBolum.satirlar.length, 0);
    return toplam + altSatir + bolum.satirlar.length;
  }, 0);
}

export function tytKitapcikBolumAdi(ders: string): 'Sözel Bölüm' | 'Sayısal Bölüm' {
  if (SOZEL_DERSLER.has(ders)) return 'Sözel Bölüm';
  if (SAYISAL_DERSLER.has(ders)) return 'Sayısal Bölüm';
  return 'Sayısal Bölüm';
}

export function aytKitapcikBolumAdi(ders: string): 'Sözel Bölüm' | 'Sayısal Bölüm' {
  if (AYT_SOZEL_DERSLER.has(ders)) return 'Sözel Bölüm';
  if (AYT_SAYISAL_DERSLER.has(ders)) return 'Sayısal Bölüm';
  return 'Sözel Bölüm';
}

export function lgsKitapcikBolumAdi(ders: string): 'Sözel Bölüm' | 'Sayısal Bölüm' {
  const d = ders.trim();
  if (d === 'Matematik' || d === 'Fen Bilimleri') return 'Sayısal Bölüm';
  return 'Sözel Bölüm';
}

export function satirlariBolumlereAyir(
  satirlar: { konuId: string; adet: number }[],
  konular: KonuMetaKaynak[],
  bolumAdiCoz: (ders: string) => string,
  tur?: string,
): SinavBolumForm[] {
  const dersById = new Map(konular.map((k) => [k.id, String(k.ders ?? '').trim()]));
  const bolumSirasi: string[] = [];
  const gruplar = new Map<string, KonuDagilimSatiri[]>();

  for (const satir of satirlar) {
    const ders = dersById.get(satir.konuId) || '';
    const bolumAdi = bolumAdiCoz(ders);
    if (!gruplar.has(bolumAdi)) {
      gruplar.set(bolumAdi, []);
      bolumSirasi.push(bolumAdi);
    }
    gruplar.get(bolumAdi)!.push({ konuId: satir.konuId, adet: satir.adet });
  }

  if (bolumSirasi.length === 0) {
    return [bosSinavBolum()];
  }

  return bolumSirasi.map((ad) => {
    const anaSatirlar = gruplar.get(ad) || [];
    const altBolumler =
      tur === 'TYT' || tur === 'AYT' || tur === 'AYT_TYT' || tur === 'LGS' || tur === 'KPSS'
        ? turAnaBolumAltBolumleri(tur, anaSatirlar, konular, ad)
        : anaSatirlar.length > 0
          ? [{ ...bosSinavAltBolum(), satirlar: anaSatirlar }]
          : [bosSinavAltBolum()];

    return altBolumleriDuzelt({
      id: yeniBolumId(),
      ad,
      satirlar: [],
      altBolumler,
    });
  });
}
