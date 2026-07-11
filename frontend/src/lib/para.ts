/** Fiyat girişini (899,90 veya 899.90) sayıya çevirir; 2 ondalık basamağa yuvarlar */
export function fiyatParse(deger: string | number | null | undefined): number {
  if (deger == null || deger === '') return 0;
  const s = String(deger).trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** TL gösterimi — her zaman 2 ondalık (ör. 899,90) */
export function fiyatGoster(deger: number | null | undefined): string {
  const n = typeof deger === 'number' && Number.isFinite(deger) ? deger : 0;
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Form input değeri — type=number ile uyumlu noktalı 2 ondalık */
export function fiyatInputDeger(deger: number | null | undefined): string {
  if (deger == null || !Number.isFinite(deger)) return '';
  return (Math.round(deger * 100) / 100).toFixed(2);
}
