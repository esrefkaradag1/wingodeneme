import { parseMetinParcalari } from '@/lib/soru-metin-parcalari';

/** Eski kayıtlar: çözüm yalnızca aiMeta.cozumAciklamasi içinde olabilir */
export function cozumHtmlAiMetadan(aiMeta?: unknown): string {
  if (!aiMeta || typeof aiMeta !== 'object') return '';
  const raw = String((aiMeta as Record<string, unknown>).cozumAciklamasi || '').trim();
  if (!raw) return '';
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .split(/\n\s*\n/)
    .map((block) => {
      const esc = block
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
      return `<p>${esc}</p>`;
    })
    .join('');
}

export function soruCozumHtmlBirlestir(metinHtml: string, aiMeta?: unknown): string {
  const { cozumHtml } = parseMetinParcalari(metinHtml);
  if (cozumHtml) return cozumHtml;
  return cozumHtmlAiMetadan(aiMeta);
}

/** Düzenleme alanı için ham çözüm metni (aiMeta yedek) */
export function cozumDuzMetinAiMetadan(aiMeta?: unknown): string {
  if (!aiMeta || typeof aiMeta !== 'object') return '';
  return String((aiMeta as Record<string, unknown>).cozumAciklamasi || '').trim();
}

/** Şık / kısa metin: düz metni tek paragrafa sarar */
export function duzMetinHtmlSar(metin: string): string {
  const t = String(metin ?? '').trim();
  if (!t) return '<p class="text-gray-400">—</p>';
  if (/<[a-z][\s\S]*>/i.test(t)) return t;
  return `<p>${t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
}

export function soruListeOnMetin(metinHtml: string, max = 140): string {
  const { soruHtml } = parseMetinParcalari(metinHtml);
  const s = soruHtml || metinHtml;
  const plain = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}…`;
}
