/**
 * OpenRouter model kataloğu — AI paneli seçim listesi (backend ile senkron)
 */

export interface OpenRouterModelMeta {
  id: string;
  ad: string;
  renk: 'green' | 'blue' | 'orange' | 'purple' | 'gray';
  ikon: string;
  aciklama: string;
}

export interface OpenRouterModelKayit extends OpenRouterModelMeta {
  paneldeGoster?: boolean;
  openrouterAd?: string;
  contextLength?: number;
  uretim?: number;
}

export const OPENROUTER_PANEL_MODELLER: OpenRouterModelMeta[] = [
  {
    id: 'openai/gpt-5.5',
    ad: 'GPT-5.5',
    renk: 'green',
    ikon: '🟢',
    aciklama: 'En yeni OpenAI — karmaşık soru, kod & uzun içerik',
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    ad: 'Gemini 3.1 Pro',
    renk: 'purple',
    ikon: '🟣',
    aciklama: 'Google frontier — görsel, grafik & çok adımlı akıl yürütme',
  },
  {
    id: 'openai/gpt-5.2',
    ad: 'GPT-5.2',
    renk: 'green',
    ikon: '🟢',
    aciklama: 'Güçlü OpenAI — karmaşık soru & uzun içerik',
  },
  {
    id: 'openai/gpt-5-mini',
    ad: 'GPT-5 mini',
    renk: 'green',
    ikon: '🟢',
    aciklama: 'Hızlı & dengeli — genel soru üretimi',
  },
  {
    id: 'openai/gpt-4.1',
    ad: 'GPT-4.1',
    renk: 'green',
    ikon: '🟢',
    aciklama: 'Güvenilir genel model — mantık & içerik',
  },
  {
    id: 'openai/gpt-4.1-mini',
    ad: 'GPT-4.1 mini',
    renk: 'green',
    ikon: '🟢',
    aciklama: 'Ekonomik & hızlı — toplu üretim',
  },
  {
    id: 'openai/o4-mini',
    ad: 'o4-mini',
    renk: 'blue',
    ikon: '🔵',
    aciklama: 'İleri muhakeme — zor Matematik & Fizik',
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    ad: 'Claude Sonnet 4.6',
    renk: 'orange',
    ikon: '🟠',
    aciklama: 'Doğal dil — Türkçe, İngilizce & sözel',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    ad: 'Claude Sonnet 4.5',
    renk: 'orange',
    ikon: '🟠',
    aciklama: 'Güçlü yazım & analiz — sözel branşlar',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    ad: 'Claude Haiku 4.5',
    renk: 'orange',
    ikon: '🟠',
    aciklama: 'Hızlı sözel üretim — kısa metinler',
  },
  {
    id: 'google/gemini-2.5-pro',
    ad: 'Gemini 2.5 Pro',
    renk: 'purple',
    ikon: '🟣',
    aciklama: 'Görsel okuma & grafik — Geometri',
  },
  {
    id: 'google/gemini-2.5-flash',
    ad: 'Gemini 2.5 Flash',
    renk: 'purple',
    ikon: '🟣',
    aciklama: 'Hızlı görsel yorumlama',
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    ad: 'DeepSeek V3',
    renk: 'gray',
    ikon: '⚪',
    aciklama: 'Alternatif genel model — çeşitli konular',
  },
  {
    id: 'mistralai/mistral-large-2512',
    ad: 'Mistral Large 3',
    renk: 'gray',
    ikon: '⚪',
    aciklama: 'Alternatif — hızlı & uzun bağlam',
  },
];

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
};

const MATEMATIK_FEN = ['matematik', 'fizik', 'kimya', 'biyoloji', 'istatistik', 'olasılık', 'analitik'];
const GORSEL_GEO = ['geometri', 'trigonometri', 'koordinat'];
const TURKCE_SOSYAL = [
  'türkçe', 'dil', 'edebiyat', 'tarih', 'coğrafya', 'felsefe', 'sosyal', 'din', 'psikoloji', 'sosyoloji', 'inkılap',
];
const YABANCI_DIL = ['ingilizce', 'english', 'almanca', 'fransızca', 'fransizca'];

export function modelTahmin(ders: string, zorluk: string): OpenRouterModelMeta & { model: string } {
  const d = ders.toLowerCase();
  const z = zorluk.toUpperCase();
  const sec = (id: string) => ({ ...OPENROUTER_PANEL_MODELLER.find((m) => m.id === id)!, model: id });
  if (GORSEL_GEO.some((g) => d.includes(g))) return sec(z === 'ZOR' ? 'openai/o4-mini' : 'google/gemini-2.5-pro');
  if (MATEMATIK_FEN.some((m) => d.includes(m))) return sec(z === 'ZOR' ? 'openai/o4-mini' : 'openai/gpt-4.1');
  if (TURKCE_SOSYAL.some((t) => d.includes(t)) || YABANCI_DIL.some((t) => d.includes(t))) {
    return sec('anthropic/claude-sonnet-4.6');
  }
  return sec('openai/gpt-4.1');
}

export const MODEL_BILGILERI: Record<string, OpenRouterModelMeta & { model: string }> = Object.fromEntries(
  OPENROUTER_PANEL_MODELLER.map((m) => [m.id, { ...m, model: m.id }]),
);

export const MODEL_SECENEKLERI = OPENROUTER_PANEL_MODELLER.map((m) => ({ id: m.id, ...m, model: m.id }));
