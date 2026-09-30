/**
 * Word VML (`v:shape`) Chrome'da çizilmez; içindeki metin `position:absolute`
 * ile sayfanın sağ sütununa taşınıp başka sorunun üstüne biner.
 * Asıl soru metni normal akışta zaten durur.
 */
export function wordVmlTemizle(html: string): string {
  return String(html || '')
    .replace(/<v:shapetype\b[\s\S]*?<\/v:shapetype>/gi, '')
    .replace(/<v:shape\b[\s\S]*?<\/v:shape>/gi, '')
    .replace(/<\/?v:[a-z0-9]+\b[^>]*>/gi, '')
    .replace(/<\/?o:[a-z0-9]+\b[^>]*>/gi, '');
}
