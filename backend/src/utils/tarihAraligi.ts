/** YYYY-MM-DD → gün başlangıcı (yerel saat) */
export function gunBaslangici(isoGun: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoGun)) return null;
  const [y, m, d] = isoGun.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** YYYY-MM-DD → gün sonu (yerel saat) */
export function gunSonu(isoGun: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoGun)) return null;
  const [y, m, d] = isoGun.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** Soru `olusturuldu` alanı için Prisma tarih filtresi */
export function soruOlusturulduAraligi(
  baslangicTarihi?: unknown,
  bitisTarihi?: unknown,
): { olusturuldu?: { gte?: Date; lte?: Date } } {
  const baslangic =
    typeof baslangicTarihi === 'string' && baslangicTarihi.trim()
      ? gunBaslangici(baslangicTarihi.trim())
      : null;
  const bitis =
    typeof bitisTarihi === 'string' && bitisTarihi.trim()
      ? gunSonu(bitisTarihi.trim())
      : null;

  if (!baslangic && !bitis) return {};

  const olusturuldu: { gte?: Date; lte?: Date } = {};
  if (baslangic) olusturuldu.gte = baslangic;
  if (bitis) olusturuldu.lte = bitis;
  return { olusturuldu };
}
