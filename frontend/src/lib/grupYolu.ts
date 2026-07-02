/** Grup listesinden id → tam yol (Ana › Alt) haritası */
export function grupYoluHaritasi<T extends { id: string; ad: string; parentId?: string | null }>(
  liste: T[]
): Map<string, string> {
  const byId = new Map(liste.map((g) => [g.id, g]));
  const cache = new Map<string, string>();

  const yol = (id: string): string => {
    if (cache.has(id)) return cache.get(id)!;
    const g = byId.get(id);
    if (!g) return '';
    const ad = String(g.ad).trim();
    if (!g.parentId || !byId.has(g.parentId)) {
      cache.set(id, ad);
      return ad;
    }
    const tam = `${yol(g.parentId)} › ${ad}`;
    cache.set(id, tam);
    return tam;
  };

  for (const g of liste) yol(g.id);
  return cache;
}

/** Üstü pasif/silinmiş grupların yetim çocuklarını listeden çıkarır */
export function bagliGruplariFiltrele<T extends { id: string; parentId?: string | null; aktif?: boolean }>(
  liste: T[]
): T[] {
  const aktif = liste.filter((g) => g.aktif !== false);
  const aktifIdSet = new Set(aktif.map((g) => g.id));
  return aktif.filter((g) => !g.parentId || aktifIdSet.has(g.parentId));
}
