/**
 * ÖSYM’ye yakın TYT (120), AYT (160), LGS (90) soru sayıları — konu satırlarına ünite bazında eşit böler.
 * Ders adları `backend/prisma/data/konuAgaci.ts` ile aynı olmalı.
 */

export interface KonuSablonKaynak {
  id: string;
  ders: string;
  yksSegment?: string | null;
  ogretimTuru?: string;
  uniteAdi?: string | null;
}

function strNorm(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function ogretimTuruYksMi(k: KonuSablonKaynak): boolean {
  return strNorm(k.ogretimTuru).toUpperCase() === 'YKS';
}

function dersEsit(k: KonuSablonKaynak, beklenen: string): boolean {
  return strNorm(k.ders) === strNorm(beklenen);
}

type AytKonuBulOpts = {
  yksSegments: readonly string[];
  uniteAdi?: string | null;
  /** Varsa sırayla dene (örn. Din: AYT / TYT ünite adları) */
  uniteAdilariSirali?: readonly string[];
};

/** Segment sırası + ünite eşlemesi → yoksa ünite filtresini kaldırarak aynı segmentte paylaştırır (eski/uyumsuz veri). */
function aytKonuBul(
  konular: KonuSablonKaynak[],
  dersAdi: string,
  toplamAdet: number,
  opts: AytKonuBulOpts
): { konuId: string; adet: number }[] {
  if (toplamAdet <= 0) return [];

  const birListeyiBol = (list: KonuSablonKaynak[]) => {
    if (list.length === 0) return [] as { konuId: string; adet: number }[];
    const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
    const n = sorted.length;
    const base = Math.floor(toplamAdet / n);
    let rem = toplamAdet % n;
    return sorted.map((ki, i) => ({
      konuId: ki.id,
      adet: base + (i < rem ? 1 : 0),
    }));
  };

  for (const segment of opts.yksSegments) {
    const temel = konular.filter((k) => ogretimTuruYksMi(k) && dersEsit(k, dersAdi));
    const segmentli = temel.filter((k) => strNorm(k.yksSegment as string) === strNorm(segment));

    const birimSirasi: (string | null)[] =
      opts.uniteAdilariSirali && opts.uniteAdilariSirali.length > 0
        ? [...opts.uniteAdilariSirali]
        : opts.uniteAdi != null && strNorm(opts.uniteAdi) !== ''
          ? [opts.uniteAdi]
          : [null];

    for (const uRaw of birimSirasi) {
      if (uRaw != null && strNorm(uRaw) !== '') {
        const dar = segmentli.filter((k) => strNorm(k.uniteAdi) === strNorm(uRaw));
        const bol = birListeyiBol(dar);
        if (bol.length > 0) return bol;
      }
    }

    /** Ünite yok ya da hiçbir ünite başarısı yoksa: segment içi tüm üniteler */
    const gevsek = birListeyiBol(segmentli);
    if (gevsek.length > 0) return gevsek;
  }

  return [];
}

/** TYT: Türkçe 40, Mat+Geo 40, Fen 20, Sosyal 20 */
export const TYT_OSYM_DERS_ADET: { ders: string; adet: number }[] = [
  { ders: 'Türkçe', adet: 40 },
  { ders: 'Matematik', adet: 28 },
  { ders: 'Geometri', adet: 12 },
  { ders: 'Fizik', adet: 7 },
  { ders: 'Kimya', adet: 7 },
  { ders: 'Biyoloji', adet: 6 },
  { ders: 'Tarih', adet: 5 },
  { ders: 'Coğrafya', adet: 5 },
  { ders: 'Felsefe', adet: 5 },
  { ders: 'Din Kültürü ve Ahlak Bilgisi', adet: 5 },
];

/** ÖSYM Alan Yeterlilik Testleri (AYT): 160 soru / 180 dk (yaklaşık resmî dağılım) */
export const AYT_OSYM_TOPLAM_SORU = 160;
export const AYT_OSYM_SURE_DK = 180;

/** LGS toplam 90 — yaygın dağılım (İngilizce müfredatına göre güncellenebilir) */
export const LGS_OSYM_DERS_ADET: { ders: string; adet: number }[] = [
  { ders: 'Türkçe', adet: 20 },
  { ders: 'Matematik', adet: 20 },
  { ders: 'Fen Bilimleri', adet: 20 },
  { ders: 'T.C. İnkılap Tarihi ve Atatürkçülük', adet: 10 },
  { ders: 'Din Kültürü ve Ahlak Bilgisi', adet: 10 },
  { ders: 'İngilizce', adet: 10 },
];

function dersKonularinaEsitDagit(
  konular: KonuSablonKaynak[],
  dersAdi: string,
  toplamAdet: number,
  opts?: { yksSegment?: string; ogretimTuru?: string; uniteAdi?: string | null }
): { konuId: string; adet: number }[] {
  let list = konular.filter((k) => dersEsit(k, dersAdi));
  if (opts?.yksSegment) {
    const seg = strNorm(opts.yksSegment);
    list = list.filter((k) => strNorm(k.yksSegment as string) === seg);
  }
  if (opts?.ogretimTuru) {
    const ot = opts.ogretimTuru.trim().toUpperCase();
    list = list.filter((k) => String(k.ogretimTuru ?? '').trim().toUpperCase() === ot);
  }
  if (opts?.uniteAdi != null && strNorm(opts.uniteAdi) !== '') {
    const u = strNorm(opts.uniteAdi);
    list = list.filter((k) => strNorm(k.uniteAdi) === u);
  }

  /** Birincil liste boşsa: aynı ders+yksSegment için ünite fark etmeksizin paylaştır */
  let listIkincil = list;
  if (
    listIkincil.length === 0 &&
    opts?.yksSegment &&
    opts?.uniteAdi != null &&
    strNorm(opts.uniteAdi) !== ''
  ) {
    let l2 = konular.filter((k) => dersEsit(k, dersAdi));
    const seg = strNorm(opts.yksSegment);
    l2 = l2.filter((k) => strNorm(k.yksSegment as string) === seg);
    if (opts?.ogretimTuru) {
      const ot = opts.ogretimTuru.trim().toUpperCase();
      l2 = l2.filter((k) => String(k.ogretimTuru ?? '').trim().toUpperCase() === ot);
    }
    listIkincil = l2;
  }
  if (listIkincil.length === 0 || toplamAdet <= 0) return [];
  const sorted = [...listIkincil].sort((a, b) => a.id.localeCompare(b.id));
  const n = sorted.length;
  const base = Math.floor(toplamAdet / n);
  let rem = toplamAdet % n;
  return sorted.map((k, i) => ({
    konuId: k.id,
    adet: base + (i < rem ? 1 : 0),
  }));
}

/** TYT konu listesi (yalnızca TYT segment) ile ÖSYM dağılımı */
export function tytOsymSablonSatirlari(konular: KonuSablonKaynak[]): { konuId: string; adet: number }[] {
  const tyt = konular.filter(
    (k) => strNorm(k.yksSegment as string) === 'TYT' && ogretimTuruYksMi(k)
  );
  const out: { konuId: string; adet: number }[] = [];
  for (const { ders, adet } of TYT_OSYM_DERS_ADET) {
    out.push(
      ...dersKonularinaEsitDagit(tyt, ders, adet, { yksSegment: 'TYT', ogretimTuru: 'YKS' })
    );
  }
  return out;
}

/** ÖSYM ~160 blokları — teşhis ve Şablon aynı tanımı kullanır */
const felUnite = 'AYT Felsefe Grubu';

const AYT_OSYM_SEED_BLOKLAR: readonly {
  etiket: string;
  ders: string;
  adet: number;
  bulOpts: AytKonuBulOpts;
}[] = [
  /** TD: yanlış TYT etiketi; birleştirilmiş listede yakalanır (TYT ikinci sıra) */
  { etiket: 'Edebiyat (TD)', ders: 'Edebiyat', adet: 24, bulOpts: { yksSegments: ['AYT_EDEBIYAT', 'TYT'], uniteAdi: 'Edebiyat' } },
  { etiket: 'Tarih-1', ders: 'Tarih', adet: 10, bulOpts: { yksSegments: ['AYT_TARIH1', 'AYT_TARIH2'], uniteAdi: 'Tarih-1' } },
  { etiket: 'Coğrafya-1', ders: 'Coğrafya', adet: 6, bulOpts: { yksSegments: ['AYT_COG1', 'AYT_COG2'], uniteAdi: 'Coğrafya-1' } },
  { etiket: 'Tarih-2', ders: 'Tarih', adet: 11, bulOpts: { yksSegments: ['AYT_TARIH2', 'AYT_TARIH1'], uniteAdi: 'Tarih-2' } },
  { etiket: 'Coğrafya-2', ders: 'Coğrafya', adet: 11, bulOpts: { yksSegments: ['AYT_COG2', 'AYT_COG1'], uniteAdi: 'Coğrafya-2' } },
  { etiket: 'SB-2 · Felsefe', ders: 'Felsefe', adet: 3, bulOpts: { yksSegments: ['AYT_FELSEFE_GRUBU'], uniteAdi: felUnite } },
  { etiket: 'SB-2 · Psikoloji', ders: 'Psikoloji', adet: 3, bulOpts: { yksSegments: ['AYT_FELSEFE_GRUBU'], uniteAdi: felUnite } },
  { etiket: 'SB-2 · Sosyoloji', ders: 'Sosyoloji', adet: 3, bulOpts: { yksSegments: ['AYT_FELSEFE_GRUBU'], uniteAdi: felUnite } },
  { etiket: 'SB-2 · Mantık', ders: 'Mantık', adet: 3, bulOpts: { yksSegments: ['AYT_FELSEFE_GRUBU'], uniteAdi: felUnite } },
  {
    etiket: 'Din (SB-2)',
    ders: 'Din Kültürü ve Ahlak Bilgisi',
    adet: 6,
    bulOpts: {
      yksSegments: ['AYT_DIN', 'TYT'],
      uniteAdilariSirali: ['AYT Din Kültürü', 'TYT Din Kültürü'],
    },
  },
  { etiket: 'Matematik', ders: 'Matematik', adet: 40, bulOpts: { yksSegments: ['AYT_MATEMATIK'], uniteAdi: null } },
  { etiket: 'Fizik', ders: 'Fizik', adet: 14, bulOpts: { yksSegments: ['AYT_FEN_BILIMLERI'], uniteAdi: null } },
  { etiket: 'Kimya', ders: 'Kimya', adet: 13, bulOpts: { yksSegments: ['AYT_FEN_BILIMLERI'], uniteAdi: null } },
  { etiket: 'Biyoloji', ders: 'Biyoloji', adet: 13, bulOpts: { yksSegments: ['AYT_FEN_BILIMLERI'], uniteAdi: null } },
];

export interface AytOsymKovaOzeti {
  etiket: string;
  hedefSoru: number;
  atanmis: number;
}

/** Şablon 160’a hangi bloklarda kaç soru yakalandığını gösterir (teşhis). */
export function aytOsym160KovaOzeti(konular: KonuSablonKaynak[]): AytOsymKovaOzeti[] {
  const yks = konular.filter((k) => ogretimTuruYksMi(k));
  return AYT_OSYM_SEED_BLOKLAR.map((b) => {
    const atanmis = sablonToplamSoru(aytKonuBul(yks, b.ders, b.adet, b.bulOpts));
    return {
      etiket: b.etiket,
      hedefSoru: b.adet,
      atanmis,
    };
  });
}

/** Eksik bloğun adları (atanan < hedef) */
export function aytOsym160EksikBlokEtiketleri(konular: KonuSablonKaynak[]): string[] {
  return aytOsym160KovaOzeti(konular)
    .filter((r) => r.atanmis < r.hedefSoru)
    .map((r) => `${r.etiket} (+${r.hedefSoru - r.atanmis})`);
}

/**
 * AYT konu listesi ile ÖSYM 2. oturum ~160 soru dağılımı:
 * SB-1: TD 24 + Tarih-1 10 + Coğrafya-1 6 = 40
 * SB-2: Tarih-2 11 + Coğrafya-2 11 + Felsefe Grubu 12 + Din 6 = 40
 * Matematik 40, Fen 40 (Fiz 14, Kim 13, Bio 13)
 *
 * Liste: frontend’de AYT için konular ile birlikte yanlış etiketli Edebiyat (TYT fetch birleştirmesi önerilir)
 * ve gerekiyorsa TYT liste birleştirilmiş olmalı.
 */
export function aytOsym160SablonSatirlari(konular: KonuSablonKaynak[]): { konuId: string; adet: number }[] {
  const yks = konular.filter((k) => ogretimTuruYksMi(k));
  const out: { konuId: string; adet: number }[] = [];
  for (const b of AYT_OSYM_SEED_BLOKLAR) {
    out.push(...aytKonuBul(yks, b.ders, b.adet, b.bulOpts));
  }
  return out;
}

export function lgsSablonSatirlari(konular: KonuSablonKaynak[]): { konuId: string; adet: number }[] {
  const lgs = konular.filter((k) => String(k.ogretimTuru ?? '').trim().toUpperCase() === 'LGS');
  const out: { konuId: string; adet: number }[] = [];
  for (const { ders, adet } of LGS_OSYM_DERS_ADET) {
    out.push(...dersKonularinaEsitDagit(lgs, ders, adet, { ogretimTuru: 'LGS' }));
  }
  return out;
}

/** KPSS Genel Yetenek + Genel Kültür — ÖSYM 120 soru dağılımı */
export const KPSS_OSYM_DERS_ADET: { ders: string; adet: number }[] = [
  { ders: 'Türkçe', adet: 30 },
  { ders: 'Matematik', adet: 30 },
  { ders: 'Tarih', adet: 27 },
  { ders: 'Coğrafya', adet: 18 },
  { ders: 'Vatandaşlık', adet: 9 },
  { ders: 'Güncel Bilgiler', adet: 6 },
];

export function kpssSablonSatirlari(konular: KonuSablonKaynak[]): { konuId: string; adet: number }[] {
  const kpss = konular.filter(
    (k) =>
      k.ogretimTuru === 'KPSS_LISANS' ||
      k.ogretimTuru === 'KPSS_ONLISANS' ||
      k.ogretimTuru === 'KPSS_ORTAOGRETIM',
  );
  const havuz = kpss.length > 0 ? kpss : konular.filter((k) => ogretimTuruYksMi(k));
  const ogretim = kpss.length > 0 ? 'KPSS_ONLISANS' : 'YKS';
  const out: { konuId: string; adet: number }[] = [];
  for (const { ders, adet } of KPSS_OSYM_DERS_ADET) {
    out.push(...dersKonularinaEsitDagit(havuz, ders, adet, { ogretimTuru: ogretim }));
  }
  return out;
}

export function sablonToplamSoru(satirlar: { adet: number }[]): number {
  return satirlar.reduce((a, r) => a + r.adet, 0);
}
