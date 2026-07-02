/** OpenRouter isteklerinde Node/undici'nin reddettiği non-ASCII başlık karakterlerini temizler. */
export function asciiHeaderValue(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

export function openrouterHttpHeaders(): Record<string, string> {
  const appUrl =
    asciiHeaderValue(process.env.APP_URL || 'https://wingodeneme.local') ||
    'https://wingodeneme.local';
  const appName =
    asciiHeaderValue(process.env.APP_NAME || 'Wingo Deneme') || 'Wingo Deneme';
  return {
    'HTTP-Referer': appUrl,
    'X-Title': appName,
  };
}
