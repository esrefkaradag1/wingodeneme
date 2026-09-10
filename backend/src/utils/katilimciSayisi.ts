/** Gösterilecek katılımcı sayısı: manuel değer varsa (gerçekten az olmamak üzere) onu kullanır. */
export function efektifKatilimciSayisi(
  gosterilen: number | null | undefined,
  gercek: number
): number {
  const gercekSayi = Math.max(0, Math.floor(gercek) || 0);
  if (typeof gosterilen === 'number' && Number.isFinite(gosterilen) && gosterilen >= 0) {
    return Math.max(Math.floor(gosterilen), gercekSayi);
  }
  return gercekSayi;
}

export function parseKatilimciSayisi(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}
