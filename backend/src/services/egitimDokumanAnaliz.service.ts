/**
 * Eğitim materyali yüklendiğinde metinden konu / soru özeti çıkarır (LLM).
 * Soru üretiminde RAG promptuna yapılandırılmış özet olarak eklenir.
 */
import axios from 'axios';
import { getOpenRouterApiKey } from '../config/openrouter';
import { logger } from '../utils/logger';
import { openrouterHttpHeaders } from '../utils/openrouterHeaders';

const ANALIZ_MODEL = process.env.EGITIM_ANALIZ_MODEL || 'openai/gpt-4.1-mini';
const ANALIZ_MAX_METIN = parseInt(process.env.EGITIM_ANALIZ_MAX_CHARS || '60000', 10) || 60000;

export interface EgitimSoruOzeti {
  sira: number;
  ozet: string;
  konu?: string;
  zorluk?: string;
}

export interface EgitimOzeti {
  konular: string[];
  kazanimlar: string[];
  soruTipleri: string[];
  soruSayisi: number;
  sorular: EgitimSoruOzeti[];
  /** AI soru üretiminde kullanılacak kısa eğitim notu */
  uretimYonergesi: string;
}

function jsonAyikla(metin: string): Record<string, unknown> {
  try {
    return JSON.parse(metin) as Record<string, unknown>;
  } catch {
    /* devam */
  }
  const blok = metin.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blok) {
    try {
      return JSON.parse(blok[1]) as Record<string, unknown>;
    } catch {
      /* devam */
    }
  }
  const ilk = metin.indexOf('{');
  const son = metin.lastIndexOf('}');
  if (ilk >= 0 && son > ilk) {
    try {
      return JSON.parse(metin.slice(ilk, son + 1)) as Record<string, unknown>;
    } catch {
      /* devam */
    }
  }
  return {};
}

async function openrouterJson(
  prompt: string,
  maxTokens = 4096,
): Promise<Record<string, unknown>> {
  const key = getOpenRouterApiKey();

  const yanit = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: ANALIZ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...openrouterHttpHeaders(),
      },
      timeout: 180000,
    },
  );

  const icerik = yanit.data?.choices?.[0]?.message?.content || '';
  return jsonAyikla(icerik);
}

function sezgiselKonuCikar(metin: string): string[] {
  const konular = new Set<string>();
  for (const satir of metin.split('\n')) {
    const m =
      satir.match(/^(?:\d+[\.\)]\s*|#{1,3}\s*)([A-ZÇĞİÖŞÜa-zçğıöşü][^\n]{4,80})/) ||
      satir.match(/^(?:KONU|Ünite|ÜNİTE|Bölüm|BÖLÜM)\s*[:\-]?\s*(.+)/i);
    if (m?.[1]) {
      const k = m[1].trim().replace(/\s+/g, ' ').slice(0, 120);
      if (k.length > 4) konular.add(k);
    }
  }
  return [...konular].slice(0, 25);
}

function sezgiselSoruSay(metin: string): number {
  const numarali = (metin.match(/(?:^|\n)\s*(?:Soru\s*)?\d{1,3}\s*[\.\)]/gim) || []).length;
  const sikli = (metin.match(/\b[A-E]\s*[\)\.]/g) || []).length;
  return Math.max(numarali, Math.floor(sikli / 5));
}

function sezgiselOzeti(opts: { metin: string; baslik: string }): EgitimOzeti {
  const metin = opts.metin.slice(0, ANALIZ_MAX_METIN);
  const konular = sezgiselKonuCikar(metin);
  const soruSayisi = sezgiselSoruSay(metin);
  return {
    konular,
    kazanimlar: [],
    soruTipleri: soruSayisi > 2 ? ['çoktan seçmeli'] : [],
    soruSayisi,
    sorular: [],
    uretimYonergesi:
      konular.length > 0
        ? `Materyalde şu başlıklar geçiyor: ${konular.slice(0, 8).join('; ')}. Soruları bu kapsama uygun üret.`
        : 'Yüklenen materyalin kavram düzeyine uygun soru üret.',
  };
}

export function egitimOzetiSerialize(ozet: EgitimOzeti): string {
  return JSON.stringify(ozet);
}

export function egitimOzetiParse(raw: string | null | undefined): EgitimOzeti | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as EgitimOzeti;
    if (!o || typeof o !== 'object') return null;
    return {
      konular: Array.isArray(o.konular) ? o.konular.map(String) : [],
      kazanimlar: Array.isArray(o.kazanimlar) ? o.kazanimlar.map(String) : [],
      soruTipleri: Array.isArray(o.soruTipleri) ? o.soruTipleri.map(String) : [],
      soruSayisi: Number(o.soruSayisi) || 0,
      sorular: Array.isArray(o.sorular)
        ? o.sorular
            .map((s, i) => ({
              sira: Number((s as EgitimSoruOzeti).sira) || i + 1,
              ozet: String((s as EgitimSoruOzeti).ozet || '').trim(),
              konu: (s as EgitimSoruOzeti).konu ? String((s as EgitimSoruOzeti).konu) : undefined,
              zorluk: (s as EgitimSoruOzeti).zorluk ? String((s as EgitimSoruOzeti).zorluk) : undefined,
            }))
            .filter((s) => s.ozet.length > 8)
        : [],
      uretimYonergesi: String(o.uretimYonergesi || '').trim(),
    };
  } catch {
    return null;
  }
}

/** Metinden konu listesi + soru özetleri + üretim yönergesi çıkarır. */
export async function dokumanIcerikAnalizEt(opts: {
  metin: string;
  baslik: string;
  ders?: string | null;
  tur?: string | null;
}): Promise<EgitimOzeti> {
  const metin = opts.metin.slice(0, ANALIZ_MAX_METIN);
  const tur = opts.tur || 'DIGER';
  const ders = opts.ders || 'genel';

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return sezgiselOzeti(opts);
  }

  const prompt = `Sen bir Türk eğitim içerik analistisin. Aşağıdaki materyal "${opts.baslik}" başlıklı bir ${tur} dokümanıdır (ders: ${ders}).

GÖREV — materyali AI soru üretimi için analiz et:
1) "konular": Ana konu/başlık listesi (müfredat maddeleri, ünite adları).
2) "kazanimlar": Ölçülebilir kazanım ifadeleri (varsa).
3) "soruTipleri": Soru formatları (paragraf, işlem, grafik, yorum vb.).
4) "soruSayisi": Tespit edilen çoktan seçmeli soru sayısı (tahmini tam sayı).
5) "sorular": Her soru için ORİJİNAL METNİ KOPYALAMA; 1–2 cümleyle hangi kavramın ölçüldüğünü özetle (en fazla 40 soru).
6) "uretimYonergesi": Soru üretim modeline 3–5 cümlelik Türkçe talimat (hangi konulara ağırlık, zorluk, şık stili).

SADECE geçerli JSON döndür:
{
  "konular": ["..."],
  "kazanimlar": ["..."],
  "soruTipleri": ["..."],
  "soruSayisi": 0,
  "sorular": [{"sira":1,"ozet":"...","konu":"...","zorluk":"ORTA"}],
  "uretimYonergesi": "..."
}

METİN:
${metin}`;

  try {
    const veri = await openrouterJson(prompt, 8192);
    const konular = Array.isArray(veri.konular)
      ? veri.konular.map(String).filter(Boolean)
      : sezgiselKonuCikar(metin);
    const kazanimlar = Array.isArray(veri.kazanimlar) ? veri.kazanimlar.map(String).filter(Boolean) : [];
    const soruTipleri = Array.isArray(veri.soruTipleri) ? veri.soruTipleri.map(String).filter(Boolean) : [];
    const soruSayisi = Number(veri.soruSayisi) || sezgiselSoruSay(metin);
    const sorular: EgitimSoruOzeti[] = [];
    if (Array.isArray(veri.sorular)) {
      for (let i = 0; i < veri.sorular.length && i < 50; i++) {
        const s = veri.sorular[i] as Record<string, unknown>;
        const ozet = String(s.ozet || '').trim();
        if (ozet.length < 8) continue;
        sorular.push({
          sira: Number(s.sira) || i + 1,
          ozet,
          konu: s.konu ? String(s.konu) : undefined,
          zorluk: s.zorluk ? String(s.zorluk) : undefined,
        });
      }
    }
    const uretimYonergesi = String(veri.uretimYonergesi || '').trim();

    logger.info(
      `[RAG/Analiz] ${opts.baslik}: ${konular.length} konu, ${sorular.length} soru özeti, ~${soruSayisi} soru`,
    );

    return {
      konular: konular.slice(0, 30),
      kazanimlar: kazanimlar.slice(0, 20),
      soruTipleri: soruTipleri.slice(0, 10),
      soruSayisi,
      sorular,
      uretimYonergesi:
        uretimYonergesi ||
        `Bu materyaldeki konulara (${konular.slice(0, 5).join(', ')}) uygun, özgün çoktan seçmeli sorular üret.`,
    };
  } catch (e) {
    logger.warn(`[RAG/Analiz] LLM analiz atlandı: ${(e as Error).message}`);
    return sezgiselOzeti(opts);
  }
}

interface AnalizChunk {
  metin: string;
  baslangic: number;
  bitis: number;
}

/** Analiz özetinden ek RAG chunk'ları üretir. */
export function ozettenChunklarUret(ozet: EgitimOzeti, mevcutUzunluk: number): AnalizChunk[] {
  const chunks: AnalizChunk[] = [];
  let cursor = mevcutUzunluk;

  if (ozet.konular.length > 0) {
    const metin = `[Müfredat / konu listesi]\n${ozet.konular.map((k, i) => `${i + 1}. ${k}`).join('\n')}`;
    chunks.push({ metin, baslangic: cursor, bitis: cursor + metin.length });
    cursor += metin.length;
  }

  if (ozet.kazanimlar.length > 0) {
    const metin = `[Kazanımlar]\n${ozet.kazanimlar.join('\n')}`;
    chunks.push({ metin, baslangic: cursor, bitis: cursor + metin.length });
    cursor += metin.length;
  }

  if (ozet.uretimYonergesi) {
    const metin = `[Soru üretim yönergesi]\n${ozet.uretimYonergesi}`;
    chunks.push({ metin, baslangic: cursor, bitis: cursor + metin.length });
    cursor += metin.length;
  }

  for (const s of ozet.sorular.slice(0, 35)) {
    const konuEtiket = s.konu ? ` | Konu: ${s.konu}` : '';
    const metin = `[Kaynak soru ${s.sira} — kavram özeti${konuEtiket}]\n${s.ozet}`;
    chunks.push({ metin, baslangic: cursor, bitis: cursor + metin.length });
    cursor += metin.length;
  }

  return chunks;
}
