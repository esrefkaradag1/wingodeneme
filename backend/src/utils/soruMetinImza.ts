/** Soru metninden mükerrer tespiti için normalize imza üretir. */
export function soruMetinImzasi(metinHtml: string): string {
  return String(metinHtml ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function soruMetinImzasiGecerli(imza: string): boolean {
  return imza.length >= 24;
}
