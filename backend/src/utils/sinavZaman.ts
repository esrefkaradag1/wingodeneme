export function parseIsoTarih(raw: unknown, alanAdi: string): Date {
  if (raw == null || raw === '') {
    throw new Error(`${alanAdi} gerekli`);
  }
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${alanAdi} geçersiz tarih formatı`);
  }
  return d;
}
