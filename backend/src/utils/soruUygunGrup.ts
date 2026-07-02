import { prisma } from '../config/database';

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
