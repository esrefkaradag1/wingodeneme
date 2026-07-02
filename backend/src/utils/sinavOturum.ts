export type SinavOturumKayit = {
  kod: string;
  ad: string;
  baslangicZamani: string;
  bitisZamani: string;
  sureDakika: number;
  soruSayisi?: number;
};

function toIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function dakikaEkle(iso: string, dakika: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + Math.max(0, Math.floor(dakika)));
  return d.toISOString();
}

/** Form / API gövdesinden oturum listesini doğrular; bitiş yoksa süreden hesaplar */
export function normalizeSinavOturumlar(raw: unknown): SinavOturumKayit[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const out: SinavOturumKayit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const kod = typeof o.kod === 'string' ? o.kod.trim() : '';
    const ad = typeof o.ad === 'string' ? o.ad.trim() : '';
    const baslangic = toIsoDate(o.baslangicZamani);
    if (!kod || !ad || !baslangic) continue;

    const sureRaw = parseInt(String(o.sureDakika), 10);
    const sureDakika = Math.max(1, Number.isFinite(sureRaw) && sureRaw > 0 ? sureRaw : 1);
    const bitis = toIsoDate(o.bitisZamani) ?? dakikaEkle(baslangic, sureDakika);
    const soruRaw = parseInt(String(o.soruSayisi), 10);
    const soruSayisi =
      Number.isFinite(soruRaw) && soruRaw > 0 ? Math.min(999, soruRaw) : undefined;

    out.push({
      kod,
      ad,
      baslangicZamani: baslangic,
      bitisZamani: bitis,
      sureDakika,
      ...(soruSayisi ? { soruSayisi } : {}),
    });
  }

  return out.length > 0 ? out : null;
}

/** Oturumlardan üst düzey başlangıç / bitiş / toplam sınav süresi (dk) türetir */
export function sinavZamanOzetFromOturumlar(oturumlar: SinavOturumKayit[]): {
  baslangicZamani: Date;
  bitisZamani: Date;
  sureDakika: number;
} {
  const baslangic = new Date(
    oturumlar.reduce(
      (min, o) => Math.min(min, new Date(o.baslangicZamani).getTime()),
      Number.POSITIVE_INFINITY,
    ),
  );
  const bitis = new Date(
    oturumlar.reduce(
      (max, o) => Math.max(max, new Date(o.bitisZamani).getTime()),
      Number.NEGATIVE_INFINITY,
    ),
  );
  const sureDakika = oturumlar.reduce((top, o) => top + o.sureDakika, 0);
  return { baslangicZamani: baslangic, bitisZamani: bitis, sureDakika };
}

export function parseKayitliOturumlar(raw: unknown): SinavOturumKayit[] | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return normalizeSinavOturumlar(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  return normalizeSinavOturumlar(raw);
}
