import { prisma } from '../config/database';

/** Tekil konuId veya çoklu konuIds → birincil + ek konu listesi */
export function konuIdListesiNormalize(
  konuId?: string | null,
  konuIds?: string[] | null
): string[] {
  const ham = [
    ...(Array.isArray(konuIds) ? konuIds : []),
    ...(typeof konuId === 'string' && konuId.trim() ? [konuId.trim()] : []),
  ];
  const benzersiz: string[] = [];
  const gorulen = new Set<string>();
  for (const id of ham) {
    const t = String(id || '').trim();
    if (!t || gorulen.has(t)) continue;
    gorulen.add(t);
    benzersiz.push(t);
  }
  return benzersiz;
}

/** Birincil konu dışındaki etiketleri günceller */
export async function soruEkKonulariKaydet(
  soruId: string,
  konuIds: string[],
  primaryKonuId: string
): Promise<void> {
  const ekIds = konuIds.filter((id) => id !== primaryKonuId);
  await prisma.soruKonuEtiket.deleteMany({ where: { soruId } });
  if (ekIds.length === 0) return;
  await prisma.soruKonuEtiket.createMany({
    data: ekIds.map((konuId) => ({ soruId, konuId })),
    skipDuplicates: true,
  });
}

/** Konu filtresi: birincil veya ek etiket */
export function soruKonuFiltre(konuId: string) {
  return {
    OR: [
      { konuId },
      { ekKonular: { some: { konuId } } },
    ],
  };
}

import { OgretimTuru, YksKonuSegmenti } from '@prisma/client';
import { ogretimTuruPrismaFiltre } from './grupOgretimTuru';

/** TYT / AYT kapsam filtresi → konu.yksSegment */
export function yksSegmentKapsamFiltre(
  yksKapsam?: string,
): YksKonuSegmenti | { not: YksKonuSegmenti } | undefined {
  if (yksKapsam === 'TYT') return YksKonuSegmenti.TYT;
  if (yksKapsam === 'AYT') return { not: YksKonuSegmenti.TYT };
  return undefined;
}

/** Alan sekmesi (TYT, AYT, LGS, KPSS …) → konu where parçası */
export function alanKonuWhere(opts: {
  ogretimTuru?: OgretimTuru;
  yksKapsam?: string;
  ders?: string;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (opts.ogretimTuru) {
    where.ogretimTuru = ogretimTuruPrismaFiltre(opts.ogretimTuru);
  }
  const yksSeg = yksSegmentKapsamFiltre(opts.yksKapsam);
  if (yksSeg !== undefined) {
    where.yksSegment = yksSeg;
    if (!opts.ogretimTuru) where.ogretimTuru = OgretimTuru.YKS;
  }
  if (opts.ders) where.ders = opts.ders;
  return where;
}

/** Ders / öğretim türü filtresi: birincil veya ek konu */
export function soruKonuMetaFiltre(konuWhere: Record<string, unknown>) {
  return {
    OR: [
      { konu: konuWhere },
      { ekKonular: { some: { konu: konuWhere } } },
    ],
  };
}
