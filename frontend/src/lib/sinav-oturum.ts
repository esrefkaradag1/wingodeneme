import { datetimeLocalEkleDakika, isoToDatetimeLocal } from '@/lib/tarih';

export type SinavOturumForm = {
  kod: string;
  ad: string;
  baslangicZamani: string;
  bitisZamani: string;
  sureDakika: number;
  soruSayisi?: number;
};

export const LGS_OTURUM_ARA_DK = 45;

export const LGS_VARSAYILAN_OTURUMLAR: Omit<SinavOturumForm, 'baslangicZamani' | 'bitisZamani'>[] = [
  { kod: 'SOZEL', ad: 'Sözel bölüm', sureDakika: 75, soruSayisi: 50 },
  { kod: 'SAYISAL', ad: 'Sayısal bölüm', sureDakika: 80, soruSayisi: 40 },
];

/** KPSS: Genel Yetenek + Genel Kültür (yaygın 60+60 soru, 65+65 dk) */
export const KPSS_OTURUM_ARA_DK = 0;

export const KPSS_VARSAYILAN_OTURUMLAR: Omit<SinavOturumForm, 'baslangicZamani' | 'bitisZamani'>[] = [
  { kod: 'GY', ad: 'Genel Yetenek', sureDakika: 65, soruSayisi: 60 },
  { kod: 'GK', ad: 'Genel Kültür', sureDakika: 65, soruSayisi: 60 },
];

export function bosLgsOturumlari(): SinavOturumForm[] {
  return LGS_VARSAYILAN_OTURUMLAR.map((o) => ({
    ...o,
    baslangicZamani: '',
    bitisZamani: '',
  }));
}

export function bosKpssOturumlari(): SinavOturumForm[] {
  return KPSS_VARSAYILAN_OTURUMLAR.map((o) => ({
    ...o,
    baslangicZamani: '',
    bitisZamani: '',
  }));
}

export function parseOturumlarFromApi(raw: unknown): SinavOturumForm[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: SinavOturumForm[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const kod = typeof o.kod === 'string' ? o.kod : '';
    const ad = typeof o.ad === 'string' ? o.ad : '';
    if (!kod || !ad) continue;
    const sure = parseInt(String(o.sureDakika), 10);
    const soru = parseInt(String(o.soruSayisi), 10);
    out.push({
      kod,
      ad,
      baslangicZamani: o.baslangicZamani ? String(o.baslangicZamani).slice(0, 16).replace('T', 'T') : '',
      bitisZamani: o.bitisZamani ? String(o.bitisZamani).slice(0, 16).replace('T', 'T') : '',
      sureDakika: Math.max(1, Number.isFinite(sure) && sure > 0 ? sure : 1),
      ...(Number.isFinite(soru) && soru > 0 ? { soruSayisi: soru } : {}),
    });
  }
  return out.length > 0 ? out : null;
}

/** ISO veya datetime-local → datetime-local (yyyy-MM-ddTHH:mm) */
function toDatetimeLocal(value: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  return isoToDatetimeLocal(value);
}

export function oturumlarApiToForm(raw: unknown): SinavOturumForm[] | null {
  const parsed = parseOturumlarFromApi(raw);
  if (!parsed) return null;
  return parsed.map((o) => ({
    ...o,
    baslangicZamani: toDatetimeLocal(o.baslangicZamani),
    bitisZamani: toDatetimeLocal(o.bitisZamani),
  }));
}

export function lgsOturumlariSenkronize(
  oturumlar: SinavOturumForm[],
  degisenIndex: number,
  patch: Partial<SinavOturumForm>,
): SinavOturumForm[] {
  const yeni = oturumlar.map((o, i) => (i === degisenIndex ? { ...o, ...patch } : { ...o }));
  const sozelIdx = yeni.findIndex((o) => o.kod === 'SOZEL');
  const sayisalIdx = yeni.findIndex((o) => o.kod === 'SAYISAL');
  if (sozelIdx < 0) return yeni;

  const sozel = { ...yeni[sozelIdx] };
  if (sozel.baslangicZamani) {
    sozel.bitisZamani = datetimeLocalEkleDakika(sozel.baslangicZamani, sozel.sureDakika);
  }
  yeni[sozelIdx] = sozel;

  if (sayisalIdx < 0) return yeni;
  const sayisal = { ...yeni[sayisalIdx] };
  if (sozel.bitisZamani) {
    sayisal.baslangicZamani = datetimeLocalEkleDakika(sozel.bitisZamani, LGS_OTURUM_ARA_DK);
  }
  if (sayisal.baslangicZamani) {
    sayisal.bitisZamani = datetimeLocalEkleDakika(sayisal.baslangicZamani, sayisal.sureDakika);
  }
  yeni[sayisalIdx] = sayisal;
  return yeni;
}

/** KPSS: GY bitince ara, ardından GK başlar */
export function kpssOturumlariSenkronize(
  oturumlar: SinavOturumForm[],
  degisenIndex: number,
  patch: Partial<SinavOturumForm>,
): SinavOturumForm[] {
  const yeni = oturumlar.map((o, i) => (i === degisenIndex ? { ...o, ...patch } : { ...o }));
  const gyIdx = yeni.findIndex((o) => o.kod === 'GY');
  const gkIdx = yeni.findIndex((o) => o.kod === 'GK');
  if (gyIdx < 0) return yeni;

  const gy = { ...yeni[gyIdx] };
  if (gy.baslangicZamani) {
    gy.bitisZamani = datetimeLocalEkleDakika(gy.baslangicZamani, gy.sureDakika);
  }
  yeni[gyIdx] = gy;

  if (gkIdx < 0) return yeni;
  const gk = { ...yeni[gkIdx] };
  if (gy.bitisZamani) {
    gk.baslangicZamani = datetimeLocalEkleDakika(gy.bitisZamani, KPSS_OTURUM_ARA_DK);
  }
  if (gk.baslangicZamani) {
    gk.bitisZamani = datetimeLocalEkleDakika(gk.baslangicZamani, gk.sureDakika);
  }
  yeni[gkIdx] = gk;
  return yeni;
}

export function oturumlardanUstZaman(oturumlar: SinavOturumForm[]): {
  baslangicZamani: string;
  bitisZamani: string;
  sureDakika: number;
} | null {
  const dolu = oturumlar.filter((o) => o.baslangicZamani && o.bitisZamani);
  if (dolu.length === 0) return null;
  const baslangicZamani = dolu.reduce((min, o) =>
    !min || o.baslangicZamani < min ? o.baslangicZamani : min,
  dolu[0].baslangicZamani);
  const bitisZamani = dolu.reduce((max, o) => (!max || o.bitisZamani > max ? o.bitisZamani : max), dolu[0].bitisZamani);
  const sureDakika = dolu.reduce((top, o) => top + o.sureDakika, 0);
  return { baslangicZamani, bitisZamani, sureDakika };
}

export function oturumlarApiGovdesi(oturumlar: SinavOturumForm[]) {
  return oturumlar
    .filter((o) => o.baslangicZamani && o.bitisZamani)
    .map((o) => ({
      kod: o.kod,
      ad: o.ad,
      baslangicZamani: new Date(o.baslangicZamani).toISOString(),
      bitisZamani: new Date(o.bitisZamani).toISOString(),
      sureDakika: o.sureDakika,
      ...(o.soruSayisi ? { soruSayisi: o.soruSayisi } : {}),
    }));
}
