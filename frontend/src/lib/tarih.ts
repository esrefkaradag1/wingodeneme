/** datetime-local input için ISO / tarih string → yyyy-MM-ddTHH:mm (yerel) */
export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * datetime-local değerine (yerel saat) dakika ekler; yine datetime-local formatında döner.
 * Boş / geçersiz girişte '' döner.
 */
export function datetimeLocalEkleDakika(datetimeLocal: string, dakika: number): string {
  if (!datetimeLocal?.trim() || !Number.isFinite(dakika)) return '';
  const d = new Date(datetimeLocal);
  if (Number.isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() + Math.max(0, Math.floor(dakika)));
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
