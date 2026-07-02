import { grupKonuOgretimTuru } from './grupOgretimTuru';
import type { SinavTur } from './sinav-tur';

export type GrupSecim = {
  id: string;
  ad: string;
  tur: string;
  parentId?: string | null;
};

export function grupTamYol(g: GrupSecim, byId: Map<string, GrupSecim>): string {
  const parcalar = [String(g.ad).trim()];
  let cur = g;
  const seen = new Set<string>([g.id]);
  while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.parentId)) {
    cur = byId.get(cur.parentId)!;
    seen.add(cur.id);
    parcalar.unshift(String(cur.ad).trim());
  }
  return parcalar.join(' › ');
}

export function grupSecenekListesi(gruplar: GrupSecim[]) {
  const byId = new Map(gruplar.map((g) => [g.id, g]));
  return gruplar
    .map((g) => ({
      id: g.id,
      label: grupTamYol(g, byId),
      grup: g,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
}

export function ustGrupListesi(gruplar: GrupSecim[]) {
  return gruplar
    .filter((g) => !g.parentId)
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

export function altGrupListesi(gruplar: GrupSecim[], ustGrupId: string) {
  if (!ustGrupId) return [];
  return gruplar
    .filter((g) => g.parentId === ustGrupId)
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

export function grupSecimindenId(ustGrupId: string, altGrupId: string): string {
  return altGrupId || ustGrupId;
}

export function grupIddenSecim(
  grupId: string,
  gruplar: GrupSecim[],
): { ustGrupId: string; altGrupId: string } {
  const g = gruplar.find((x) => x.id === grupId);
  if (!g) return { ustGrupId: '', altGrupId: '' };
  if (g.parentId) return { ustGrupId: g.parentId, altGrupId: g.id };
  return { ustGrupId: g.id, altGrupId: '' };
}

/** Grup adı/yolundan Prisma SinavTuru değeri türetir */
export function gruptanSinavTuru(grup: GrupSecim, gruplar: GrupSecim[]): SinavTur {
  const byId = new Map(gruplar.map((g) => [g.id, g]));
  const yol = grupTamYol(grup, byId);
  const metin = `${yol} ${grup.ad}`.toLocaleLowerCase('tr-TR');

  if (/ayt\s*\+\s*tyt|ayt_tyt|ayt ve tyt/.test(metin)) return 'AYT_TYT';
  if (/\btyt\b/.test(metin) && !/\bayt\b/.test(metin)) return 'TYT';
  if (/\bayt\b/.test(metin)) return 'AYT';

  const efektif = grupKonuOgretimTuru(grup, yol);
  if (efektif === 'LGS') return 'LGS';
  if (efektif === 'KPSS_ONLISANS' || efektif === 'KPSS_ORTAOGRETIM') return 'KPSS';
  if (metin.includes('kpss')) return 'KPSS';
  if (metin.includes('lgs')) return 'LGS';

  return 'TYT';
}

export function grupIdIcinEtiket(grupId: string, gruplar: GrupSecim[]): string {
  const g = gruplar.find((x) => x.id === grupId);
  if (!g) return '';
  const byId = new Map(gruplar.map((x) => [x.id, x]));
  return grupTamYol(g, byId);
}
