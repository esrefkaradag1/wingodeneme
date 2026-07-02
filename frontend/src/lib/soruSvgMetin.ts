/** Soru metnindeki inline SVG bloğunu ayırır / birleştirir */

const SVG_BLOK_RE = /<div class="soru-svg-gorsel"[^>]*>([\s\S]*?)<\/div>/i;

export function metinHtmlSvgAyir(metinHtml: string): { metin: string; svg: string | null } {
  const ham = String(metinHtml || '');
  const m = ham.match(SVG_BLOK_RE);
  if (!m) return { metin: ham.trim(), svg: null };
  const metin = ham.replace(SVG_BLOK_RE, '').trim();
  const svgMatch = m[1].match(/<svg[\s\S]*?<\/svg>/i);
  return { metin, svg: svgMatch ? svgMatch[0].trim() : m[1].trim() || null };
}

export function metinHtmlSvgBirlestir(metinHtml: string, svg?: string | null): string {
  const { metin } = metinHtmlSvgAyir(metinHtml);
  const svgHam = String(svg || '').trim();
  if (!svgHam) return metin;
  const svgGovde = /<svg/i.test(svgHam) ? svgHam : svgHam;
  return `${metin}${metin ? '\n' : ''}<div class="soru-svg-gorsel">${svgGovde}</div>`.trim();
}
