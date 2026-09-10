/** TC kimlik no doğrulama (Türkiye) */
export function tcKimlikNoNormalize(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

export function tcKimlikNoGecerliMi(v: unknown): boolean {
  const tc = tcKimlikNoNormalize(v);
  if (!/^[1-9][0-9]{10}$/.test(tc)) return false;
  const d = tc.split('').map((c) => parseInt(c, 10));
  const tek = d[0] + d[2] + d[4] + d[6] + d[8];
  const cift = d[1] + d[3] + d[5] + d[7];
  const dig10 = ((tek * 7 - cift) % 10 + 10) % 10;
  if (dig10 !== d[9]) return false;
  const dig11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return dig11 === d[10];
}

export function faturaProfilEksikMi(profil: {
  tcKimlikNo?: string | null;
  adres?: string | null;
  sehir?: string | null;
} | null | undefined): boolean {
  if (!profil) return true;
  const tc = tcKimlikNoNormalize(profil.tcKimlikNo);
  const adres = String(profil.adres || '').trim();
  const sehir = String(profil.sehir || '').trim();
  return !tcKimlikNoGecerliMi(tc) || adres.length < 5 || sehir.length < 2;
}
