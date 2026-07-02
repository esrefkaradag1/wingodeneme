/** Sınav türü — Prisma SinavTuru ile uyumlu */
export type SinavTur = 'TYT' | 'AYT' | 'AYT_TYT' | 'LGS' | 'KPSS';

export const SINAV_TUR_ETIKET: Record<SinavTur, string> = {
  TYT: 'TYT',
  AYT: 'AYT',
  AYT_TYT: 'AYT + TYT',
  LGS: 'LGS',
  KPSS: 'KPSS',
};

export function sinavTurEtiketi(tur: string): string {
  return SINAV_TUR_ETIKET[tur as SinavTur] ?? tur;
}

export function isAytSinav(tur: string): boolean {
  return tur === 'AYT' || tur === 'AYT_TYT';
}

export function isYksKitapcik(tur: string): boolean {
  return tur === 'TYT' || isAytSinav(tur);
}

/** Kitapçık / şablon mantığında AYT ile aynı davran */
export function kitapcikTuru(tur: string): 'TYT' | 'AYT' | 'LGS' | string {
  if (tur === 'AYT_TYT') return 'AYT';
  return tur;
}

/** TYT konu listesinin sınava dahil edilip edilmeyeceği */
export function tytKonulariDahil(tur: string): boolean {
  return tur === 'AYT_TYT';
}

/** Konu seçicide öne çıkarılacak kapsam; AYT+TYT’de ikisi de serbest */
export function konuSeciciOncelikliKapsam(tur: string): 'TYT' | 'AYT' | null {
  if (tur === 'TYT') return 'TYT';
  if (tur === 'AYT') return 'AYT';
  return null;
}

type KonuKaynak = {
  id?: string;
  ders?: string | null;
  yksSegment?: string | null;
};

/**
 * AYT sınavı için konu listesi: AYT üniteleri + (isteğe bağlı) TYT havuzu.
 * AYT: yalnızca Edebiyat ve Din (TYT segmenti) — eski davranış.
 * AYT_TYT: tüm TYT segment konuları (ÖSYM TD+SB-1 vb. için).
 */
export function yksAytKonulariBirlestir<T extends KonuKaynak>(
  aytListe: T[],
  tytListe: T[],
  tur: string,
): T[] {
  const byId = new Map<string, T>();
  for (const k of aytListe) {
    const id = String(k.id ?? '');
    if (id) byId.set(id, k);
  }

  const tumTyt = tytKonulariDahil(tur);

  for (const k of tytListe) {
    const id = String(k.id ?? '');
    if (!id || byId.has(id)) continue;

    const seg = String(k.yksSegment ?? '')
      .trim()
      .toUpperCase();
    if (seg !== 'TYT') continue;

    if (tumTyt) {
      byId.set(id, k);
      continue;
    }

    const ders = String(k.ders ?? '').trim();
    if (ders === 'Edebiyat' || ders === 'Din Kültürü ve Ahlak Bilgisi') {
      byId.set(id, k);
    }
  }

  return [...byId.values()];
}
