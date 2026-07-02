export const ACIKLAMA_OPEN = '<!--WINGO:ACIKLAMA-->';
export const ACIKLAMA_CLOSE = '<!--/WINGO:ACIKLAMA-->';
export const COZUM_OPEN = '<!--WINGO:COZUM-->';
export const COZUM_CLOSE = '<!--/WINGO:COZUM-->';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseMetinParcalari(metinHtml: string): { soruHtml: string; aciklamaHtml: string; cozumHtml: string } {
  const src = String(metinHtml || '');
  const extract = (open: string, close: string) => {
    const re = new RegExp(`${escapeRegExp(open)}([\\s\\S]*?)${escapeRegExp(close)}`, 'i');
    const m = src.match(re);
    return (m?.[1] || '').trim();
  };
  const aciklamaHtml = extract(ACIKLAMA_OPEN, ACIKLAMA_CLOSE);
  const cozumHtml = extract(COZUM_OPEN, COZUM_CLOSE);
  const temiz = src
    .replace(new RegExp(`${escapeRegExp(ACIKLAMA_OPEN)}[\\s\\S]*?${escapeRegExp(ACIKLAMA_CLOSE)}`, 'gi'), '')
    .replace(new RegExp(`${escapeRegExp(COZUM_OPEN)}[\\s\\S]*?${escapeRegExp(COZUM_CLOSE)}`, 'gi'), '')
    .trim();
  return { soruHtml: temiz, aciklamaHtml, cozumHtml };
}

export function buildMetinHtmlFromParts(soruHtml: string, aciklamaHtml: string, cozumHtml: string): string {
  const base = String(soruHtml || '').trim();
  const blocks: string[] = [];
  const a = String(aciklamaHtml || '').trim();
  const c = String(cozumHtml || '').trim();
  if (a) blocks.push(`${ACIKLAMA_OPEN}\n${a}\n${ACIKLAMA_CLOSE}`);
  if (c) blocks.push(`${COZUM_OPEN}\n${c}\n${COZUM_CLOSE}`);
  if (blocks.length === 0) return base;
  return [base, ...blocks].filter(Boolean).join('\n\n');
}

/** Kitapçık / sınav ekranında yalnızca soru gövdesi (açıklama ve çözüm hariç) */
export function soruGorunurHtml(metinHtml: string): string {
  const { soruHtml } = parseMetinParcalari(metinHtml);
  return soruHtml || String(metinHtml || '').trim();
}

