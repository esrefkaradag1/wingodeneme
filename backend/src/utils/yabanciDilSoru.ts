/** Yabancı dil derslerinde soru üretim/düzenleme dili yönergeleri */

export type SoruUretimDili = 'tr' | 'en' | 'de' | 'fr';

const YABANCI_DIL_DERSLERI: Record<string, SoruUretimDili> = {
  ingilizce: 'en',
  english: 'en',
  almanca: 'de',
  german: 'de',
  fransizca: 'fr',
  'fransızca': 'fr',
  french: 'fr',
};

export function soruUretimDili(ders?: string | null): SoruUretimDili {
  const d = String(ders || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  for (const [anahtar, dil] of Object.entries(YABANCI_DIL_DERSLERI)) {
    if (d.includes(anahtar)) return dil;
  }
  return 'tr';
}

export function yabanciDilDersiMi(ders?: string | null): boolean {
  return soruUretimDili(ders) !== 'tr';
}

export function soruUretimDiliEtiketi(dil: SoruUretimDili): string {
  switch (dil) {
    case 'en':
      return 'English';
    case 'de':
      return 'German';
    case 'fr':
      return 'French';
    default:
      return 'Turkish';
  }
}

/** Metin üretim promptlarına eklenecek dil kuralı */
export function soruUretimDiliYonergesi(ders?: string | null): string {
  const dil = soruUretimDili(ders);
  if (dil === 'en') {
    return `🌐 LANGUAGE (MANDATORY):
- Question stem, ALL options (A–D/E), kazanim and cozumAciklamasi MUST be in ENGLISH.
- Do NOT translate to Turkish. Match MEB/YÖK English exam style (LGS/YKS foreign language papers).
- Keep names, dialogue and reading passage tone natural for secondary-school English exams.`;
  }
  if (dil === 'de') {
    return `🌐 SPRACHE: Frage, alle Antwortoptionen und cozumAciklamasi auf DEUTSCH (Almanca dersi). Türkçe YASAK.`;
  }
  if (dil === 'fr') {
    return `🌐 LANGUE: Question, options et cozumAciklamasi en FRANÇAIS. Turc INTERDIT.`;
  }
  return '';
}

/** Referans tabanlı üretim için dil kuralı (KURALLAR bloğu) */
export function referansDilKurali(ders?: string | null, sikAraligi = 'A–E'): string {
  const dil = soruUretimDili(ders);
  if (dil === 'en') {
    return `- ALL text in ENGLISH only (${sikAraligi}, single correct answer). Turkish in stem/options is FORBIDDEN.
- Mirror the reference FORMAT: dialogue stays dialogue, table→table, picture description→same layout type.
- Preserve exam booklet style (instructions like "Look at the picture…", "According to…").`;
  }
  if (dil !== 'tr') {
    return `- Soru metni ve şıklar ${soruUretimDiliEtiketi(dil)} dilinde olmalı; Türkçe YASAK. ${sikAraligi}, tek doğru.`;
  }
  return `- Türkçe, ${sikAraligi}, tek doğru`;
}

export const INGILIZCE_SVG_YONERGESI = `
ENGLISH VISUAL / LAYOUT (dialogue, table, speech bubbles — MANDAT when reference has them):
- viewBox="0 0 800 420" for multi-character layouts; preserveAspectRatio="xMidYMid meet".
- TABLE: draw a real grid with <rect> cells (header row shaded), row/column labels; NOT a single circle or placeholder shape.
- SPEECH BUBBLES: rounded <rect rx="12"> + small tail <path>; place bubbles ABOVE each character with ≥130px horizontal gap.
- CHARACTERS: simple circle head (r=28–32) + name label below (font-size 13); max 4 in one row; bubbles must NOT overlap.
- Bubble text: use <text> with multiple <tspan x="..." dy="16"> lines; max ~12 words per bubble; font-size 12–14.
- If reference shows photos/illustrations, use clean schematic (circles + labels + bubbles), not random overlapping text.
- Labels in English; align text-anchor="middle" for centered bubbles.`;

export const TABLO_SVG_YONERGESI = `
TABLO / GRID SORULARI (ZORUNLU — tek daire/kutu YASAK):
- Referansta tablo varsa svgGorsel içinde satır/sütunlu grid çiz (<rect> hücreler, başlık satırı koyu ton).
- Hücre metinleri kısa; font-size 12–14; hücre içinde en az 8px padding.
- Tablo genişliği viewBox içinde ortalanmış; soru kökünde "in the table" / "tabloda" atıfı kullan.`;
