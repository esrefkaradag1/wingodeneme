/**
 * OpenRouter üzerinden ders grubuna göre akıllı model yönlendirmesi:
 *
 *  Matematik / Fen Bilimleri  → openai/gpt-4o          (hatasız mantıksal çıkarım)
 *  Türkçe / Sosyal Bilimler   → anthropic/claude-3.5-sonnet  (doğal Türkçe anlatım)
 *  Geometri / Görsel          → google/gemini-1.5-pro   (görsel okuma, grafik yorumlama)
 */

import OpenAI from 'openai';

function asciiHeaderValue(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

// OpenRouter OpenAI-uyumlu API kullanır; baseURL yeterli.
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': asciiHeaderValue(process.env.APP_URL || 'https://wingodeneme.local') || 'https://wingodeneme.local',
    'X-Title': asciiHeaderValue(process.env.APP_NAME || 'Wingo Deneme') || 'Wingo Deneme',
  },
});

// ──────────────────────────────────────────────
// Ders → Model eşleştirme
// ──────────────────────────────────────────────
const MATEMATIK_FEN = [
  'matematik', 'fizik', 'kimya', 'biyoloji',
  'geometri hesap', 'istatistik', 'olasılık', 'analitik geometri',
];

const TURKCE_SOSYAL = [
  'türkçe', 'dil ve anlatım', 'edebiyat', 'tarih', 'coğrafya',
  'felsefe', 'sosyal bilgiler', 'din kültürü', 'psikoloji', 'sosyoloji',
  'vatandaşlık', 'inkılap tarihi',
];

const GORSEL_GEOMETRI = [
  'geometri', 'analitik geometri', 'trigonometri', 'koordinat geometrisi',
];

export type OpenRouterModel =
  | 'openai/gpt-4o'
  | 'openai/o1-preview'
  | 'openai/o3-mini'
  | 'anthropic/claude-3.5-sonnet'
  | 'google/gemini-2.5-flash';

export interface ModelBilgisi {
  model: OpenRouterModel;
  ad: string;
  renk: string;
  ikon: string;
  aciklama: string;
}

export const MODEL_BILGILERI: Record<OpenRouterModel, ModelBilgisi> = {
  'openai/gpt-4o': {
    model: 'openai/gpt-4o',
    ad: 'GPT-4o',
    renk: 'green',
    ikon: '🟢',
    aciklama: 'Hatasız mantıksal çıkarım — Matematik & Fen',
  },
  'openai/o1-preview': {
    model: 'openai/o1-preview',
    ad: 'o1-preview',
    renk: 'gray',
    ikon: '⚪',
    aciklama: 'Akıl yürütme odaklı model',
  },
  'openai/o3-mini': {
    model: 'openai/o3-mini',
    ad: 'o3-mini',
    renk: 'blue',
    ikon: '🔵',
    aciklama: 'İleri muhakeme — Zor Matematik & Fizik',
  },
  'anthropic/claude-3.5-sonnet': {
    model: 'anthropic/claude-3.5-sonnet',
    ad: 'Claude 3.5 Sonnet',
    renk: 'orange',
    ikon: '🟠',
    aciklama: 'Doğal Türkçe anlatım — Türkçe & Sosyal',
  },
  'google/gemini-2.5-flash': {
    model: 'google/gemini-2.5-flash',
    ad: 'Gemini 2.5 Flash',
    renk: 'purple',
    ikon: '🟣',
    aciklama: 'Görsel okuma & grafik yorumlama — Geometri',
  },
};

/**
 * Ders adına ve zorluk seviyesine göre en uygun modeli seç.
 */
export function modelSec(ders: string, zorluk: string): OpenRouterModel {
  const dersKucuk = ders.toLowerCase().trim();

  // Görsel / Geometri
  if (GORSEL_GEOMETRI.some((g) => dersKucuk.includes(g))) {
    return 'google/gemini-2.5-flash';
  }

  // Matematik & Fen — ZOR soru için o3-mini
  if (MATEMATIK_FEN.some((m) => dersKucuk.includes(m))) {
    return zorluk === 'ZOR' ? 'openai/o3-mini' : 'openai/gpt-4o';
  }

  // Türkçe & Sosyal
  if (TURKCE_SOSYAL.some((t) => dersKucuk.includes(t))) {
    return 'anthropic/claude-3.5-sonnet';
  }

  // Varsayılan
  return 'openai/gpt-4o';
}

// ──────────────────────────────────────────────
// Ana prompt şablonu
// ──────────────────────────────────────────────
function sistemPrompt(): string {
  return `Sen uzman bir Türk eğitim içerik üreticisisin.
YKS/LGS sınavı formatında, MEB ve ÖSYM standartlarında soru üretirsin.
Kurallar:
- Sorular Türkçe, dil bilgisi hatasız olmalı.
- Yanlış seçenekler tipik öğrenci hatalarına dayalı (misconception-based) olmalı.
- Her soruda A–E şıklarının tamamı dolu; dogruCevap yalnızca A, B, C, D veya E olmalı.
- Kazanım, MEB ders kazanım kılavuzuna uygun olmalı.
- Yanıtını SADECE geçerli JSON olarak döndür, başka hiçbir metin ekleme.`;
}

function kullaniciPrompt(girdi: SoruGirdisi): string {
  return `${girdi.ogretimTuru} sınavı için ${girdi.ders} dersinden "${girdi.konu}" konusunda \
${girdi.sayi} adet ${girdi.zorluk} zorlukta çoktan seçmeli soru üret.

Yanıt formatı (JSON):
{
  "sorular": [
    {
      "metin": "<p>Soru metni HTML formatında</p>",
      "secenekler": {
        "A": "seçenek A",
        "B": "seçenek B",
        "C": "seçenek C",
        "D": "seçenek D",
        "E": "seçenek E"
      },
      "dogruCevap": "A",
      "kazanim": "Bu soruyu çözen öğrenci X kazanımını edinmiş olur",
      "cozumAciklamasi": "Adım adım çözüm yolu"
    }
  ]
}`;
}

// ──────────────────────────────────────────────
// Giriş tipi
// ──────────────────────────────────────────────
export interface SoruGirdisi {
  konu: string;
  ders: string;
  ogretimTuru: string;
  zorluk: string;
  sayi: number;
  /** Manuel model geçersiz kılma (opsiyonel) */
  modelOverride?: OpenRouterModel;
}

// ──────────────────────────────────────────────
// JSON ayıklayıcı (güvenli)
// ──────────────────────────────────────────────
function jsonAyikla(metin: string): Record<string, unknown> {
  // Önce direkt parse dene
  try {
    return JSON.parse(metin);
  } catch {
    // Markdown kod bloğu varsa ayıkla
    const blokEslesi = metin.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (blokEslesi) {
      try { return JSON.parse(blokEslesi[1]); } catch { /* devam */ }
    }
    // Ham JSON nesnesi ara
    const nesneEslesi = metin.match(/\{[\s\S]*\}/);
    if (nesneEslesi) {
      try { return JSON.parse(nesneEslesi[0]); } catch { /* devam */ }
    }
    throw new Error('Model geçerli JSON döndürmedi');
  }
}

// ──────────────────────────────────────────────
// Ana soru üretme fonksiyonu
// ──────────────────────────────────────────────
export async function soruUret(girdi: SoruGirdisi): Promise<{
  sorular: unknown[];
  kullanılanModel: ModelBilgisi;
}> {
  const secilenModel = girdi.modelOverride ?? modelSec(girdi.ders, girdi.zorluk);
  const modelBilgisi = MODEL_BILGILERI[secilenModel];

  console.log(`[AI] Model: ${secilenModel} | Ders: ${girdi.ders} | Zorluk: ${girdi.zorluk}`);

  // o1 serisi system mesajı desteklemiyor → user'a dahil et
  const isO1 = secilenModel.includes('o1');

  const mesajlar: OpenAI.Chat.ChatCompletionMessageParam[] = isO1
    ? [{ role: 'user', content: `${sistemPrompt()}\n\n${kullaniciPrompt(girdi)}` }]
    : [
        { role: 'system', content: sistemPrompt() },
        { role: 'user', content: kullaniciPrompt(girdi) },
      ];

  const yanit = await openrouter.chat.completions.create({
    model: secilenModel,
    messages: mesajlar,
    max_tokens: 4096,
    ...(isO1 ? {} : { temperature: 0.8 }),
    // gemini ve claude için JSON mode desteklenmeyebilir; sadece gpt-4o için açık
    ...(secilenModel === 'openai/gpt-4o'
      ? { response_format: { type: 'json_object' } }
      : {}),
  });

  const icerik = yanit.choices[0]?.message?.content || '{"sorular":[]}';
  const veri = jsonAyikla(icerik);
  const sorular = Array.isArray(veri.sorular) ? veri.sorular : [];

  return { sorular, kullanılanModel: modelBilgisi };
}
