import { prisma } from '../config/database';
import { OgretimTuru } from '@prisma/client';
import { ogretimTurleriniGenislet } from './grupOgretimTuru';
import { soruKonuMetaFiltre } from './soruKonuEtiket';

export function uygunGrupIdsNormalize(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((x) => String(x).trim()).filter(Boolean))];
}

/** Sorunun uygun grup etiketlerini günceller (tam senkron) */
export async function soruUygunGruplariKaydet(soruId: string, grupIds: string[]): Promise<void> {
  const ids = uygunGrupIdsNormalize(grupIds);
  if (ids.length > 0) {
    const mevcut = await prisma.grup.findMany({
      where: { id: { in: ids }, aktif: true },
      select: { id: true },
    });
    const gecerli = mevcut.map((g) => g.id);
    if (gecerli.length !== ids.length) {
      throw new Error('Geçersiz veya pasif grup seçildi.');
    }
  }

  await prisma.$transaction([
    prisma.soruUygunGrup.deleteMany({ where: { soruId } }),
    ...(ids.length > 0
      ? [
          prisma.soruUygunGrup.createMany({
            data: ids.map((grupId) => ({ soruId, grupId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}

export const soruUygunGrupInclude = {
  uygunGruplar: {
    include: { grup: { select: { id: true, ad: true, tur: true } } },
  },
} as const;

/** Uygun grup etiketi üzerinden soru filtresi (ortak YKS↔KPSS soruları için) */
export function soruUygunGrupFiltre(opts: {
  turler: OgretimTuru[];
  grupAdIcerir?: string;
}): Record<string, unknown> {
  const expanded = ogretimTurleriniGenislet(opts.turler);
  const turFiltre = expanded.length === 1 ? expanded[0] : { in: expanded };
  const grupWhere: Record<string, unknown> = {
    aktif: true,
    tur: turFiltre,
  };
  if (opts.grupAdIcerir) {
    grupWhere.ad = { contains: opts.grupAdIcerir, mode: 'insensitive' };
  }
  return {
    uygunGruplar: {
      some: { grup: grupWhere },
    },
  };
}

/** Konu eşleşmesi VEYA uygun grup eşleşmesi — platform/alan listeleme */
export function soruListelemeKonuVeyaUygunGrupFiltre(opts: {
  konuWhere: Record<string, unknown>;
  uygunGrupTurleri: OgretimTuru[];
  grupAdIcerir?: string;
}): Record<string, unknown> {
  const { konuWhere, uygunGrupTurleri, grupAdIcerir } = opts;
  const konuKosul = soruKonuMetaFiltre(konuWhere);
  const grupKosul = soruUygunGrupFiltre({ turler: uygunGrupTurleri, grupAdIcerir });
  return { OR: [konuKosul, grupKosul] };
}

/**
 * Soru bankası alan/platform filtresi.
 * Ortak sorular (uygunGruplar: KPSS + YKS/TYT) her iki panelde de görünür.
 */
export function soruAlanFiltreKosulu(opts: {
  konuWhere: Record<string, unknown>;
  aktifTur?: OgretimTuru;
  yksKapsamStr?: string;
  platformTurleri?: OgretimTuru[];
}): Record<string, unknown> | undefined {
  const { konuWhere, aktifTur, yksKapsamStr, platformTurleri } = opts;
  const hasKonuWhere = Object.keys(konuWhere).length > 0;

  // Tümü sekmesi — platforma göre konu veya uygun grup
  if (!aktifTur && platformTurleri?.length) {
    const konuPlatform = hasKonuWhere ? konuWhere : { ogretimTuru: { in: platformTurleri } };
    return soruListelemeKonuVeyaUygunGrupFiltre({
      konuWhere: konuPlatform,
      uygunGrupTurleri: platformTurleri,
    });
  }

  // Alt sekme (TYT, KPSS Lisans, LGS …)
  if (aktifTur) {
    let grupAdIcerir: string | undefined;
    if (yksKapsamStr === 'TYT') grupAdIcerir = 'TYT';
    else if (yksKapsamStr === 'AYT') grupAdIcerir = 'AYT';
    return {
      OR: [
        soruKonuMetaFiltre(konuWhere),
        soruUygunGrupFiltre({ turler: [aktifTur], grupAdIcerir }),
      ],
    };
  }

  if (hasKonuWhere) return soruKonuMetaFiltre(konuWhere);
  return undefined;
}
