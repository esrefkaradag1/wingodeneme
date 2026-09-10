import { Prisma, SoruOnayDurumu } from '@prisma/client';
import { prisma } from '../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

export type SinavSoruListeSecenek = {
  /** Öğrenci sınavı / teslim: yalnızca onaylı satırlar */
  sadeceOnayli?: boolean;
  /** Prisma select (varsayılan: tüm alanlar + konu özeti) */
  select?: Prisma.SoruSelect;
  include?: Prisma.SoruInclude;
};

export type SinavSoruListeOgesi = {
  id: string;
  siraNo: number;
  sinavId: string | null;
  konuId: string;
  metinHtml: string;
  gorselUrl: string | null;
  secenekler: Prisma.JsonValue;
  dogruCevap: string;
  zorluk: string;
  onayDurumu: SoruOnayDurumu;
  /** Bu sınavda paylaşım satırı mı (birincil sahiplik değil) */
  paylasimMi: boolean;
  [key: string]: unknown;
};

/** Sınavdaki birincil + paylaşılan soru id'leri */
export async function sinavSoruIdSeti(
  sinavId: string,
  db: DbClient = prisma,
  opts?: { sadeceOnayli?: boolean },
): Promise<Set<string>> {
  const sadeceOnayli = Boolean(opts?.sadeceOnayli);
  const [birincil, paylasim] = await Promise.all([
    db.soru.findMany({
      where: {
        sinavId,
        ...(sadeceOnayli ? { onayDurumu: SoruOnayDurumu.ONAYLANDI } : {}),
      },
      select: { id: true },
    }),
    db.sinavSoru.findMany({
      where: {
        sinavId,
        ...(sadeceOnayli
          ? {
              onayDurumu: SoruOnayDurumu.ONAYLANDI,
              soru: { onayDurumu: { not: SoruOnayDurumu.REDDEDILDI } },
            }
          : {}),
      },
      select: { soruId: true },
    }),
  ]);
  return new Set([...birincil.map((s) => s.id), ...paylasim.map((p) => p.soruId)]);
}

export async function sinavSoruMaxSira(sinavId: string, db: DbClient = prisma): Promise<number> {
  const [birincil, paylasim] = await Promise.all([
    db.soru.aggregate({ where: { sinavId }, _max: { siraNo: true } }),
    db.sinavSoru.aggregate({ where: { sinavId }, _max: { siraNo: true } }),
  ]);
  return Math.max(birincil._max.siraNo ?? 0, paylasim._max.siraNo ?? 0);
}

export async function sinavSoruSayisi(
  sinavId: string,
  db: DbClient = prisma,
  opts?: { sadeceOnayli?: boolean },
): Promise<number> {
  return (await sinavSoruIdSeti(sinavId, db, opts)).size;
}

/**
 * Sınav kitapçığındaki sorular: birincil sahiplik (Soru.sinavId) + SinavSoru paylaşımları.
 * Paylaşımda siraNo / onayDurumu SinavSoru satırından gelir.
 */
export async function sinavSorulariniGetir(
  sinavId: string,
  opts: SinavSoruListeSecenek = {},
  db: DbClient = prisma,
): Promise<SinavSoruListeOgesi[]> {
  const sadeceOnayli = Boolean(opts.sadeceOnayli);

  const birincilWhere: Prisma.SoruWhereInput = {
    sinavId,
    ...(sadeceOnayli ? { onayDurumu: SoruOnayDurumu.ONAYLANDI } : {}),
  };

  const paylasimWhere: Prisma.SinavSoruWhereInput = {
    sinavId,
    ...(sadeceOnayli
      ? {
          onayDurumu: SoruOnayDurumu.ONAYLANDI,
          soru: { onayDurumu: { not: SoruOnayDurumu.REDDEDILDI } },
        }
      : {}),
  };

  const defaultInclude: Prisma.SoruInclude = {
    konu: { select: { ad: true, ders: true } },
  };

  const [birinciller, paylasimlar] = await Promise.all([
    opts.select
      ? db.soru.findMany({ where: birincilWhere, select: { ...opts.select, id: true, siraNo: true } })
      : db.soru.findMany({
          where: birincilWhere,
          include: opts.include ?? defaultInclude,
        }),
    db.sinavSoru.findMany({
      where: paylasimWhere,
      select: {
        siraNo: true,
        onayDurumu: true,
        soru: opts.select
          ? { select: { ...opts.select, id: true, siraNo: true } }
          : { include: opts.include ?? defaultInclude },
      },
    }),
  ]);

  const map = new Map<string, SinavSoruListeOgesi>();

  for (const s of birinciller as Array<Record<string, unknown> & { id: string; siraNo: number }>) {
    map.set(s.id, {
      ...(s as unknown as SinavSoruListeOgesi),
      paylasimMi: false,
    });
  }

  for (const p of paylasimlar) {
    const soru = p.soru as Record<string, unknown> & { id: string; siraNo: number };
    if (map.has(soru.id)) continue;
    map.set(soru.id, {
      ...(soru as unknown as SinavSoruListeOgesi),
      siraNo: p.siraNo,
      onayDurumu: p.onayDurumu,
      paylasimMi: true,
    });
  }

  return [...map.values()].sort((a, b) => a.siraNo - b.siraNo);
}

/** Kaldırma sonrası birincil + paylaşım sıra numaralarını 1..n yapar */
export async function sinavSorulariniYenidenSirala(
  sinavId: string,
  db: DbClient,
): Promise<void> {
  const liste = await sinavSorulariniGetir(sinavId, {}, db);
  for (let i = 0; i < liste.length; i++) {
    const item = liste[i]!;
    const yeniSira = i + 1;
    if (item.paylasimMi) {
      await db.sinavSoru.update({
        where: { sinavId_soruId: { sinavId, soruId: item.id } },
        data: { siraNo: yeniSira },
      });
    } else {
      await db.soru.update({
        where: { id: item.id },
        data: { siraNo: yeniSira },
      });
    }
  }
}

/** Liste API'leri için _count.sorular + _count.soruAtamalari toplamı */
export function birlesikSoruSayisi(count: {
  sorular?: number;
  soruAtamalari?: number;
}): number {
  return (count.sorular ?? 0) + (count.soruAtamalari ?? 0);
}
