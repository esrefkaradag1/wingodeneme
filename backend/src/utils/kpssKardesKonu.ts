import { OgretimTuru } from '@prisma/client';
import { prisma } from '../config/database';
import { KPSS_TUM_TURLER, kpssOgretimTuruMu } from './grupOgretimTuru';

/** GY+GK konu ağacı kademeler arasında paylaşılır (aynı ders + konu adı). */
const KPSS_PAYLASIM_TURLERI: OgretimTuru[] = KPSS_TUM_TURLER.filter(
  (t) => t !== OgretimTuru.KPSS,
);

export function kpssPaylasimliTurMu(tur?: string | null): boolean {
  return Boolean(tur && (tur === OgretimTuru.KPSS || kpssOgretimTuruMu(tur)));
}

/**
 * Verilen konunun KPSS kardeşlerini (aynı ders + ad, diğer kademeler) döner.
 * KPSS değilse yalnızca kendisini döner.
 */
export async function kpssKardesKonuIds(konuId: string): Promise<string[]> {
  const konu = await prisma.konu.findUnique({
    where: { id: konuId },
    select: { id: true, ders: true, ad: true, ogretimTuru: true },
  });
  if (!konu) return [konuId];
  if (!kpssPaylasimliTurMu(konu.ogretimTuru)) return [konu.id];

  const kardesler = await prisma.konu.findMany({
    where: {
      ders: konu.ders,
      ad: konu.ad,
      ogretimTuru: { in: KPSS_PAYLASIM_TURLERI },
    },
    select: { id: true },
  });
  const ids = [...new Set(kardesler.map((k) => k.id))];
  return ids.length > 0 ? ids : [konu.id];
}

/** Konu-bazlı sayaç map'inde KPSS kardeş sayılarını birleştirir (her kardeş id'ye toplam yazılır). */
export async function kpssKardesSayilariBirlestir(
  map: Record<string, number>,
): Promise<Record<string, number>> {
  const konuIds = Object.keys(map);
  if (konuIds.length === 0) return map;

  const konular = await prisma.konu.findMany({
    where: {
      id: { in: konuIds },
      ogretimTuru: { in: KPSS_PAYLASIM_TURLERI },
    },
    select: { id: true, ders: true, ad: true },
  });
  if (konular.length === 0) return map;

  const grupAnahtar = (ders: string, ad: string) => `${ders}\0${ad}`;
  const gruplar = new Map<string, string[]>();
  for (const k of konular) {
    const key = grupAnahtar(k.ders, k.ad);
    const liste = gruplar.get(key) ?? [];
    liste.push(k.id);
    gruplar.set(key, liste);
  }

  // Kardeşler map'te olmayabilir (0 sorulu kademe) — tüm KPSS ağacından tamamla
  const tumKpss = await prisma.konu.findMany({
    where: { ogretimTuru: { in: KPSS_PAYLASIM_TURLERI } },
    select: { id: true, ders: true, ad: true },
  });
  for (const k of tumKpss) {
    const key = grupAnahtar(k.ders, k.ad);
    const liste = gruplar.get(key);
    if (!liste) continue;
    if (!liste.includes(k.id)) liste.push(k.id);
  }

  const out = { ...map };
  for (const ids of gruplar.values()) {
    const toplam = ids.reduce((s, id) => s + (map[id] ?? 0), 0);
    if (toplam <= 0) continue;
    for (const id of ids) {
      out[id] = toplam;
    }
  }
  return out;
}
