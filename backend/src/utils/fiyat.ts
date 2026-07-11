/** Fiyat girişini parse eder ve 2 ondalık basamağa yuvarlar (899,90 → 899.9 değil 899.9 DB'de ama doğru kayıt) */
export function fiyatYuvarla(deger: unknown): number {
  if (deger == null || deger === '') return 0;
  const s = String(deger).trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
