/**
 * ÖSYM tarzı fizik SVG kalite kontrolü ve seri devre şablonu.
 */

const LATEX_IN_SVG = /\$|\\frac|\\Omega|\\omega|\\sqrt|\\text\{/i;

/** Modelin sık yaptığı hatalı çıktı: tek kutu + "R" veya soru metnini köşeye yapıştırma */
export function fizikSvgZayifMi(svg: string, soruMetni?: string): boolean {
  const s = (svg || '').trim();
  if (s.length < 120) return true;
  if (LATEX_IN_SVG.test(s)) return true;

  const lineSay = (s.match(/<line\b/gi) || []).length;
  const rectSay = (s.match(/<rect\b/gi) || []).length;
  const pathSay = (s.match(/<path\b/gi) || []).length;
  const textSay = (s.match(/<text\b/gi) || []).length;
  const textIcerik = [...s.matchAll(/<text[^>]*>([^<]*)<\/text>/gi)].map((m) => m[1].trim());

  if (lineSay < 2 && pathSay < 2) return true;

  if (rectSay === 1 && textIcerik.length <= 2 && textIcerik.every((t) => /^R\d?$/i.test(t) || t.length <= 2)) {
    return true;
  }

  const esittirSay = textIcerik.filter((t) => t.includes('=')).length;
  if (esittirSay >= 3) return true;

  if (textIcerik.join(' ').length > 80 && esittirSay >= 2) return true;

  const metin = (soruMetni || '').replace(/<[^>]+>/g, ' ');
  if (/devre|direnç|pil|akım/i.test(metin) && lineSay < 3 && rectSay < 2) return true;

  return false;
}

export function devreSorusuMu(metin: string): boolean {
  const t = metin.replace(/<[^>]+>/g, ' ').toLowerCase();
  return /devre|direnç|direnc|pil|akım|akim|volt|ohm|ω|seri\s+bağ|paralel\s+bağ/.test(t);
}

export function seriDevreSorusuMu(metin: string): boolean {
  const t = metin.replace(/<[^>]+>/g, ' ');
  const rSay = (t.match(/R\s*_?\s*\d+\s*=\s*\d+/gi) || []).length;
  return devreSorusuMu(metin) && (rSay >= 2 || /seri/i.test(t));
}

/** Soru metninden seri devre SVG (ÖSYM şematik stil) */
export function seriDevreSvgSablonuOlustur(metin: string): string | null {
  const t = metin.replace(/<[^>]+>/g, ' ');
  const direncler: { label: string }[] = [];
  for (const m of t.matchAll(/R\s*_?\s*(\d+)\s*=\s*(\d+)\s*/gi)) {
    direncler.push({ label: `R${m[1]}` });
  }
  if (direncler.length < 2) return null;

  const vMatch = t.match(/(\d+(?:[.,]\d+)?)\s*V(?:olt)?/i);
  const volt = vMatch ? vMatch[1].replace(',', '.') : '';

  const n = Math.min(direncler.length, 4);
  let x = 50;
  const y = 200;
  const parcalar: string[] = [];

  parcalar.push(`<line x1="${x}" y1="${y}" x2="${x + 28}" y2="${y}" stroke="#111827" stroke-width="2"/>`);
  x += 32;
  parcalar.push(`<line x1="${x}" y1="${y - 18}" x2="${x}" y2="${y + 18}" stroke="#111827" stroke-width="3"/>`);
  parcalar.push(`<line x1="${x + 12}" y1="${y - 12}" x2="${x + 12}" y2="${y + 12}" stroke="#111827" stroke-width="2"/>`);
  x += 28;
  if (volt) {
    parcalar.push(
      `<text x="42" y="${y + 38}" font-size="14" fill="#111827" text-anchor="start">${volt} V</text>`
    );
  }

  for (let i = 0; i < n; i++) {
    parcalar.push(`<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#111827" stroke-width="2"/>`);
    x += 22;
    parcalar.push(
      `<rect x="${x}" y="${y - 16}" width="48" height="32" fill="#dbeafe" stroke="#111827" stroke-width="2" rx="2"/>`
    );
    parcalar.push(
      `<text x="${x + 24}" y="${y + 6}" font-size="14" text-anchor="middle" fill="#111827">${direncler[i].label}</text>`
    );
    x += 48;
    parcalar.push(`<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#111827" stroke-width="2"/>`);
    x += 22;
  }

  parcalar.push(`<line x1="${x}" y1="${y - 10}" x2="${x}" y2="${y + 10}" stroke="#111827" stroke-width="2"/>`);
  parcalar.push(`<line x1="${x + 14}" y1="${y - 10}" x2="${x + 14}" y2="${y + 10}" stroke="#111827" stroke-width="2"/>`);

  return `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;max-height:360px;display:block;margin:0 auto;">${parcalar.join('')}</svg>`;
}

/** Prompt’a eklenecek ÖSYM seri devre örneği */
export const OSYM_SERI_DEVRE_SVG_ORNEK = `
ÖRNEK — Seri devre (bunu referans al, verileri soruya göre değiştir):
<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <line x1="50" y1="200" x2="78" y2="200" stroke="#111827" stroke-width="2"/>
  <line x1="82" y1="182" x2="82" y2="218" stroke="#111827" stroke-width="3"/>
  <line x1="94" y1="188" x2="94" y2="212" stroke="#111827" stroke-width="2"/>
  <text x="42" y="238" font-size="14" fill="#111827">12 V</text>
  <line x1="106" y1="200" x2="128" y2="200" stroke="#111827" stroke-width="2"/>
  <rect x="128" y="184" width="48" height="32" fill="#dbeafe" stroke="#111827" stroke-width="2"/>
  <text x="152" y="206" font-size="14" text-anchor="middle" fill="#111827">R1</text>
  <line x1="176" y1="200" x2="198" y2="200" stroke="#111827" stroke-width="2"/>
  <rect x="198" y="184" width="48" height="32" fill="#dbeafe" stroke="#111827" stroke-width="2"/>
  <text x="222" y="206" font-size="14" text-anchor="middle" fill="#111827">R2</text>
  <line x1="246" y1="200" x2="268" y2="200" stroke="#111827" stroke-width="2"/>
  <rect x="268" y="184" width="48" height="32" fill="#dbeafe" stroke="#111827" stroke-width="2"/>
  <text x="292" y="206" font-size="14" text-anchor="middle" fill="#111827">R3</text>
  <line x1="316" y1="200" x2="338" y2="200" stroke="#111827" stroke-width="2"/>
  <line x1="338" y1="190" x2="338" y2="210" stroke="#111827" stroke-width="2"/>
  <line x1="352" y1="190" x2="352" y2="210" stroke="#111827" stroke-width="2"/>
</svg>
`;

export const OSYM_FIZIK_SVG_YASAK = `
⛔ SVG İÇİNDE YASAK:
- Soru metnini veya "R1=4 Ω, R2=6..." gibi uzun cümleleri şeklin içine/köşesine yazmak
- LaTeX ($, \\Omega, \\frac) — yalnızca düz metin: "R1", "12 V", "4 Ω"
- Tek büyük kutu içinde sadece "R" harfi (devre değil)
- Dekoratif boş dikdörtgen; bağlantı çizgisi (wire) olmadan direnç kutusu
`;

/** Zayıf SVG için model yeniden üretim prompt’u (soru metni + şıklar dışarıdan eklenir) */
export function fizikSvgYenidenUretEk(): string {
  return `
⚡ FİZİK DEVRE/ŞEMA — ÖNCEKİ ÇİZİM GEÇERSİZ (tek kutu "R", köşede veri yığını, LaTeX, bağlantısız kutu).
YENİDEN çiz: tam şematik devre veya konuya uygun diyagram.
${OSYM_FIZIK_DEVRE_KURAL}
`;
}

export const OSYM_FIZIK_DEVRE_KURAL = `
⚡ ELEKTRİK DEVRESİ (ÖSYM şematik):
- Yatay bağlantı hatları (<line>) ZORUNLU; pil: uzun-kısa dikey çizgi çifti; direnç: dikdörtgen (zigzag değil, ÖSYM kitapçığı dikdörtgen direnç).
- Her direnç sembolünün altında/üstünde yalnızca etiket: R1, R2, R3 (değerler soru metninde kalsın, svg'de tekrar etme veya sadece sembol).
- Seri devre: tek hat üzerinde pil → R1 → R2 → R3 → açık uç veya kapanış.
- Paralel devre: ortak hatlardan dallanan üç kol.
${OSYM_SERI_DEVRE_SVG_ORNEK}
${OSYM_FIZIK_SVG_YASAK}
`;
