export function sureMsToMetin(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return '—';
  const sn = Math.round(ms / 1000);
  if (sn < 60) return `${sn} sn`;
  const dk = Math.floor(sn / 60);
  const kalan = sn % 60;
  return kalan > 0 ? `${dk} dk ${kalan} sn` : `${dk} dk`;
}

export function saniyeToMetin(sn: number): string {
  if (sn < 60) return `${sn} sn`;
  const dk = Math.floor(sn / 60);
  const kalan = sn % 60;
  return kalan > 0 ? `${dk}:${String(kalan).padStart(2, '0')}` : `${dk} dk`;
}
