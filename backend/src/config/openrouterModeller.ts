/**
 * OpenRouter model kataloğu — varsayılan + DB'den yüklenen panel listesi.
 */
import { prisma } from './database';

export interface OpenRouterModelMeta {
  id: string;
  ad: string;
  renk: 'green' | 'blue' | 'orange' | 'purple' | 'gray';
  ikon: string;
  aciklama: string;
}

export interface OpenRouterModelKayit extends OpenRouterModelMeta {
  paneldeGoster: boolean;
  openrouterAd?: string;
  contextLength?: number;
  uretim?: number;
}

export interface OpenRouterModelAyar {
  sonSenkron: string | null;
  openrouterToplam: number;
  modeller: OpenRouterModelKayit[];
}

export const OPENROUTER_MODEL_AYAR_ANAHTAR = 'OPENROUTER_MODEL_AYAR';

export const VARSAYILAN_PANEL_MODELLER: OpenRouterModelKayit[] = [
  { id: 'openai/gpt-5.5', ad: 'GPT-5.5', renk: 'green', ikon: '🟢', aciklama: 'En yeni OpenAI — karmaşık soru, kod & uzun içerik', paneldeGoster: true },
  { id: 'google/gemini-3.1-pro-preview', ad: 'Gemini 3.1 Pro', renk: 'purple', ikon: '🟣', aciklama: 'Google frontier — görsel, grafik & çok adımlı akıl yürütme', paneldeGoster: true },
  { id: 'openai/gpt-5.2', ad: 'GPT-5.2', renk: 'green', ikon: '🟢', aciklama: 'Güçlü OpenAI — karmaşık soru & uzun içerik', paneldeGoster: true },
  { id: 'openai/gpt-5-mini', ad: 'GPT-5 mini', renk: 'green', ikon: '🟢', aciklama: 'Hızlı & dengeli — genel soru üretimi', paneldeGoster: true },
  { id: 'openai/gpt-4.1', ad: 'GPT-4.1', renk: 'green', ikon: '🟢', aciklama: 'Güvenilir genel model — mantık & içerik', paneldeGoster: true },
  { id: 'openai/gpt-4.1-mini', ad: 'GPT-4.1 mini', renk: 'green', ikon: '🟢', aciklama: 'Ekonomik & hızlı — toplu üretim', paneldeGoster: true },
  { id: 'openai/o4-mini', ad: 'o4-mini', renk: 'blue', ikon: '🔵', aciklama: 'İleri muhakeme — zor Matematik & Fizik', paneldeGoster: true },
  { id: 'anthropic/claude-sonnet-4.6', ad: 'Claude Sonnet 4.6', renk: 'orange', ikon: '🟠', aciklama: 'Doğal dil — Türkçe, İngilizce & sözel', paneldeGoster: true },
  { id: 'anthropic/claude-sonnet-4.5', ad: 'Claude Sonnet 4.5', renk: 'orange', ikon: '🟠', aciklama: 'Güçlü yazım & analiz — sözel branşlar', paneldeGoster: true },
  { id: 'anthropic/claude-haiku-4.5', ad: 'Claude Haiku 4.5', renk: 'orange', ikon: '🟠', aciklama: 'Hızlı sözel üretim — kısa metinler', paneldeGoster: true },
  { id: 'google/gemini-2.5-pro', ad: 'Gemini 2.5 Pro', renk: 'purple', ikon: '🟣', aciklama: 'Görsel okuma & grafik — Geometri', paneldeGoster: true },
  { id: 'google/gemini-2.5-flash', ad: 'Gemini 2.5 Flash', renk: 'purple', ikon: '🟣', aciklama: 'Hızlı görsel yorumlama', paneldeGoster: true },
  { id: 'deepseek/deepseek-chat-v3-0324', ad: 'DeepSeek V3', renk: 'gray', ikon: '⚪', aciklama: 'Alternatif genel model — çeşitli konular', paneldeGoster: true },
  { id: 'mistralai/mistral-large-2512', ad: 'Mistral Large 3', renk: 'gray', ikon: '⚪', aciklama: 'Alternatif — hızlı & uzun bağlam', paneldeGoster: true },
];

/** @deprecated — VARSAYILAN_PANEL_MODELLER kullanın */
export const OPENROUTER_PANEL_MODELLER: OpenRouterModelMeta[] = VARSAYILAN_PANEL_MODELLER.map(
  ({ paneldeGoster: _p, openrouterAd: _o, contextLength: _c, uretim: _u, ...m }) => m,
);

export const MODEL_SLUG_GUNCELLE: Record<string, string> = {
  'openai/gpt-4o': 'openai/gpt-4.1',
  'openai/gpt-4o-mini': 'openai/gpt-4.1-mini',
  'openai/gpt-5.2': 'openai/gpt-5.5',
  'openai/o3-mini': 'openai/o4-mini',
  'anthropic/claude-3.5-sonnet': 'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.7-sonnet': 'anthropic/claude-sonnet-4.6',
  'anthropic/claude-3.5-haiku': 'anthropic/claude-haiku-4.5',
  'anthropic/claude-fable-5': 'anthropic/claude-sonnet-4.6',
  'deepseek/deepseek-chat': 'deepseek/deepseek-chat-v3-0324',
  'mistralai/mistral-large': 'mistralai/mistral-large-2512',
  'google/gemini-2.0-flash-001': 'google/gemini-2.5-flash',
};

let panelCache: { ayar: OpenRouterModelAyar; ts: number } | null = null;
const CACHE_MS = 30_000;

export function varsayilanModelAyar(): OpenRouterModelAyar {
  return {
    sonSenkron: null,
    openrouterToplam: 0,
    modeller: VARSAYILAN_PANEL_MODELLER.map((m) => ({ ...m })),
  };
}

function ayarParse(deger: string | null | undefined): OpenRouterModelAyar | null {
  if (!deger) return null;
  try {
    const j = JSON.parse(deger) as Partial<OpenRouterModelAyar>;
    if (!Array.isArray(j.modeller)) return null;
    return varsayilanModelleriBirlestir({
      sonSenkron: typeof j.sonSenkron === 'string' ? j.sonSenkron : null,
      openrouterToplam: typeof j.openrouterToplam === 'number' ? j.openrouterToplam : 0,
      modeller: j.modeller.filter((m): m is OpenRouterModelKayit => !!m?.id && typeof m.ad === 'string'),
    });
  } catch {
    return null;
  }
}

/** Yeni eklenen varsayılan modeller DB listesinde yoksa otomatik eklenir */
export function varsayilanModelleriBirlestir(ayar: OpenRouterModelAyar): OpenRouterModelAyar {
  const ids = new Set(ayar.modeller.map((m) => m.id));
  const eksik = VARSAYILAN_PANEL_MODELLER.filter((m) => !ids.has(m.id));
  if (eksik.length === 0) return ayar;
  return { ...ayar, modeller: [...eksik.map((m) => ({ ...m })), ...ayar.modeller] };
}

export async function openRouterModelAyarOku(): Promise<OpenRouterModelAyar> {
  const simdi = Date.now();
  if (panelCache && simdi - panelCache.ts < CACHE_MS) return panelCache.ayar;

  const kayit = await prisma.sistemAyarlari.findUnique({
    where: { anahtar: OPENROUTER_MODEL_AYAR_ANAHTAR },
  });
  const ayar = ayarParse(kayit?.deger) ?? varsayilanModelAyar();
  cachedModelAd = Object.fromEntries(ayar.modeller.map((m) => [m.id, m.ad]));
  panelCache = { ayar, ts: simdi };
  return ayar;
}

export async function openRouterModelAyarKaydet(ayar: OpenRouterModelAyar): Promise<void> {
  await prisma.sistemAyarlari.upsert({
    where: { anahtar: OPENROUTER_MODEL_AYAR_ANAHTAR },
    update: { deger: JSON.stringify(ayar) },
    create: {
      anahtar: OPENROUTER_MODEL_AYAR_ANAHTAR,
      deger: JSON.stringify(ayar),
      aciklama: 'OpenRouter AI model kataloğu ve panel seçimleri',
    },
  });
  panelCache = null;
}

export function panelCacheTemizle(): void {
  panelCache = null;
}

export async function panelModelleriGetir(yalnizcaGosterilen = true): Promise<OpenRouterModelKayit[]> {
  const ayar = await openRouterModelAyarOku();
  const liste = ayar.modeller.length > 0 ? ayar.modeller : VARSAYILAN_PANEL_MODELLER;
  return yalnizcaGosterilen ? liste.filter((m) => m.paneldeGoster) : liste;
}

export function modelSlugNormalize(slug?: string | null): string | undefined {
  if (!slug?.trim()) return undefined;
  const s = slug.trim();
  return MODEL_SLUG_GUNCELLE[s] ?? s;
}

export const MODEL_AD: Record<string, string> = Object.fromEntries(
  VARSAYILAN_PANEL_MODELLER.map((m) => [m.id, m.ad]),
);

let cachedModelAd: Record<string, string> = { ...MODEL_AD };

export function modelAdi(id: string): string {
  const norm = modelSlugNormalize(id) ?? id;
  return cachedModelAd[norm] || MODEL_AD[norm] || norm.split('/').pop() || norm;
}

const MATEMATIK_FEN = ['matematik', 'fizik', 'kimya', 'biyoloji', 'istatistik', 'olasılık', 'analitik'];
const GORSEL_GEO = ['geometri', 'trigonometri', 'koordinat'];
const TURKCE_SOSYAL = [
  'türkçe', 'dil', 'edebiyat', 'tarih', 'coğrafya', 'felsefe', 'sosyal', 'din', 'psikoloji', 'sosyoloji', 'inkılap',
];
const YABANCI_DIL = ['ingilizce', 'english', 'almanca', 'fransızca', 'fransizca'];

export { MATEMATIK_FEN, GORSEL_GEO, TURKCE_SOSYAL };

export function modelSec(ders: string, zorluk?: string): string {
  const d = ders.toLowerCase();
  const z = (zorluk || '').toUpperCase();
  if (GORSEL_GEO.some((g) => d.includes(g))) {
    return z === 'ZOR' ? 'openai/o4-mini' : 'google/gemini-2.5-pro';
  }
  if (MATEMATIK_FEN.some((m) => d.includes(m))) {
    return z === 'ZOR' ? 'openai/o4-mini' : 'openai/gpt-4.1';
  }
  if (TURKCE_SOSYAL.some((t) => d.includes(t)) || YABANCI_DIL.some((t) => d.includes(t))) {
    return 'anthropic/claude-sonnet-4.6';
  }
  return 'openai/gpt-4.1';
}

export const OPENROUTER_YEDEK_MODELLER = [
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/gpt-5-mini',
  'google/gemini-2.5-flash',
  'anthropic/claude-sonnet-4.5',
  'deepseek/deepseek-chat-v3-0324',
] as const;

export const RATE_LIMIT_YEDEK_MODELLER = [
  'openai/gpt-4.1-mini',
  'google/gemini-2.5-flash',
  'anthropic/claude-haiku-4.5',
  'deepseek/deepseek-chat-v3-0324',
] as const;

export const CROSSCHECK_MODELLER = [
  'openai/o4-mini',
  'anthropic/claude-sonnet-4.6',
  'deepseek/deepseek-chat-v3-0324',
] as const;
