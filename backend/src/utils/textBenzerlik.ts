/**
 * Soru kökü benzerliği — kelime kümesi Jaccard (HTML ve noktalama normalize).
 * Tam kopya tespiti değil; hızlı banka içi özgünlük taraması.
 */

export function metinNormalizeHam(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;/gi, ' ')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Anlamlı kelimeler (çok kısa gürültü kelimeler elenir) */
export function metinKelimeKumesi(html: string): Set<string> {
  const n = metinNormalizeHam(html);
  const kelimeler = n.split(/\s+/).filter((w) => w.length > 2);
  return new Set(kelimeler);
}

export function jaccardKume(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let kesisim = 0;
  for (const x of a) {
    if (b.has(x)) kesisim += 1;
  }
  const birlesim = a.size + b.size - kesisim;
  return birlesim === 0 ? 0 : kesisim / birlesim;
}

export function jaccardMetinler(htmlA: string, htmlB: string): number {
  return jaccardKume(metinKelimeKumesi(htmlA), metinKelimeKumesi(htmlB));
}
