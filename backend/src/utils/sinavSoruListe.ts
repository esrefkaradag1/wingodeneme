import { Prisma, SoruOnayDurumu } from '@prisma/client';
import { prisma } from '../config/database';

type DbClient = Prisma.TransactionClient | typeof prisma;

export type SinavSoruListeSecenek = {
  /** Yalnızca onaylı satırlar */
  sadeceOnayli?: boolean;
  /** Öğrenci kitapçığı: reddedilenler hariç, bekleyenler dahil (admin önizlemesiyle aynı set) */
  yayindaki?: boolean;
  /** Prisma select (varsayılan: tüm alanlar + konu özeti) */
  select?: Prisma.SoruSelect;
  include?: Prisma.SoruInclude;
};

function soruOnayKosulu(opts?: {
  sadeceOnayli?: boolean;
  yayindaki?: boolean;
}): Prisma.SoruWhereInput {
  if (opts?.sadeceOnayli) return { onayDurumu: SoruOnayDurumu.ONAYLANDI };
  if (opts?.yayindaki) return { onayDurumu: { not: SoruOnayDurumu.REDDEDILDI } };
  return {};
}

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
  opts?: { sadeceOnayli?: boolean; yayindaki?: boolean },
): Promise<Set<string>> {
  const onay = soruOnayKosulu(opts);
  const paylasimOnay = opts?.sadeceOnayli
    ? {
        onayDurumu: SoruOnayDurumu.ONAYLANDI,
        soru: { onayDurumu: { not: SoruOnayDurumu.REDDEDILDI } },
      }
    : opts?.yayindaki
      ? {
          onayDurumu: { not: SoruOnayDurumu.REDDEDILDI },
          soru: { onayDurumu: { not: SoruOnayDurumu.REDDEDILDI } },
        }
      : {};
  const [birincil, paylasim] = await Promise.all([
    db.soru.findMany({
      where: { sinavId, ...onay },
      select: { id: true },
    }),
    db.sinavSoru.findMany({
      where: { sinavId, ...paylasimOnay },
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
  opts?: { sadeceOnayli?: boolean; yayindaki?: boolean },
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
  const birincilWhere: Prisma.SoruWhereInput = {
    sinavId,
    ...soruOnayKosulu(opts),
  };

  const paylasimWhere: Prisma.SinavSoruWhereInput = {
    sinavId,
    ...(opts.sadeceOnayli
      ? {
          onayDurumu: SoruOnayDurumu.ONAYLANDI,
          soru: { onayDurumu: { not: SoruOnayDurumu.REDDEDILDI } },
        }
      : opts.yayindaki
        ? {
            onayDurumu: { not: SoruOnayDurumu.REDDEDILDI },
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
