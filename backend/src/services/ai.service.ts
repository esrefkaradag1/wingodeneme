import axios from 'axios';
import { logger } from '../utils/logger';
import {
  LATEX_KATEX_YONERGESI,
  SVG_GEOMETRI_ACI_KURALI,
  uretilenSoruAiTemizle,
} from '../utils/aiSoruMetinTemizle';
import {
  similaritySearch,
  kaynaklariPromptaCevir,
  egitimOzetleriniGetir,
  egitimOzetleriniPromptaCevir,
  KaynakChunk,
} from './rag.service';
import { getOpenRouterApiKey } from '../config/openrouter';
import { aiJsonAyikla } from '../utils/aiJsonAyikla';
import {
  INGILIZCE_SVG_YONERGESI,
  soruUretimDiliYonergesi,
  yabanciDilDersiMi,
} from '../utils/yabanciDilSoru';
import { parseMetinParcalari } from '../utils/soruMetinBirlestir';
import { asciiHeaderValue, openrouterHttpHeaders } from '../utils/openrouterHeaders';
import {
  OPENROUTER_YEDEK_MODELLER,
  RATE_LIMIT_YEDEK_MODELLER,
  CROSSCHECK_MODELLER,
  GORSEL_GEO,
  MATEMATIK_FEN,
  TURKCE_SOSYAL,
  modelAdi,
  modelSec,
  modelSlugNormalize,
} from '../config/openrouterModeller';
import {
  OSYM_FIZIK_DEVRE_KURAL,
  seriDevreSvgSablonuOlustur,
  seriDevreSorusuMu,
} from '../utils/fizikSvgYardim';
import {
  lineerGrafikSvgSablonuOlustur,
} from '../utils/grafikSvgSablonu';
import { ogretmenTalimatBlogu, ogretmenTalimatKirp } from '../constants/ogretmenTalimat';
import {
  gorselSvgSablonu,
  gorselSvgYenidenUretPromptEk,
  gorselSvgZayifMi,
  OSYM_CIZGI_GRAFIK_SVG_ORNEK,
  OSYM_CIZGI_GRAFIK_SVG_YONERGESI,
} from '../utils/gorselSvgKalite';
import { openrouterAxiosHata, openrouterModelKullanilamaz } from '../utils/openrouterHata';

export { modelSec, modelAdi, modelSlugNormalize } from '../config/openrouterModeller';

type OpenRouterModel = string;

/** OpenRouter RPM limitine takılmamak için ardışık istekler arası minimum bekleme */
let sonOpenrouterIstekMs = 0;
const OPENROUTER_MIN_ARALIK_MS = parseInt(process.env.OPENROUTER_MIN_ARALIK_MS || '600', 10) || 600;

async function openrouterIstekBekle(): Promise<void> {
  const simdi = Date.now();
  const kalan = sonOpenrouterIstekMs + OPENROUTER_MIN_ARALIK_MS - simdi;
  if (kalan > 0) {
    await new Promise((r) => setTimeout(r, kalan));
  }
  sonOpenrouterIstekMs = Date.now();
}

/** 429 yanıtındaki Retry-After başlığını ms'ye çevirir (saniye veya HTTP tarih). */
function retryAfterMs(err: unknown): number {
  const e = err as { response?: { headers?: Record<string, string> } };
  const h = e?.response?.headers || {};
  const ham = h['retry-after'] ?? h['Retry-After'];
  if (ham == null) return 0;
  const saniye = Number(ham);
  if (!Number.isNaN(saniye)) return Math.max(0, saniye * 1000);
  const ts = Date.parse(String(ham));
  if (!Number.isNaN(ts)) return Math.max(0, ts - Date.now());
  return 0;
}

/** OpenRouter'a axios ile istek at (OpenAI SDK fetch sorunu aşılır) */
export async function openrouterChat(
  model: string,
  mesajlar: { role: string; content: string }[],
  seçenekler?: Record<string, unknown>,
  axiosTimeoutMs?: number
): Promise<string> {
  const key = getOpenRouterApiKey();
  const uyku = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const yenidenDeneGerekli = (err: unknown): boolean => {
    const e = err as any;
    const status: number | undefined = e?.response?.status;
    const msg: string = String(e?.message || e?.response?.data?.error?.message || '');
    if (status && [408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;
    if (/timeout|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(msg)) return true;
    return false;
  };
  const istekGonder = async (m: string): Promise<string> => {
    await openrouterIstekBekle();
    const istenenMax = typeof seçenekler?.max_tokens === 'number' ? seçenekler.max_tokens : 4096;
    const max_tokens = Math.min(Math.max(512, istenenMax), 8192);
    const yanit = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: m,
        messages: mesajlar,
        temperature: 0.8,
        ...seçenekler,
        max_tokens,
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...openrouterHttpHeaders(),
        },
        timeout: axiosTimeoutMs ?? 120000,
      }
    );
    return yanit.data?.choices?.[0]?.message?.content || '';
  };

  // Kısa retry: geçici OpenRouter hatalarında tek seferde düşmeyelim.
  // 429'da Retry-After başlığına saygı gösterip daha uzun exponential backoff uygula.
  const denemeliGonder = async (m: string, denemeler: number): Promise<string> => {
    for (let a = 0; a < denemeler; a++) {
      try {
        return await istekGonder(m);
      } catch (err) {
        if (a < denemeler - 1 && yenidenDeneGerekli(err)) {
          const ra = retryAfterMs(err);
          const bekleme = ra > 0 ? Math.min(ra, 20000) : Math.min(1000 * Math.pow(2, a), 12000);
          await uyku(bekleme);
          continue;
        }
        throw err;
      }
    }
    return istekGonder(m);
  };

  try {
    return await denemeliGonder(model, 4);
  } catch (err: unknown) {
    const hata = err as { response?: { data?: { error?: { message?: string } }; status?: number } };
    const mesaj = hata?.response?.data?.error?.message || '';
    const status = hata?.response?.status;
    const endpointYok = /No endpoints found/i.test(mesaj);
    const hizLimiti = status === 429;

    // 429 (rate limit) veya model erişilemez → yedek modellere otomatik geç.
    if (hizLimiti || openrouterModelKullanilamaz(err)) {
      const adaylar = hizLimiti
        ? [...RATE_LIMIT_YEDEK_MODELLER, ...OPENROUTER_YEDEK_MODELLER]
        : [...OPENROUTER_YEDEK_MODELLER];
      const yedekler = Array.from(new Set(adaylar)).filter((m) => m !== model);
      for (const yedek of yedekler) {
        try {
          logger.warn(
            `[AI] ${hizLimiti ? 'Rate limit (429)' : `Model kullanılamadı (HTTP ${status})`} (${model}); yedek model deneniyor: ${yedek}`,
          );
          return await denemeliGonder(yedek, 2);
        } catch (e2) {
          const s2 = (e2 as { response?: { status?: number } })?.response?.status;
          // Yedek de rate limit / erişilemez ise sıradakini dene; başka hata ise fırlat.
          if (s2 === 429 || openrouterModelKullanilamaz(e2)) continue;
          throw e2;
        }
      }
    }

    if (endpointYok && model !== 'openai/gpt-4.1') {
      logger.warn(`[AI] Model endpoint yok (${model}), fallback: openai/gpt-4.1`);
      return await istekGonder('openai/gpt-4.1');
    }

    throw openrouterAxiosHata(err);
  }
}

// Görsel gerektiren ders/konu/ünite anahtar kelimeleri.
// Sadece ders adına bakmak yetersiz: Matematik dersinin "Analitik Geometri"
// konusu da görsel ister. Bu yüzden ders + konu + ünite hepsine bakıyoruz.
const GORSEL_DERS_ANAHTAR = [
  'geometri', 'trigonometri', 'fizik', 'kimya', 'biyoloji', 'coğrafya',
];

const GORSEL_KONU_ANAHTAR = [
  'geometri', 'trigonometri', 'koordinat', 'analitik',
  'doğru', 'düzlem', 'çember', 'çokgen', 'üçgen', 'dörtgen',
  'parabol', 'fonksiyon grafiği', 'grafik', 'eğri',
  'vektör', 'dönüşüm', 'simetri',
  // Fizik (ÖSYM şekilli soru yoğun)
  'devre', 'kuvvet', 'hareket', 'optik', 'mercek', 'lens', 'ışık', 'dalga',
  'elektrik', 'manyetik', 'basınç', 'sıvı', 'mekanik', 'enerji', 'momentum',
  'ivme', 'hız', 'eğik', 'serbest düşme', 'atış', 'sürtünme', 'newton',
  'direnç', 'kondansatör', 'bobin', 'amper', 'volt', 'ohm', 'prizma', 'ayna',
  'yörünge', 'salınım', 'basit harmonik', 'ısı', 'gaz', 'ideal gaz',
  // Kimya / biyoloji
  'molekül', 'orbital', 'atom', 'hücre', 'organ', 'sistem', 'doku',
  // Coğrafya / sosyal
  'harita', 'iklim', 'yer şekli',
];

export function fizikDersiMi(ders: string): boolean {
  const d = (ders || '').toLowerCase();
  return d.includes('fizik') || d.includes('physics');
}

export function fenDersiMi(ders: string): boolean {
  const d = (ders || '').toLowerCase();
  return ['fizik', 'kimya', 'biyoloji'].some((f) => d.includes(f));
}

export function gorselGerektirir(ders: string, konu?: string, uniteAdi?: string): boolean {
  if (fizikDersiMi(ders)) return true;
  const d = (ders || '').toLowerCase();
  const k = (konu || '').toLowerCase();
  const u = (uniteAdi || '').toLowerCase();
  const dersHit = GORSEL_DERS_ANAHTAR.some((g) => d.includes(g));
  const konuHit = GORSEL_KONU_ANAHTAR.some((g) => k.includes(g) || u.includes(g));
  return dersHit || konuHit;
}

/** SVG üretiminde şekil kalitesi için model seçimi (tüm görsel dersler) */
export function modelSecGorselUretim(ders: string, zorluk: string | undefined, varsayilan: string): string {
  const d = (ders || '').toLowerCase();
  const z = (zorluk || '').toUpperCase();
  const gorselModel = 'google/gemini-2.5-pro';
  if (GORSEL_GEO.some((g) => d.includes(g))) {
    return z === 'ZOR' ? 'openai/o4-mini' : gorselModel;
  }
  if (MATEMATIK_FEN.some((m) => d.includes(m))) {
    return z === 'ZOR' ? 'openai/o4-mini' : gorselModel;
  }
  if (/coğrafya|cografya|harita|fen bilim|inkılap|tarih|felsefe|psikoloji|sosyoloji|din/i.test(d)) {
    return gorselModel;
  }
  if (TURKCE_SOSYAL.some((t) => d.includes(t))) {
    return gorselModel;
  }
  if (varsayilan === 'openai/gpt-4.1' || varsayilan === 'openai/gpt-4.1-mini' || varsayilan === 'openai/gpt-5-mini') {
    return gorselModel;
  }
  return varsayilan;
}

function osymFizikSvgBlogu(g: SoruUretGirdisi): string {
  if (!fizikDersiMi(g.ders)) return '';
  const seg = String(g.yksSegment || g.ogretimTuru || '').toUpperCase();
  const tyt = seg.includes('TYT') || (!seg.includes('AYT') && g.ogretimTuru !== 'LGS');
  return `
⚡ ÖSYM ${tyt ? 'TYT' : 'TYT/AYT'} FİZİK — ŞEKİLLİ SORU (ZORUNLU):
- Bu parti FİZİK üretimidir: üretilen HER soruda svgGorsel DOLU ve çözüme katkı sağlayan olmalı (yalnızca metin soru YASAK).
- Soru kökünde şekle atıf kullan: "Şekilde gösterilen...", "Grafikteki...", "Devrede..." vb.
- Konuya uygun ÖSYM tipi şekil seç (en az biri):
  • Kuvvet–hareket: serbest cisim diyagramı, vektör okları (F, v, a), eğik atış yörüngesi
  • Elektrik: şematik devre (pil, direnç, anahtar; amper/voltmetre sembolleri doğru)
  • Optik: ışın diyagramı, ayna veya ince/ kalın kenarlı mercek, odaklar F–F′
  • Dalga: sinüs dalga, düğüm/karın işaretleri
  • Grafik: v–t, x–t, F–x; eksen etiketleri ve birimler
  • Basınç / sıvılar: U-bor, kaldırma kuvveti okları
- ÖSYM baskı stili: sade çizgi, okunaklı etiket, abartılı 3D veya süsleme YOK.
- Grafik/şekil üzerindeki sayılar soru metnindeki verilerle birebir tutarlı olmalı.
- Sayısal cevap: Hesaplanan sonuç şıklardan EN YAKIN olanı işaretle (ör. 0.545 A → 0.5 A şıkkı); tam sayıya zorla yuvarlayıp uzak şık seçme.
${OSYM_FIZIK_DEVRE_KURAL}
`;
}

function osymGorselSvgBlogu(g: SoruUretGirdisi): string {
  if (fizikDersiMi(g.ders)) return osymFizikSvgBlogu(g);
  const d = (g.ders || '').toLowerCase();
  const seg = String(g.yksSegment || g.ogretimTuru || '').toUpperCase();
  const sinav = seg.includes('TYT') ? 'TYT' : g.ogretimTuru === 'LGS' ? 'LGS' : 'YKS';
  if (GORSEL_GEO.some((x) => d.includes(x))) {
    return `
📐 ${sinav} GEOMETRİ / TRİGONOMETRİ — ŞEKİLLİ SORU (ZORUNLU):
- svgGorsel DOLU; üçgen, çember, açı, koordinat düzlemi soru metniyle tutarlı.
- Ölçüler ve etiketler soru kökündeki sayılarla birebir eşleşmeli.`;
  }
  if (/matematik|istatistik|olasılık|analitik/i.test(d)) {
    return `
📈 ${sinav} MATEMATİK GRAFİK — ŞEKİLLİ SORU:
- Fonksiyon, koordinat, v-t/x-t veya tablo grafiği; eksen etiketleri ve birimler net.
- Grafik verileri soru metniyle tutarlı; dekoratif boş şekil YASAK.
${OSYM_CIZGI_GRAFIK_SVG_YONERGESI}
${OSYM_CIZGI_GRAFIK_SVG_ORNEK}`;
  }
  if (/kimya|biyoloji|fen/i.test(d)) {
    return `
🧪 ${sinav} FEN/KİMYA/BİYOLOJİ — ŞEMA/DENEY:
- Deney düzeni, periyodik tablo parçası, devre veya biyolojik şema sade çizgi stili.
- Semboller okunaklı; soru kökündeki verilerle uyumlu.`;
  }
  if (/coğrafya|cografya|harita/i.test(d)) {
    return `
🌍 ${sinav} COĞRAFYA — HARİTA/GRAFİK:
- İklim, nüfus, harita veya kesit grafiği; lejant kısa, sınırlar net.
- Veriler soru metnindeki sayılarla tutarlı.`;
  }
  if (/tarih|inkılap|sosyal|felsefe|psikoloji|sosyoloji/i.test(d)) {
    return `
📊 ${sinav} SÖZEL GÖRSEL — TABLO/ZAMAN ÇİZGİSİ:
- Zaman çizelgesi, karşılaştırma tablosu veya şema; metin yığını svg içine yazma.
- Soru kökü görsele atıf içermeli ("tabloda", "şemada").`;
  }
  if (/ingilizce|english/i.test(d)) {
    return `
🌐 ${sinav} ENGLISH — DIALOGUE / TABLE / SPEECH BUBBLE:
${INGILIZCE_SVG_YONERGESI}
- Question stem and labels in English; layout must match typical MEB English exam visuals.`;
  }
  return `
🎨 GÖRSEL DESTEKLİ SORU:
- svgGorsel soru köküne katkı sağlamalı; dekoratif boş kutu YASAK.
- ÖSYM/MEB sade çizgi stili; etiketler kısa ve okunaklı.`;
}

function gorselSvgYenidenUretPrompt(g: SoruUretGirdisi, s: UretilenSoru): string {
  const fizikEk = fizikDersiMi(g.ders)
    ? `${osymFizikSvgBlogu(g)}
ÖSYM fizik şeması üret: devre, kuvvet diyagramı, optik ışın, basınç/taşırma veya v-t grafiği — konuya en uygun olanı seç.`
    : osymGorselSvgBlogu(g);
  return `Aşağıdaki ${g.ders} sorusu için ÖSYM tarzı görsel/diyagram SVG üret. Soru metnini ve şıkları DEĞİŞTİRME.
Soru metni:
"""
${(s?.metin || '').replace(/<[^>]+>/g, ' ').slice(0, 1500)}
"""
Şıklar: ${JSON.stringify(s?.secenekler || {})}
Doğru cevap: ${s?.dogruCevap || ''}
${fizikEk}
${gorselSvgYenidenUretPromptEk(g.ders, g.ogretmenTalimat)}

YALNIZCA JSON döndür:
{"svgGorsel":"<svg viewBox='0 0 600 400' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMidYMid meet'>...</svg>"}

KURALLAR:
- viewBox="0 0 600 400", width/height yazma.
- 30 px kenar boşluğu (x: 30..570, y: 30..370).
- Renkler: #3b82f6, #f59e0b, #e11d48, #22c55e; stroke #111827; yazılar font-size 14–16.
- Çizgi grafiklerde veri çizgisi stroke="#2563eb" stroke-width="2.5" kullan.
- Çizim soru kökündeki verilerle tutarlı.
${OSYM_CIZGI_GRAFIK_SVG_YONERGESI.trim()}
${SVG_GEOMETRI_ACI_KURALI.trim()}`;
}

/** Zayıf SVG: şablon veya yeniden üretim (tüm dersler) */
export async function gorselSvgKaliteDuzelt(
  girdi: SoruUretGirdisi,
  s: UretilenSoru,
  svgModel: string,
  sistem: string
): Promise<string | undefined> {
  const metinHam = (s.metin || '').replace(/<[^>]+>/g, ' ');
  let svg = s.svgGorsel ? svgNormalize(s.svgGorsel) : '';
  if (svg && !gorselSvgZayifMi(girdi.ders, svg, metinHam)) return svg;

  const sablon = gorselSvgSablonu(girdi.ders, metinHam);
  if (sablon && !gorselSvgZayifMi(girdi.ders, sablon, metinHam)) {
    logger.info(`[AI] ${girdi.ders} SVG şablonu uygulandı.`);
    return sablon;
  }

  try {
    const ekIcerik = await openrouterChat(
      svgModel,
      [
        { role: 'system', content: sistem },
        { role: 'user', content: gorselSvgYenidenUretPrompt(girdi, s) },
      ],
      { temperature: 0.15, max_tokens: 2800 }
    );
    const svgVeri = jsonAyikla(ekIcerik) as { svgGorsel?: string };
    const yeni = typeof svgVeri.svgGorsel === 'string' ? svgNormalize(svgVeri.svgGorsel) : '';
    if (yeni && !gorselSvgZayifMi(girdi.ders, yeni, metinHam)) {
      logger.info(`[AI] ${girdi.ders} SVG yeniden üretim ile düzeltildi.`);
      return yeni;
    }
  } catch (e) {
    logger.warn(`[AI] SVG yeniden üretim hatası (${girdi.ders}): ${(e as Error).message}`);
  }

  if (seriDevreSorusuMu(metinHam)) {
    const sonSablon = seriDevreSvgSablonuOlustur(metinHam);
    if (sonSablon) {
      logger.info('[AI] SVG son çare seri devre şablonu.');
      return sonSablon;
    }
  }

  const lineerSablon = lineerGrafikSvgSablonuOlustur(metinHam);
  if (lineerSablon) {
    logger.info('[AI] SVG son çare lineer grafik şablonu.');
    return lineerSablon;
  }

  return svg || undefined;
}

/**
 * AI tarafından üretilen <svg>'yi UI'da güvenle ölçeklenebilir hale getirir.
 * - Sabit width/height kaldırılır → kapsayıcıya göre büyür/küçülür.
 * - viewBox yoksa varsayılan eklenir (0 0 600 400).
 * - preserveAspectRatio garantilenir.
 * - max-width/max-height stilleri eklenir.
 */
export function svgNormalize(svgRaw: string | undefined | null): string {
  if (!svgRaw) return '';
  const s = String(svgRaw).trim();
  // Birden fazla svg gelirse ilkini al
  const svgEslesme = s.match(/<svg[\s\S]*?<\/svg>/i);
  let svg = svgEslesme ? svgEslesme[0] : s;
  // Açık etiketi yakala
  const acik = svg.match(/<svg([^>]*)>/i);
  if (!acik) return svg; // svg yapı bozuksa olduğu gibi geri ver
  let attrs = acik[1] || '';
  // width/height attribute'larını sil — sabit boyut taşmaya sebep olabiliyor
  attrs = attrs.replace(/\s(width|height)\s*=\s*"[^"]*"/gi, '');
  attrs = attrs.replace(/\s(width|height)\s*=\s*'[^']*'/gi, '');
  // xmlns yoksa ekle
  if (!/\sxmlns\s*=/.test(attrs)) attrs = ' xmlns="http://www.w3.org/2000/svg"' + attrs;
  // viewBox yoksa varsayılan
  if (!/\sviewBox\s*=/.test(attrs)) attrs += ' viewBox="0 0 600 400"';
  // preserveAspectRatio
  if (!/\spreserveAspectRatio\s*=/.test(attrs)) attrs += ' preserveAspectRatio="xMidYMid meet"';
  // Inline style ile responsive scale
  if (!/\sstyle\s*=/.test(attrs)) {
    attrs += ' style="max-width:100%;height:auto;max-height:360px;display:block;margin:0 auto;"';
  } else {
    attrs = attrs.replace(/\sstyle\s*=\s*"([^"]*)"/i,
      (_m, p1) => ` style="${p1};max-width:100%;height:auto;max-height:360px;display:block;margin:0 auto;"`);
  }
  return svg.replace(/<svg[^>]*>/i, `<svg${attrs}>`);
}

export interface SoruUretGirdisi {
  konu: string;
  ders: string;
  sayi: number;
  zorluk?: string;
  ogretimTuru?: string;
  /** TYT / AYT alt alanı (veritabanı enum etiketi) */
  yksSegment?: string;
  uniteAdi?: string;
  modelOverride?: string;
  gorselMod?: 'svg' | 'dalle' | 'yok';
  /** Öğretmen tarafından serbest biçimli üretim talimatı */
  ogretmenTalimat?: string;
}

function müfredatBaglami(g: SoruUretGirdisi): string {
  const p: string[] = [];
  if (g.ogretimTuru) p.push(`Öğretim türü: ${g.ogretimTuru}`);
  if (g.yksSegment) p.push(`YKS müfredat segmenti: ${g.yksSegment}`);
  if (g.uniteAdi) p.push(`Ünite veya alt başlık: ${g.uniteAdi}`);
  const ot = (g.ogretimTuru || '').toUpperCase();
  if (ot.startsWith('KPSS')) {
    p.push('Müfredat kaynağı: ÖSYM KPSS Genel Yetenek ve Genel Kültür konu dağılım tablosu (GY: Türkçe, Matematik; GK: Tarih, Coğrafya, Vatandaşlık, Güncel Bilgiler)');
  } else {
    p.push('Müfredat kaynağı: yürürlükteki güncel MEB ortaöğretim programı (eski yılların ders kitabı veya kaldırılmış konu ağırlıkları değil)');
  }
  return p.length ? `${p.join('. ')}. ` : '';
}

/**
 * Modelin "klasik eski sınav" kalıbına kaymasını azaltmak için güncel program uyarısı.
 */
function guncelMufredatBloku(g: SoruUretGirdisi): string {
  const d = g.ders.toLowerCase();
  const ot = (g.ogretimTuru || '').toUpperCase();
  const seg = String(g.yksSegment || '').toUpperCase();

  const lines: string[] = [
    '📘 GÜNCEL MÜFREDAT (ZORUNLU): Üretim yürürlükteki MEB ortaöğretim programı ve güncel ÖSYM ölçme çerçevesine göre olmalı. Eski programa özgü konu sıralaması, artık vurgulanmayan teknik ağırlığı veya müfredattan çıkarılmış/azaltılmış içerikleri taklit etme.',
    '"kazanim" alanını bugünkü programa uygun, ölçülebilir ve güncel dille yaz (geçmiş yılların kazanım kopyası üslubu kullanma).',
  ];

  if (ot === 'LGS') {
    lines.push(
      'LGS (ortaokul): Lise ve AYT düzeyindeki konuları (ör. integral, türev, limit, karmaşık sayılar, ileri logaritma, AYT trigonometri/analiz) kesinlikle üretme; yalnızca seçilen ortaokul konusunun güncel kapsamı.',
    );
  }

  if (ot === 'KPSS_LISANS' || ot === 'KPSS_ORTAOGRETIM' || ot === 'KPSS_ONLISANS' || ot === 'KPSS') {
    lines.push(
      'KPSS (Genel Yetenek + Genel Kültür): ÖSYM KPSS ölçme çerçevesine uygun soru üret. GY: Türkçe (anlam, dil bilgisi, sözel mantık) ve Matematik (temel işlem, problem, grafik, sayısal mantık). GK: Tarih, Coğrafya, Vatandaşlık ve Güncel Bilgiler. Lise/üniversite AYT düzeyi integral-türev zincirleri veya alan sınavına özgü ileri teknikleri KPSS sanma.',
    );
  }

  if (d.includes('fizik')) {
    lines.push(
      'FİZİK (ÖSYM): TYT/AYT ÖSYM fizik kitapçığı üslubunda soru yaz — çoğu soruda şema, devre, optik ışın veya grafik bulunur. Şekilsiz düz metin soru üretme; svgGorsel ile uyumlu "Şekilde/Grafikte" atıflı kök kullan.',
    );
  }

  if (ot === 'YKS') {
    if (d.includes('matematik') || d.includes('geometri')) {
      if (seg === 'TYT') {
        lines.push(
          'TYT Matematik/Geometri: TYT ölçme alanında kal; AYT’ye özgü uzun belirli integral zincirleri, çok aşamalı türev–integral birleşik şablonlar ve ileri analiz tipi soruları TYT sanma.',
        );
      }
      if (seg === 'AYT_MATEMATIK') {
        lines.push(
          'AYT Matematik: İntegral/türev/limit sorularında güncel programda ilgili ünite ve kazanım düzeyine sadık kal; önceki müfredat yıllarına özgü "klasik antrenman" veya aşırı teknik ağırlıklı kalıpları bilinçsizce tekrarlama. Konu adı seçildiyse o başlığın bugünkü işleniş sınırını aşma.',
        );
      }
    }
  }

  return `${lines.join('\n')}\n\n`;
}

export interface UretilenSoru {
  metin: string;
  svgGorsel?: string;       // inline SVG kodu
  gorselPrompt?: string;    // DALL-E için oluşturulacak görsel açıklaması
  gorselUrl?: string;       // üretilmiş görsel URL
  secenekler: { A: string; B: string; C: string; D: string; E: string };
  dogruCevap: string;
  kazanim: string;
  cozumAciklamasi?: string;
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function paragrafZorunluMu(girdi: SoruUretGirdisi): boolean {
  const ders = girdi.ders.toLowerCase();
  const konu = girdi.konu.toLowerCase();
  const turkceTabanli = ders.includes('türkçe') || ders.includes('edebiyat') || ders.includes('dil');
  const paragrafOdakli = ['paragraf', 'metin', 'anlam', 'yorum', 'ana fikir', 'yardımcı düşünce'].some((k) =>
    konu.includes(k)
  );
  return turkceTabanli && paragrafOdakli;
}

/** LGS Türkçe: sözel mantık, çıkarım, görsel/tabloyu okuma vb. konularda ek biçim uyarısı */
function turkceSozelMantikCikarimVurgusu(girdi: SoruUretGirdisi): boolean {
  const d = girdi.ders.toLowerCase();
  if (!d.includes('türkçe') && !d.includes('turkce')) return false;
  const k = girdi.konu.toLowerCase();
  const anahtarlar = [
    'mantık',
    'mantik',
    'sözel',
    'sozel',
    'görsel',
    'gorsel',
    'okuma',
    'çıkarım',
    'cikarim',
    'tablo',
    'grafik',
    'sembol',
    'şifre',
    'sifre',
    'sıralama',
    'siralama',
    'öncül',
    'oncul',
  ];
  return anahtarlar.some((a) => k.includes(a));
}

function paragrafIcerigiYeterliMi(metin: string): boolean {
  const pSayisi = (metin.match(/<p[\s>]/gi) || []).length;
  const duz = stripHtmlTags(metin);
  // Paragraf sorusu için en az iki paragraf bloğu veya yeterli uzun pasaj beklenir.
  return pSayisi >= 2 || duz.length >= 220;
}

function jsonAyikla(metin: string): Record<string, unknown> {
  return aiJsonAyikla(metin);
}

// ── Ortak yüksek-doğruluk üretim talimatları (her prompta dahil edilir) ──
function uretimAltinKurallari(secenekSayisi: number): string {
  const sikAraligi = secenekSayisi === 4 ? 'A–D' : 'A–E';
  return `🔒 ALTIN KURALLAR — DOĞRULUK ÖNCE GELİR:

1) ÖNCE ÇÖZ, SONRA YAZ:
   - Soruyu zihninde tamamen çöz; adım adım açıklama **yalnızca** "cozumAciklamasi" alanına yazılır.
   - "metin" alanına ara hesap, çözüm adımı, "tekrar kontrol ediyorum" vb. notlar **asla** yazma; metin yalnızca öğrenciye gösterilecek nihai soru kökü olmalı.
   - Hesap/akıl yürütme ile **kesin tek bir doğru sonuç** elde et; bu sonucu mutlaka şıklardan tam olarak BİR tanesine yerleştir.
   - Diğer şıklar bu sonuca eşit olmamalı; yakın ama açıkça farklı değerler/ifadeler olmalı.

2) DOĞRU CEVAP TEK OLMALI:
   - Sorunun ${sikAraligi} arası şıklarından SADECE BİR TANESİ doğru olmalı.
   - "Aşağıdakilerden hangisi" tipi sorularda ikinci doğru olabilecek şık varsa soruyu yeniden tasarla.
   - "Hangisi YANLIŞTIR / DEĞİLDİR" sorularında dahi yalnızca tek bir yanlış/istisna olmalı.
   - Şıkların hiçbiri eşdeğer/anlamsal olarak aynı şeyi söylememeli.
   - "Hepsi", "Yalnızca II ve III" gibi birleşik şıklar kullanmadan önce mantığı iki kez doğrula.

3) ÇELDİRİCİLER GERÇEK YANILGI ÜZERİNE KURULSUN:
   - Yanlış şıklar; rastgele uydurulmuş değil, **gerçek öğrenci yanılgılarına** dayanmalı:
     işaret hatası, pay-payda karışıklığı, formül karıştırma, kavram yanılgısı, birim hatası vb.
   - Çeldiriciler arasında dağılım dengeli olsun (hepsi aynı yanılgıya değil).
   - Gerçekçi ama net biçimde yanlış olsunlar.

4) SORUDA EKSİK BİLGİ OLMASIN:
   - Soru kökü yalnız başına çözüm için yeterli veriyi içermeli.
   - "Verilen ABC üçgeninde…" gibi cümleler kullanılıyorsa, ilgili veri (kenar, açı vb.) açıkça verilmeli.
   - Belirsiz, çift anlamlı, "Tanrı bilir" tipi formülasyonlardan kaçın.

5) DİL VE BİÇİM:
   - Türkçe dil bilgisi hatasız, akademik üslupta.
   - Sayısal değerlerde virgül/nokta tutarlı: ondalık ayraç olarak nokta (örn. 3.14) kullan.
   - Gereksiz ön bilgi, espri, kişisel ifade YOK.

6) ÇIKTI BİÇİMİ KESİN:
   - Yanıt SADECE **tek bir geçerli JSON** olacak. Markdown bloğu, açıklama, ön söz YASAK.
   - dogruCevap yalnızca ${sikAraligi} harflerinden biri olmalı (büyük harf).
   - cozumAciklamasi 2-5 net adım içermeli; öğrenciye gerçekten yol göstermeli.

7) SORU METNİ = YALNIZCA ÖĞRENCİYE GÖSTERİLECEK SON HAL:
   - "metin" ve şıklarda iç monolog, öz-düzeltme, "yanlış topladım", "tekrar kontrol", "şıklarda bu var ama…", "aslında doğru…" gibi ifadeler **kesinlikle yasak**.
   - "metin" içinde çözüm akışı da yasak: "Adım 1/2…", "Sonuç:", hangi şıkkın doğru olduğunu veya harfini söylemek ("doğru cevap A", "A şıkkıdır") **yazma**; bunlar yalnızca "cozumAciklamasi" alanında olmalı.
   - Soru cümlesi bittikten sonra köşe harfleri / ölçü yapıştırma (örn. "?BCA86∠60°") **kesinlikle yasak**; tüm verileri cümlenin içinde, okunur biçimde ver.
   - Kavram netliği için tek cümlelik kısa yönerge serbest; modelin kendi denetim sürecini yazma.
   - HTML "metin" içinde ham kaçış metni yasak: metne ters eğik çizgi ile n, t, r yazma (ekranda satır sonu kaçışı gibi kirli metin çıkmasın); satır veya numaralı ipuçları için gerçek <p> / <br/> kullan.`;
}

// ── Görsel gerektiren sorular için prompt ─────────────────────────
function svgPrompt(girdi: SoruUretGirdisi): string {
  const ctx = müfredatBaglami(girdi);
  const talimatBlok = ogretmenTalimatBlogu(girdi.ogretmenTalimat);
  const secenekSayisi = girdi.ogretimTuru === 'LGS' ? 4 : 5;
  const altin = uretimAltinKurallari(secenekSayisi);
  const gorselOran = gorselGerektirir(girdi.ders, girdi.konu, girdi.uniteAdi)
    ? `${girdi.ders.toUpperCase()}: Üretilen soruların %100'ünde anlamlı, soru köküyle tutarlı svgGorsel olmalı.`
    : fizikDersiMi(girdi.ders)
      ? 'FİZİK: Üretilen soruların %100\'ünde anlamlı şekil olmalı.'
      : fenDersiMi(girdi.ders)
        ? 'FEN: Üretilen soruların en az %80\'inde anlamlı şekil olmalı.'
        : '';

  return `${ctx}${girdi.ogretimTuru || 'YKS'} sınavı için ${girdi.ders} dersinden "${girdi.konu}" konusunda ${girdi.sayi} adet ${girdi.zorluk || 'ORTA'} zorlukta GÖRSEL DESTEKLİ çoktan seçmeli soru üret.
${soruUretimDiliYonergesi(girdi.ders) ? `\n${soruUretimDiliYonergesi(girdi.ders)}\n` : ''}

⛔ ZORUNLU KURAL: HER sorunun "svgGorsel" alanı DOLU olacak. svgGorsel'siz, boş string'li veya "yok"/"yok şekil" gibi cevaplar KESİNLİKLE KABUL EDİLMEZ. Bir soruda bile şekil eksikse tüm üretim geçersiz sayılır.
${gorselOran}
Şekil; soruda gerçekten anlamlı bir görsel olmalı (sadece dekoratif değil, çözüme katkı sağlayan ya da soruyu netleştiren bir diyagram). Soru metninde "şekildeki", "yukarıdaki şekilde", "grafikte" gibi atıflar svg ile uyumlu olmalı.
${osymGorselSvgBlogu(girdi)}
${talimatBlok}

${altin}
${guncelMufredatBloku(girdi)}
🎨 GÖRSEL KURALLARI (SIKI):
- viewBox="0 0 600 400", width/height ATTRIBUTE'U YAZMA.
- preserveAspectRatio="xMidYMid meet" ekle.
- Tüm çizimleri 30 px kenar boşluğu ile (x: 30..570, y: 30..370) yap. Dışarı taşma YASAK.
- Renk paleti: #e11d48, #f59e0b, #3b82f6, #22c55e, #111827, #f8fafc.
- Dolgular düşük opaklık: fill-opacity="0.25"–"0.45". Çizgiler: stroke="#111827" veya "#334155", stroke-width="2".

🔤 YAZI / ETİKET KURALLARI (ÇOK ÖNEMLİ — yazılar BİRBİRİNE GİRMESİN):
- <text> font-size: 14–16. Daha büyük yazı YASAK.
- Bir etiketin uzunluğu ≤ 14 karakter. Daha uzunsa kısalt (ör. "Bowman kapsülü" → "Bowman" veya "B. kapsülü").
- İki etiket arasında yatayda en az 90 px, dikeyde en az 24 px aralık bırak.
- Çakışma riski varsa etiket yerine numara (1, 2, 3 …) kullan ve şeklin ALTINDA ya da yanında küçük bir AÇIKLAMA listesi (yine <text>) yap; ayrı satırlarda y değerlerini 22 px artırarak yaz.
- Etiketleri şeklin İÇİNE değil DIŞINA koymayı tercih et (üst/alt/yan); şeklin üstündeki etiket için y >= 22, altındaki için y <= 380.
- text-anchor: yatayda ortaya hizalanan etiketler için "middle"; sol kenarda olanlar için "start"; sağ kenarda olanlar için "end" kullan.
- Türkçe karakterler serbest, ancak fazla uzun ise kısalt.

📐 ŞEKİL TUTARLILIĞI:
- Geometri: <circle>, <rect>, <polygon>, <path>. Üçgen denildiyse ÜÇGEN, çember denildiyse ÇEMBER çiz.
- Çizgi grafik: eksen okları, tick etiketleri, mavi veri çizgisi, vurgu noktasında kesik yönlendirme çizgileri.
- Şekildeki TÜM ölçüler soru metnindeki sayılarla TUTARLI olmalı (örn. "AB=5" denmişse şekilde 5 yazsın).
- Soru "Şekilde verilen…" veya "Grafikte…" diye başlıyorsa şeklin gerçekten o bilgiyi taşıması ZORUNLU.
${OSYM_CIZGI_GRAFIK_SVG_ORNEK}
${SVG_GEOMETRI_ACI_KURALI}

🧠 KENDİNİ DENETLE (yazmadan önce):
1. Konu görsele uygun mu? (Geometri/grafik/koordinat/devre/optik vs.) Evet → şekli mutlaka çiz.
2. Şeklin verdiği bilgilerle metin çakışmıyor mu?
3. Tek doğru şık mı, çeldiriciler tipik hatalardan mı?
${stemKontrolGerekli(girdi.ders) ? `${LATEX_KATEX_YONERGESI}\n` : ''}
📦 JSON formatı (SADECE BU FORMAT — başka hiçbir şey yazma):
{
  "sorular": [
    {
      "metin": "<p>Şekilde verilen ABC üçgeninde...</p>",
      "svgGorsel": "<svg viewBox='0 0 400 300' xmlns='http://www.w3.org/2000/svg'><line x1='30' y1='260' x2='370' y2='260' stroke='#111827' stroke-width='2'/><text x='200' y='280' font-size='14' fill='#111827'>x</text>...</svg>",
      "secenekler": ${secenekSayisi === 4 ? '{"A":"...","B":"...","C":"...","D":"..."}' : '{"A":"...","B":"...","C":"...","D":"...","E":"..."}'},
      "dogruCevap": "B",
      "kazanim": "kazanım metni",
      "cozumAciklamasi": "Adım 1: ... Adım 2: ... Sonuç: ..."
    }
  ]
}`;
}

function metin_promptu(girdi: SoruUretGirdisi): string {
  const ctx = müfredatBaglami(girdi);
  const paragrafZorunlu = paragrafZorunluMu(girdi);
  const talimatBlok = ogretmenTalimatBlogu(girdi.ogretmenTalimat);
  const secenekSayisi = girdi.ogretimTuru === 'LGS' ? 4 : 5;
  const altin = uretimAltinKurallari(secenekSayisi);
  const secenekJson = secenekSayisi === 4
    ? '"secenekler":{"A":"...","B":"...","C":"...","D":"..."}'
    : '"secenekler":{"A":"...","B":"...","C":"...","D":"...","E":"..."}';
  return `${ctx}${girdi.ogretimTuru || 'YKS'} sınavı için ${girdi.ders} dersinden "${girdi.konu}" konusunda ${girdi.sayi} adet ${girdi.zorluk || 'ORTA'} zorlukta çoktan seçmeli soru üret.
${soruUretimDiliYonergesi(girdi.ders) ? `\n${soruUretimDiliYonergesi(girdi.ders)}\n` : ''}
${talimatBlok}

${altin}
${guncelMufredatBloku(girdi)}
${paragrafZorunlu
  ? `📚 PARAGRAF KURALI (TÜRKÇE/EDEBİYAT KONULARI):
- Her soruda mutlaka önce anlamlı bir pasaj/paragraf ver.
- Paragraf en az 3-5 cümle, akıcı ve özgün olsun; ardından soru kökü gelsin.
- "metin" alanı HTML olsun ve en az iki <p> bloğu içersin:
  1) ilk <p>: pasaj metni
  2) ikinci <p>: soru kökü
- Sorunun yanıtı paragrafta açıkça çıkarılabilmeli; "yorumlama gerektiren" sorularda dahi tek bir savunulabilir cevap olmalı.`
  : ''}
${stemKontrolGerekli(girdi.ders) ? `${LATEX_KATEX_YONERGESI}\n` : ''}
${turkceSozelMantikCikarimVurgusu(girdi)
  ? `🧩 SÖZEL MANTIK / ÇIKARIM / GÖRSEL–TABLO OKUMA (bu konu başlığı):
- Ön bilgi ipuçlarını (1. 2. 3. veya numaralı maddeler) yazarken ASLA "\\n" / "\\t" gibi kaçış dizilerini metin olarak kullanma; bunlar ekranda kirli görünür. Kullan: <p>, <br/> veya "1) … 2) …" tek paragrafta.
- Soru kökünde eleme/çözüm sürecini satır satır anlatma; yalnızca öğrencinin çözeceği veriyi ver. Akıl yürütmenin adımları yalnızca "cozumAciklamasi" alanında olmalı.
`
  : ''}
📦 JSON formatı (SADECE BU FORMATI KULLAN — başka hiçbir şey yazma):
{"sorular":[{"metin":"<p>Gerekirse pasaj/paragraf metni</p><p>Soru kökü buraya</p>",${secenekJson},"dogruCevap":"A","kazanim":"Kazanım açıklaması","cozumAciklamasi":"Adım 1: ... Adım 2: ... Sonuç: ..."}]}`;
}

// ── DALL-E 3 görsel üretimi ───────────────────────────────────────
export async function gorselUret(prompt: string): Promise<string | null> {
  let key: string;
  try {
    key = getOpenRouterApiKey();
  } catch {
    return null;
  }
  try {
    const yanit = await axios.post(
      'https://openrouter.ai/api/v1/images/generations',
      {
        model: 'openai/dall-e-3',
        prompt: `Educational diagram for Turkish high school math/science exam. ${prompt}. Clean white background, clear labels in Turkish, simple geometric style, no text clutter, suitable for print.`,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...openrouterHttpHeaders(),
        },
        timeout: 60000,
      }
    );
    return yanit.data?.data?.[0]?.url || null;
  } catch (err: unknown) {
    const hata = err as { message?: string };
    logger.warn(`DALL-E görsel üretimi başarısız: ${hata?.message}`);
    return null;
  }
}

export interface SoruUretSonucu {
  sorular: UretilenSoru[];
  kullanılanModel: { model: string; ad: string };
  kullanilanKaynaklar?: { id: string; dokumanId: string; dokumanBaslik: string; dokumanTuru?: string; benzerlik: number }[];
}

export async function soruUret(girdi: SoruUretGirdisi & { konuId?: string }): Promise<SoruUretSonucu> {
  girdi = { ...girdi, ogretmenTalimat: ogretmenTalimatKirp(girdi.ogretmenTalimat) || undefined };
  const secilenModel: OpenRouterModel =
    modelSlugNormalize(girdi.modelOverride) ?? modelSec(girdi.ders, girdi.zorluk);
  const isO1 = secilenModel.includes('o1');

  // Görsel mod: oto/yok → fizik ve görsel konularda otomatik SVG
  const gorselMod =
    girdi.gorselMod === 'dalle'
      ? 'dalle'
      : girdi.gorselMod === 'svg'
        ? 'svg'
        : girdi.gorselMod === 'yok'
          ? 'yok'
          : gorselGerektirir(girdi.ders, girdi.konu, girdi.uniteAdi)
            ? 'svg'
            : 'yok';

  const svgUretimModel =
    gorselMod === 'svg' ? modelSecGorselUretim(girdi.ders, girdi.zorluk, secilenModel) : secilenModel;

  logger.info(
    `[AI] Model: ${secilenModel} | SVG model: ${svgUretimModel} | Ders: ${girdi.ders} | Zorluk: ${girdi.zorluk} | GörselMod: ${gorselMod}`
  );

  // 📚 RAG: yüklenen materyal analizi + konu/soru chunk'ları
  let kaynaklar: KaynakChunk[] = [];
  let kaynakBlogu = '';
  try {
    const sorgu = `${girdi.ders} ${girdi.konu} ${girdi.uniteAdi || ''} ${girdi.zorluk || ''} kazanım soru`.trim();
    const ortak = {
      sorgu,
      ders: girdi.ders,
      konuId: girdi.konuId,
      ogretimTuru: girdi.ogretimTuru,
      minBenzerlik: 0.28,
    };

    let ozetler = await egitimOzetleriniGetir({
      ders: girdi.ders,
      konuId: girdi.konuId,
      ogretimTuru: girdi.ogretimTuru,
      limit: 4,
    });
    if (ozetler.length === 0 && girdi.ders) {
      ozetler = await egitimOzetleriniGetir({ ders: girdi.ders, ogretimTuru: girdi.ogretimTuru, limit: 4 });
    }
    const analizBlogu = egitimOzetleriniPromptaCevir(ozetler);

    const [soruOrnek, konuAnlatim, cozum, genel] = await Promise.all([
      similaritySearch({ ...ortak, dokumanTurleri: ['DENEME_SINAVI', 'SORU_ORNEKLERI'], topK: 4 }),
      similaritySearch({ ...ortak, dokumanTurleri: ['KONU_ANLATIMI'], topK: 3 }),
      similaritySearch({ ...ortak, dokumanTurleri: ['COZUM'], topK: 2 }),
      similaritySearch({ ...ortak, topK: 4 }),
    ]);

    const seen = new Set<string>();
    kaynaklar = [...soruOrnek, ...konuAnlatim, ...cozum, ...genel].filter((k) => {
      if (seen.has(k.id)) return false;
      seen.add(k.id);
      return true;
    }).slice(0, 8);

    if (kaynaklar.length > 0 || analizBlogu) {
      kaynakBlogu = kaynaklariPromptaCevir(kaynaklar, analizBlogu);
      logger.info(
        `[AI/RAG] ${ozetler.length} materyal analizi, ${kaynaklar.length} chunk (top: ${kaynaklar[0]?.benzerlik?.toFixed(3) ?? '—'}).`,
      );
    }
  } catch (e) {
    logger.warn(`[AI/RAG] Kaynak getirme hatası: ${(e as Error).message}`);
  }

  const sistem = `Sen 25+ yıl ÖSYM ve MEB için soru hazırlamış uzman bir Türk eğitim içerik üreticisi (madde yazarı) ve sınav komisyonu üyesisin.
Görevlerin:
- **Güncel (yürürlükteki) MEB programı** ve ilgili YKS/LGS sınav düzeyine %100 uygun, müfredat içi soru üretmek; eski müfredat yıllarına, kaldırılmış konulara veya eski kaynaklardaki tipik kalıpları bilinçsizce kopyalamaktan kaçınmak.
- Çözümü TEK ve KESİN olan, **birden fazla doğru şıkkı bulunmayan** sorular yazmak.
- Yanlış şıkları gerçek öğrenci yanılgılarına (misconception) dayandırmak.
- Soru gövdesinde gerekli tüm verileri açıkça vermek; eksik bilgi bırakmamak.
${yabanciDilDersiMi(girdi.ders)
    ? `- ${soruUretimDiliYonergesi(girdi.ders).replace(/\n/g, '\n- ')}`
    : '- Türkçe dil bilgisi ve akademik üsluba kusursuzca uymak.'}${
    kaynakBlogu
      ? `\n- KAYNAK MATERYAL ve MATERYAL ANALİZİ bloklarında listelenen konular, kazanımlar ve soru kavram özetlerine sadık kal.
- Aynı müfredat kapsamında, materyaldeki soru tarzı ve zorluk düzeyini örnek al; metni veya şıkları KOPYALAMA — özgün soru tasarla.
- Analizde geçen konu başlıklarını soru dağılımında yansıt.`
      : ''
  }

Çıkış kuralı:
- Yanıtın SADECE geçerli, tek bir JSON nesnesi olacak. Markdown bloğu, açıklama, ön söz YOK.
- A–E (veya LGS'te A–D) şıklarının tamamı anlamlı, dolu ve birbirinden açıkça farklı olmalı.
- dogruCevap yalnızca A, B, C, D veya E harflerinden biri olmalı.
- cozumAciklamasi adım adım, doğru şıkkı kesin biçimde gerekçelendirmeli.

Doğruluk politikan:
- Yazdığın sonucu kendin tekrar çöz; cozumAciklamasi'ndaki sonuç ile dogruCevap'taki şık MUTLAKA aynı değere/ifadeye işaret etmeli.
- Tutarsızlık şüphesi varsa soruyu tasarımdan baştan kur; tahmin/uydurma şık verme.

Soru "metin" alanı basıma/ekrana gidecek metindir; iç monolog, öz-düzeltme, model denetim notu ve geçici cümleler oraya yazılmaz (yalnızca cozumAciklamasi'nda adım adım anlatılır).`;

  const tabanKullanici = gorselMod === 'svg' ? svgPrompt(girdi) : metin_promptu(girdi);
  const kullanici = kaynakBlogu ? `${kaynakBlogu}\n\n${tabanKullanici}` : tabanKullanici;

  const mesajlar = (model: string) =>
    model.includes('o1')
      ? [{ role: 'user', content: `${sistem}\n\n${kullanici}` }]
      : [{ role: 'system', content: sistem }, { role: 'user', content: kullanici }];

  const MAX_URETIM_PARTI = gorselMod === 'svg' ? 1 : 4;

  const birPartiUret = async (adet: number): Promise<UretilenSoru[]> => {
    const localGirdi: SoruUretGirdisi = { ...girdi, sayi: adet };
    const tabanLocal = gorselMod === 'svg' ? svgPrompt(localGirdi) : metin_promptu(localGirdi);
    const localKullanici = kaynakBlogu ? `${kaynakBlogu}\n\n${tabanLocal}` : tabanLocal;
    const localMesajlar = (model: string) =>
      model.includes('o1')
        ? [{ role: 'user', content: `${sistem}\n\n${localKullanici}` }]
        : [{ role: 'system', content: sistem }, { role: 'user', content: localKullanici }];

    const uretimModel = gorselMod === 'svg' ? svgUretimModel : secilenModel;
    const uretimSecenek = uretimModel.includes('o1')
      ? {}
      : {
          temperature: fizikDersiMi(girdi.ders) ? 0.28 : 0.35,
          top_p: 0.9,
          max_tokens:
            gorselMod === 'svg' ? Math.min(16384, 3500 + 4000 * adet) : 4096,
        };
    const icerik = await openrouterChat(uretimModel, localMesajlar(uretimModel), uretimSecenek);
    const veri = jsonAyikla(icerik);
    let sorular = Array.isArray(veri.sorular) ? (veri.sorular as UretilenSoru[]) : [];

    if (sorular.length === 0) {
      logger.warn(`[AI] Soru listesi boş geldi (${secilenModel}). Yedek modeller deneniyor...`);
      const yedekZinciri: OpenRouterModel[] = [
        'openai/gpt-4.1',
        'anthropic/claude-sonnet-4.5',
        'openai/gpt-4.1',
      ].filter((m) => m !== secilenModel);

      for (const yedekModel of yedekZinciri) {
        try {
          const yedekIcerik = await openrouterChat(
            gorselMod === 'svg' ? svgUretimModel : yedekModel,
            localMesajlar(yedekModel),
            yedekModel.includes('o1')
              ? {}
              : {
                  temperature: 0.4,
                  max_tokens: gorselMod === 'svg' ? Math.min(16384, 3500 + 4000 * adet) : 4096,
                },
          );
          const yedekVeri = jsonAyikla(yedekIcerik);
          const yedekSorular = Array.isArray(yedekVeri.sorular) ? (yedekVeri.sorular as UretilenSoru[]) : [];
          if (yedekSorular.length > 0) {
            sorular = yedekSorular;
            logger.info(`[AI] Yedek model başarılı: ${yedekModel}`);
            break;
          }
        } catch (e) {
          logger.warn(`[AI] Yedek model ${yedekModel} başarısız: ${(e as Error).message}`);
        }
      }

      if (sorular.length === 0) {
        logger.warn(`[AI] Tüm yedeklerde de soru listesi boş. Ham yanıt: ${icerik.substring(0, 300)}`);
        throw new Error('Model boş soru listesi döndürdü — SVG yanıtı kesilmiş olabilir; soru sayısını azaltıp tekrar deneyin.');
      }
    }

    sorular = sorular.map(uretilenSoruAiTemizle);

    // ⚖️ Üretici-içi self-check: dogruCevap ile cozumAciklamasi içindeki sonuç tutarlı mı?
    // Tutarsızsa modelden TEK SEFERLİK düzeltme iste; başarısız olursa garanti katmanı yakalar.
    sorular = await Promise.all(
      sorular.map(async (s) => {
        try {
          if (!s || !s.cozumAciklamasi || !s.secenekler || !s.dogruCevap) return s;
          const dogruIcerik = (s.secenekler as any)?.[s.dogruCevap];
          if (!dogruIcerik) return s;
          const cz = String(s.cozumAciklamasi).toLowerCase();
          // Çözüm açıklaması içinde belirtilen sonuç şıkkın metnini içermiyor olabilir;
          // bu sadece bir SİNYALDİR, kesin yanlışlık değildir. Garanti katmanı son sözü söyler.
          const dogruMetinDuz = String(dogruIcerik).toLowerCase().replace(/[^a-z0-9çğıöşü\.\-]/gi, '');
          if (dogruMetinDuz.length >= 1 && cz.includes(dogruMetinDuz)) return s;
          return s; // Bilgi amaçlı; ek istek yapmıyoruz, garanti katmanı zaten devrede.
        } catch {
          return s;
        }
      }),
    );

    // 🖼️ SVG modu açık ama bazı sorular svgGorsel olmadan dönmüş olabilir.
    // Eksik şekilleri ayrı ayrı, sadece SVG isteyecek şekilde tek atışta yeniden üret.
    if (gorselMod === 'svg') {
      for (let i = 0; i < sorular.length; i++) {
        const s = sorular[i];
        const eksik = !s?.svgGorsel || String(s.svgGorsel).trim().length < 30;
        if (!eksik) continue;
        try {
          const ekIcerik = await openrouterChat(
            svgUretimModel,
            [
              { role: 'system', content: sistem },
              { role: 'user', content: gorselSvgYenidenUretPrompt(girdi, s) },
            ],
            svgUretimModel.includes('o1') ? {} : { temperature: 0.2, max_tokens: 2800 },
          );
          const svgVeri = jsonAyikla(ekIcerik) as Record<string, unknown>;
          const svgHam = typeof svgVeri.svgGorsel === 'string' ? svgVeri.svgGorsel : '';
          const svg = svgHam ? svgNormalize(svgHam) : '';
          if (svg && svg.trim().length >= 40) {
            sorular[i] = { ...s, svgGorsel: svg };
            logger.info(`[AI] Eksik SVG ek üretim ile tamamlandı (soru ${i + 1}).`);
          } else {
            logger.warn(`[AI] Eksik SVG için ek üretim de yetersiz (soru ${i + 1}).`);
          }
        } catch (e) {
          logger.warn(`[AI] Ek SVG üretimi hata: ${(e as Error).message}`);
        }
      }
    }

    // Türkçe "paragraf/anlam" konularında pasajın kaybolmasını engelle.
    if (paragrafZorunluMu(localGirdi) && sorular.some((s) => !paragrafIcerigiYeterliMi(s.metin || ''))) {
      logger.warn(`[AI] Paragraf içeriği yetersiz. Model tekrar deneniyor (${secilenModel}).`);
      const tekrarIcerik = await openrouterChat(
        secilenModel,
        localMesajlar(secilenModel),
        { temperature: 0.55, max_tokens: 4096 }
      );
      const tekrarVeri = jsonAyikla(tekrarIcerik);
      const tekrarSorular = Array.isArray(tekrarVeri.sorular) ? (tekrarVeri.sorular as UretilenSoru[]) : [];
      if (tekrarSorular.length > 0) sorular = tekrarSorular.map(uretilenSoruAiTemizle);
    }

    // DALL-E modu: her soruya görsel üret
    if (gorselMod === 'dalle') {
      for (const soru of sorular) {
        if (soru.gorselPrompt) {
          soru.gorselUrl = await gorselUret(soru.gorselPrompt) ?? undefined;
        }
      }
    }

    // 🧹 SVG normalize: width/height kaldır, viewBox + preserveAspectRatio + responsive style ekle.
    sorular = sorular.map((s) => {
      if (s?.svgGorsel) {
        try { s.svgGorsel = svgNormalize(s.svgGorsel); } catch { /* yoksay */ }
      }
      return s;
    });

    // ⚡ Zayıf/eksik SVG → şablon veya yeniden üret (tüm dersler)
    if (gorselMod === 'svg') {
      for (let i = 0; i < sorular.length; i++) {
        const s = sorular[i];
        if (!s) continue;
        const metin = (s.metin || '').replace(/<[^>]+>/g, ' ');
        const svgHam = s.svgGorsel ? svgNormalize(s.svgGorsel) : '';
        const zayif = !svgHam || gorselSvgZayifMi(girdi.ders, svgHam, metin);
        if (!zayif) continue;
        try {
          const duzeltilmis = await gorselSvgKaliteDuzelt(girdi, s, svgUretimModel, sistem);
          if (duzeltilmis) {
            sorular[i] = { ...s, svgGorsel: duzeltilmis };
          }
        } catch (e) {
          logger.warn(`[AI] SVG kalite düzeltme (${girdi.ders}, soru ${i + 1}): ${(e as Error).message}`);
        }
      }
    }

    return sorular;
  };

  try {
    // Büyük adetlerde tek seferde üretim daha çok bozuluyor (JSON/timeout). Parçalayarak daha stabil üret.
    const hedef = Math.max(1, Number(girdi.sayi || 1));
    const tum: UretilenSoru[] = [];
    for (let kalan = hedef; kalan > 0; kalan -= MAX_URETIM_PARTI) {
      const parti = Math.min(MAX_URETIM_PARTI, kalan);
      const sorular = await birPartiUret(parti);
      tum.push(...sorular);
    }
    return {
      sorular: tum.slice(0, hedef),
      kullanılanModel: { model: secilenModel, ad: modelAdi(secilenModel) },
      kullanilanKaynaklar: kaynaklar.map((k) => ({
        id: k.id,
        dokumanId: k.dokumanId,
        dokumanBaslik: k.dokumanBaslik,
        benzerlik: Number(k.benzerlik.toFixed(3)),
      })),
    };
  } catch (err: unknown) {
    const hata = err as { message?: string; response?: { data?: unknown; status?: number } };
    const detay = hata?.response?.data ? JSON.stringify(hata.response.data) : hata?.message;
    logger.error(`OpenRouter hata [${secilenModel}]: ${detay}`);
    throw new Error(`OpenRouter API hatası (${modelAdi(secilenModel)}): ${hata?.message}`);
  }
}

export async function ogrenciAnalizOlustur(veri: {
  ogrenciAd: string;
  zayifKonular: Array<{ konu: string; ders: string; basari: number }>;
  dersPerformanslari: Array<{ ders: string; ortalama: number }>;
  ortalamaNe: number;
}) {
  const prompt = `
Sen bir eğitim danışmanısın. Öğrenci performansını analiz et ve kişiselleştirilmiş geri bildirim ver.

Öğrenci: ${veri.ogrenciAd}
Ortalama Net: ${veri.ortalamaNe}
Zayıf Konular: ${JSON.stringify(veri.zayifKonular)}
Ders Performansları: ${JSON.stringify(veri.dersPerformanslari)}

Aşağıdaki formatta JSON döndür:
{
  "genelDegerlendirme": "genel değerlendirme metni",
  "kuvvetliYonler": ["kuvvetli yön 1", "kuvvetli yön 2"],
  "geliştirmeGerekli": ["alan 1", "alan 2"],
  "oncelikliKonular": ["konu 1", "konu 2", "konu 3"],
  "motivasyonMesaji": "kişiselleştirilmiş motivasyon mesajı",
  "tahminiHedefPuan": 85.5
}
`;

  try {
    const icerik = await openrouterChat('anthropic/claude-sonnet-4.6', [{ role: 'user', content: prompt }]);
    return jsonAyikla(icerik);
  } catch (err) {
    logger.error('AI analiz hatası:', err);
    return { genelDegerlendirme: 'Analiz şu an yapılamıyor, lütfen daha sonra deneyin.' };
  }
}

export type StudyPlanCikti = {
  baslik: string;
  hedefler: { kisa: string; orta: string; uzun: string };
  gorevler: Array<{ baslik: string; ders: string; konu: string; sureDakika: number; gun: number }>;
};

export function studyPlanNormalize(
  ham: unknown,
  zayifKonular: Array<{ konu: string; ders: string; basari?: number }>,
): StudyPlanCikti {
  const kaynak = ham && typeof ham === 'object' ? (ham as Record<string, unknown>) : {};
  const gorevlerHam = Array.isArray(kaynak.gorevler) ? kaynak.gorevler : [];
  const gorevler = gorevlerHam
    .map((g) => {
      if (!g || typeof g !== 'object') return null;
      const o = g as Record<string, unknown>;
      const baslik = String(o.baslik || '').trim();
      const ders = String(o.ders || '').trim();
      const konu = String(o.konu || '').trim();
      const sureDakika = Number(o.sureDakika) > 0 ? Number(o.sureDakika) : 45;
      const gun = Number(o.gun) > 0 ? Math.min(30, Math.round(Number(o.gun))) : 1;
      if (!baslik || !ders) return null;
      return { baslik, ders, konu: konu || baslik, sureDakika, gun };
    })
    .filter(Boolean) as StudyPlanCikti['gorevler'];

  if (gorevler.length === 0) return studyPlanSablon(zayifKonular);

  const hedeflerHam = kaynak.hedefler && typeof kaynak.hedefler === 'object' ? (kaynak.hedefler as Record<string, unknown>) : {};
  return {
    baslik: String(kaynak.baslik || '30 Günlük Çalışma Planı'),
    hedefler: {
      kisa: String(hedeflerHam.kisa || 'Zayıf konuları güçlendir'),
      orta: String(hedeflerHam.orta || 'Düzenli çalışma alışkanlığı'),
      uzun: String(hedeflerHam.uzun || 'Hedef puana ulaş'),
    },
    gorevler,
  };
}

export async function studyPlanOlustur(veri: {
  ogrenci: { ad: string; soyad: string; sinif?: string | null };
  zayifKonular: Array<{ konu: string; ders: string; basari: number }>;
  hedefUniversite?: string | null;
}): Promise<StudyPlanCikti> {
  const prompt = `
Sen bir YKS/LGS çalışma planı uzmanısın. 30 günlük kişiselleştirilmiş çalışma planı oluştur.

Öğrenci: ${veri.ogrenci.ad} ${veri.ogrenci.soyad}
Sınıf: ${veri.ogrenci.sinif || 'Belirtilmemiş'}
Hedef Üniversite: ${veri.hedefUniversite || 'Belirtilmemiş'}
Zayıf Konular: ${JSON.stringify(veri.zayifKonular)}

KURALLAR:
- Her gün tam 4 çalışma bloğu olacak (4 × 45 dakika = günlük 3 saat).
- Toplam 30 gün; gun alanı 1–30 arası.
- Her görevin sureDakika değeri 45 olmalı.
- Zayıf konulara öncelik ver; ders ve konu adlarını Türkçe yaz.

Yalnızca JSON döndür:
{
  "baslik": "plan başlığı",
  "hedefler": {
    "kisa": "1 aylık hedef",
    "orta": "3 aylık hedef",
    "uzun": "sınav hedefi"
  },
  "gorevler": [
    {
      "baslik": "görev adı",
      "ders": "ders adı",
      "konu": "konu adı",
      "sureDakika": 45,
      "gun": 1
    }
  ]
}
`;

  try {
    const icerik = await openrouterChat('openai/gpt-4.1', [{ role: 'user', content: prompt }], { temperature: 0.6, max_tokens: 4000 });
    return studyPlanNormalize(jsonAyikla(icerik), veri.zayifKonular);
  } catch (err) {
    logger.error('Study plan hatası:', err);
    return studyPlanSablon(veri.zayifKonular);
  }
}

// Fallback şablon soru üretici (AI yokken)
function soruSablon(girdi: SoruUretGirdisi): UretilenSoru[] {
  return Array.from({ length: girdi.sayi }, (_, i) => ({
    metin: `${girdi.konu} konusu ile ilgili ${i + 1}. soru metni buraya gelecektir.`,
    secenekler: { A: 'Seçenek A', B: 'Seçenek B', C: 'Seçenek C', D: 'Seçenek D', E: 'Seçenek E' },
    dogruCevap: 'A',
    kazanim: `${girdi.konu} kazanımını kavrar`,
  }));
}

function studyPlanSablon(zayifKonular: Array<{ konu: string; ders: string }>): StudyPlanCikti {
  const konular = zayifKonular.length > 0 ? zayifKonular : [{ konu: 'Temel tekrar', ders: 'Genel' }];
  const gorevler: StudyPlanCikti['gorevler'] = [];
  for (let gun = 1; gun <= 30; gun += 1) {
    for (let blok = 0; blok < 4; blok += 1) {
      const k = konular[(gun + blok) % konular.length];
      gorevler.push({
        baslik: `${k.konu} — ${blok + 1}. blok`,
        ders: k.ders,
        konu: k.konu,
        sureDakika: 45,
        gun,
      });
    }
  }
  return {
    baslik: '30 Günlük Çalışma Planı (4×45 dk)',
    hedefler: { kisa: 'Net artışı', orta: 'Zayıf konuları güçlendir', uzun: 'Hedef puana ulaş' },
    gorevler,
  };
}

const STEM_DERS_ANAHTAR = [
  'matematik',
  'fizik',
  'kimya',
  'biyoloji',
  'geometri',
  'trigonometri',
  'analitik',
  'istatistik',
  'olasılık',
  'integral',
  'türev',
];

/** Matematik/fen vb. için ikinci kontrol (LLM) uygulanır */
export function stemKontrolGerekli(ders: string): boolean {
  const d = ders.toLowerCase();
  return STEM_DERS_ANAHTAR.some((k) => d.includes(k));
}

async function tekModelCrossCheck(model: OpenRouterModel, prompt: string): Promise<{ harf: 'A'|'B'|'C'|'D'|'E'; gerekce: string }> {
  const icerik = await openrouterChat(
    model,
    [{ role: 'user', content: prompt }],
    model.includes('o1') ? {} : { temperature: 0.05, max_tokens: 600 },
    120000,
  );
  const j = jsonAyikla(icerik) as Record<string, unknown>;
  const raw = typeof j.dogruHarf === 'string' ? j.dogruHarf.trim().toUpperCase() : '';
  const harf = (['A', 'B', 'C', 'D', 'E'] as const).includes(raw as any) ? (raw as any) : 'A';
  const gerekce = typeof j.gerekce === 'string' ? j.gerekce : '';
  return { harf, gerekce };
}

/**
 * BAĞIMSIZ ÇÖZÜCÜ — 2 farklı modelle çapraz kontrol yapar.
 * - İki model aynı şıkkı verirse o şıkkı döner (yüksek güven).
 * - Farklı verirlerse 3. modeli (tie-breaker) çalıştırır.
 * - 3 model 3 farklı cevap verirse ilk modelin cevabı (en güçlü) döner.
 */
export async function soruCrossCheckBagimsiz(veri: {
  ders: string;
  metin: string;
  secenekler: Record<string, string>;
}): Promise<{ dogruHarf: 'A' | 'B' | 'C' | 'D' | 'E'; gerekce: string; model: string }> {
  const stem = stemKontrolGerekli(veri.ders);
  const metinDuz = veri.metin.replace(/<[^>]+>/g, ' ').slice(0, 4500);
  const { A = '', B = '', C = '', D = '', E = '' } = veri.secenekler;

  const prompt = `Sen ${veri.ders} dalında uzman bir öğretmensin. Aşağıdaki çoktan seçmeli soruyu BAĞIMSIZ çöz ve tek doğru şıkkın harfini ver.
ZİNCİRLEME DÜŞÜN — adım adım çöz, ardından tek harf seç. Aşırı yorum yapma; soru kökündeki verileri kullan.

Yanıtını SADECE JSON ver (başka hiçbir metin yazma):
{"dogruHarf":"A"|"B"|"C"|"D"|"E","gerekce":"kısa Türkçe — çözüm özeti"}

Soru:
${metinDuz}

Şıklar:
A: ${A}
B: ${B}
C: ${C}
D: ${D}
E: ${E}`;

  // Birinci model (öncelikli): STEM'de o3-mini, sözel'de Claude.
  const m1: OpenRouterModel = stem ? 'openai/o4-mini' : 'anthropic/claude-sonnet-4.6';
  // İkinci model: birbirinin tersi (görüş çeşitliliği için).
  const m2: OpenRouterModel = stem ? 'anthropic/claude-sonnet-4.6' : 'openai/gpt-4.1';

  let r1: { harf: 'A'|'B'|'C'|'D'|'E'; gerekce: string } | null = null;
  let r2: { harf: 'A'|'B'|'C'|'D'|'E'; gerekce: string } | null = null;
  try { r1 = await tekModelCrossCheck(m1, prompt); } catch (e) { logger.warn(`[CC] m1 ${m1} fail: ${(e as Error).message}`); }
  try { r2 = await tekModelCrossCheck(m2, prompt); } catch (e) { logger.warn(`[CC] m2 ${m2} fail: ${(e as Error).message}`); }

  if (r1 && r2 && r1.harf === r2.harf) {
    return { dogruHarf: r1.harf, gerekce: `${r1.gerekce} (iki modelle uyumlu)`.slice(0, 600), model: `${m1} + ${m2}` };
  }

  // Tie-breaker: 3. model.
  let r3: { harf: 'A'|'B'|'C'|'D'|'E'; gerekce: string } | null = null;
  const m3: OpenRouterModel = 'openai/gpt-4.1';
  if (m3 !== m1 && m3 !== m2) {
    try { r3 = await tekModelCrossCheck(m3, prompt); } catch (e) { logger.warn(`[CC] m3 ${m3} fail: ${(e as Error).message}`); }
  }

  // Çoğunluk oylaması.
  const oy: Record<string, number> = {};
  for (const r of [r1, r2, r3]) if (r) oy[r.harf] = (oy[r.harf] || 0) + 1;
  const sira = Object.entries(oy).sort((a, b) => b[1] - a[1]);
  const kazanan = (sira[0]?.[0] as 'A'|'B'|'C'|'D'|'E' | undefined) || r1?.harf || r2?.harf || 'A';
  const gerekceler = [r1?.gerekce, r2?.gerekce, r3?.gerekce].filter(Boolean).join(' | ').slice(0, 800);
  return { dogruHarf: kazanan, gerekce: gerekceler || 'çoğunluk oylaması', model: `${m1} + ${m2}${r3 ? ' + ' + m3 : ''}` };
}

/**
 * Tüm dersler: doğru şıkkın soru kökü + şıklarla tutarlılığı (matematik/fen: hesap; sözel: mantık/dil).
 * Kesin matematiksel ispat değildir; otomatik düzeltme için onerilenCevap dönebilir.
 */
export async function soruCevapTutarlilikDogrula(veri: {
  ders: string;
  metin: string;
  secenekler: Record<string, string>;
  dogruCevap: string;
  /** Referans görsel/PDF üretimi: model reddeder ama düzeltme önermezse üretimdeki şıkkı koru */
  referansVaryasyonu?: boolean;
}): Promise<{ tutarli: boolean; gerekce: string; onerilenCevap?: string | null }> {
  const { A = '', B = '', C = '', D = '', E = '' } = veri.secenekler;
  const metinDuz = veri.metin.replace(/<[^>]+>/g, ' ').slice(0, 4500);
  const stem = stemKontrolGerekli(veri.ders);

  const prompt = stem
    ? `Sen bir ${veri.ders} öğretmenisin. Çoktan seçmeli soruda verilen "İşaretlenen doğru cevap" harfi, soru kökü ve şıklarla tutarlı mı?
Sayısal/geometrik ise işlemi zihinden veya adım adım kontrol et; kesin yanlış şık işaretliyse tutarli:false ver.

Yanıtını SADECE geçerli JSON olarak ver:
{"tutarli": true veya false, "gerekce": "kısa Türkçe", "onerilenCevap": "A"|"B"|"C"|"D"|"E"|null}

Soru metni:
${metinDuz}

Şıklar:
A: ${A}
B: ${B}
C: ${C}
D: ${D}
E: ${E}

İşaretlenen doğru cevap: ${veri.dogruCevap}

Kesin olarak yanlışsa tutarli:false ve onerilenCevap ile düzelt. Soru muğlak veya emin değilsen tutarli:true ve gerekce'de belirt.`
    : `Sen bir ${veri.ders} alanında deneyimli sınav uzmanısın (sözel alanlar dahil).
Sözel sorularda birden fazla şık makul görünebilir; şüphede tutarli:true ver.
tutarli:false yalnızca işaretlenen şık açık biçimde yanlışsa kullanılmalı.

Verilen çoktan seçmeli soruda işaretlenmiş doğru şık (${veri.dogruCevap}), soru kökü ve tüm şıklarla birlikte makul ve savunulabilir mi?
Yanıtını SADECE geçerli JSON olarak ver:
{"tutarli": true veya false, "gerekce": "kısa Türkçe", "onerilenCevap": "A"|"B"|"C"|"D"|"E"|null}

Soru metni:
${metinDuz}

Şıklar:
A: ${A}
B: ${B}
C: ${C}
D: ${D}
E: ${E}

İşaretlenen doğru cevap: ${veri.dogruCevap}

Kesin olarak yanlışsa tutarli:false ve onerilenCevap ile düzelt. Muğlak veya tartışmalıysa tutarli:true.`;

  const icerik = await openrouterChat(
    'openai/gpt-4.1-mini',
    [{ role: 'user', content: prompt }],
    { temperature: 0.12, max_tokens: 500 },
    90000
  );
  const j = jsonAyikla(icerik) as Record<string, unknown>;
  let tutarli = typeof j.tutarli === 'boolean' ? j.tutarli : true;
  let gerekce = typeof j.gerekce === 'string' ? j.gerekce : '';
  let onerilenCevap: string | null | undefined = j.onerilenCevap as string | null | undefined;
  if (typeof onerilenCevap === 'string') {
    const u = onerilenCevap.trim().toUpperCase();
    onerilenCevap = /^[A-E]$/.test(u) ? u : null;
  } else {
    onerilenCevap = null;
  }
  // Model reddeder ama alternatif şık önermezse yanlış pozitif olabilir.
  if (!tutarli && onerilenCevap == null && (!stem || veri.referansVaryasyonu)) {
    tutarli = true;
    const etiket = veri.referansVaryasyonu ? 'Referans üretim' : 'Sözel muğlaklık';
    gerekce = gerekce
      ? `${gerekce} [${etiket}: alternatif şık önerilmediği için mevcut cevap kabul edildi.]`
      : `${etiket}: mevcut cevap kabul edildi.`;
  }
  return { tutarli, gerekce, onerilenCevap };
}

/** @deprecated soruCevapTutarlilikDogrula kullanın */
export const stemCevapDogrula = soruCevapTutarlilikDogrula;

/**
 * Soru kökünün bilinen bir kaynaktan doğrudan kopya olup olmadığını ayırt eder (sezgisel LLM kontrolü).
 */
export async function soruOzgunlukKontrol(metin: string, ders: string): Promise<{ ozgun: boolean; gerekce: string }> {
  const duz = metin.replace(/<[^>]+>/g, ' ').slice(0, 4000);
  const prompt = `Sen telif ve sınav etiği uzmanısın.
Yalnızca belirli bir kaynaktan kelimesi kelimesine kopya olduğuna kesin eminsen ozgun:false ver.
ÖSYM/MEB tarzı klasik kalıplar, aynı kazanımı ölçen benzer sorular, yeniden yazılmış kökler ve AI üretimi ozgun:true sayılır.
Şüphe varsa ozgun:true ver.

Yanıtını SADECE JSON ver:
{"ozgun": true veya false, "gerekce": "kısa Türkçe"}

Ders: ${ders}
Soru kökü:
${duz}`;

  const icerik = await openrouterChat(
    'openai/gpt-4.1-mini',
    [{ role: 'user', content: prompt }],
    { temperature: 0.1, max_tokens: 350 },
    60000
  );
  const j = jsonAyikla(icerik) as Record<string, unknown>;
  let ozgun = typeof j.ozgun === 'boolean' ? j.ozgun : true;
  const gerekce = typeof j.gerekce === 'string' ? j.gerekce : '';
  if (!ozgun && /gibi görün|belirsiz|muhtemelen|olabilir|şüphe|emin değil/i.test(gerekce)) {
    ozgun = true;
  }
  return { ozgun, gerekce };
}

// ── ÖĞRETMEN AI YARDIMCISI ──────────────────────────────────────
/**
 * Öğretmen, mevcut bir soruyu komutla düzeltmek istediğinde çağrılır.
 * Örn: "B'yi yanlış yap, C doğru olsun", "metni daha sade yaz", "şıkları karıştır".
 *
 * AI sadece istenen alanları değiştirir; geri kalanını AYNEN korur.
 * Dönüş: { metinHtml?, secenekler?, dogruCevap?, kazanim?, zorluk?, aciklama }
 */
export interface SoruDuzeltSonucu {
  metinHtml?: string;
  svgGorsel?: string;
  secenekler?: Record<string, string>;
  dogruCevap?: string;
  kazanim?: string;
  zorluk?: string;
  aciklama: string;
  uyari?: string;
}

function metinHtmlSvgAyir(metinHtml: string): { metin: string; svg: string | null } {
  const ham = String(metinHtml || '');
  const m = ham.match(/<div class="soru-svg-gorsel"[^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return { metin: ham.trim(), svg: null };
  const metin = ham.replace(/<div class="soru-svg-gorsel"[^>]*>[\s\S]*?<\/div>/i, '').trim();
  const svgMatch = m[1].match(/<svg[\s\S]*?<\/svg>/i);
  return { metin, svg: svgMatch ? svgMatch[0].trim() : m[1].trim() || null };
}

function metinHtmlSvgBirlestir(metinHtml: string, svg?: string | null): string {
  const { metin } = metinHtmlSvgAyir(metinHtml);
  const svgHam = String(svg || '').trim();
  if (!svgHam) return metin;
  const norm = svgNormalize(svgHam);
  if (!norm) return metin;
  return `${metin}${metin ? '\n' : ''}<div class="soru-svg-gorsel">${norm}</div>`.trim();
}

export interface SoruDuzeltGirdisi {
  soru: {
    metinHtml: string;
    secenekler: Record<string, string>;
    dogruCevap: string;
    kazanim?: string | null;
    zorluk?: string;
    ders?: string;
    konu?: string;
  };
  komut: string;
  gecmis?: { rol: 'kullanici' | 'asistan'; metin: string }[];
  hedefKazanim?: string;
}

export async function soruDuzeltKomutu(girdi: SoruDuzeltGirdisi): Promise<SoruDuzeltSonucu> {
  const { soru, komut, gecmis = [], hedefKazanim } = girdi;
  const parcalar = parseMetinParcalari(soru.metinHtml || '');
  const sikSayisi = Object.keys(soru.secenekler || {}).filter((k) => /^[A-E]$/.test(k)).length || 5;
  const sikAraligi = sikSayisi === 4 ? 'A–D' : 'A–E';
  const { metin: metinKok, svg: mevcutSvg } = metinHtmlSvgAyir(parcalar.soruHtml || '');
  const sekilKomutu = /şekil|grafik|svg|diyagram|çiz|görsel|figür|tablo|balon|bubble|dialog|diyalog|resim|foto/i.test(komut);
  const ingilizceDers = yabanciDilDersiMi(soru.ders);
  const dilYonergesi = soruUretimDiliYonergesi(soru.ders);

  const sistem = `${ingilizceDers ? 'You are an expert English exam item editor for MEB/YÖK.' : 'Sen bir Türk eğitim içerik editörüsün.'} Öğretmenin verdiği komuta göre BİR SORUYU düzenliyorsun.
Görevlerin:
- Yalnızca öğretmenin söylediği değişiklikleri yap; komut dışındaki metni, paragrafları, önceki eklemeleri ve şıkları AYNEN koru.
- ARTIRIMLI DÜZENLEME: Bu bir sohbet oturumu; önceki turda yapılmış değişiklikler (alta/üste eklenen cümleler vb.) korunmalı. Yeni komut eski düzenlemeleri silmemeli — yalnızca açıkça "değiştir/sil/yeniden yaz" denmedikçe üzerine ekle veya hedef alanı güncelle.
- Soru hâlâ doğru olmalı: cozum tutarlılığı, tek doğru cevap, anlamlı çeldiriciler.
- Şık seti ${sikAraligi} olmalı; daha fazla/az şık ÜRETME.
- Doğru cevap mutlaka şık seti içinde olmalı.
- Şekil/grafik/diyalog balonu/tablo isteniyorsa "svgGorsel" alanında geçerli inline <svg>...</svg> üret (viewBox, xmlns zorunlu). Şekil değişmiyorsa svgGorsel gönderme.
${dilYonergesi ? `\n${dilYonergesi}` : ''}
${sekilKomutu && /ingilizce|english/i.test(String(soru.ders || '')) ? `\n${INGILIZCE_SVG_YONERGESI}` : ''}
${hedefKazanim?.trim() ? `- ZORUNLU HEDEF KAZANIM: "${hedefKazanim.trim()}". Düzenlenen soruyu bu kazanıma uygun hale getir ve "kazanim" alanını bu hedefe göre güncelle.` : ''}

Çıkış:
- SADECE geçerli bir JSON döndür. Markdown / açıklama yazısı YOK.
- JSON şeması:
  {
    "metinHtml":   "<p>...</p>"            // ops. değiştirildiyse (yalnızca soru kökü; SVG buraya yazma)
    "svgGorsel":   "<svg viewBox='0 0 600 400' xmlns='http://www.w3.org/2000/svg'>...</svg>" // ops. şekil değiştiyse
    "secenekler":  { "A":"...", "B":"...", "C":"...", "D":"..."${sikSayisi === 5 ? ', "E":"..."' : ''} }, // ops.
    "dogruCevap":  "B",                    // ops.
    "kazanim":     "...",                   // ops.
    "zorluk":      "KOLAY|ORTA|ZOR",        // ops.
    "aciklama":    "Yaptığın değişikliği bir cümleyle anlat.",
    "uyari":       "Mantıksal sorun gördüysen, kullanıcı için kısa uyarı." // ops.
  }
- Değiştirmediğin alanı JSON'a HİÇ koyma (undefined bırak).
- "metinHtml" gönderiyorsan soru kökünde gerçekten okunur metin olmalı; yalnızca boş/boşluk etiketleri veya anlamsız HTML GÖNDERME — kökü değiştiremiyorsan bu anahtarı ekleme.`;

  const sorununOzeti = `MEVCUT SORU:
- Ders: ${soru.ders || '-'}
- Konu: ${soru.konu || '-'}
- Zorluk: ${soru.zorluk || '-'}
- Kazanım: ${soru.kazanim || '-'}

metinHtml (soru kökü):
${metinKok || ''}

${parcalar.aciklamaHtml ? `soruAciklamasi:\n${parcalar.aciklamaHtml}\n` : ''}
${parcalar.cozumHtml ? `cozumMetni:\n${parcalar.cozumHtml}\n` : ''}
${mevcutSvg ? `mevcut svgGorsel:\n${mevcutSvg}\n` : 'mevcut svgGorsel: yok\n'}
${sekilKomutu ? 'NOT: Öğretmen şekil/grafik ile ilgili bir değişiklik istiyor; gerekirse svgGorsel üret veya güncelle.\n' : ''}
secenekler:
${JSON.stringify(soru.secenekler, null, 2)}

dogruCevap: ${soru.dogruCevap}

ÖĞRETMENİN KOMUTU:
${komut.trim()}`;

  const mesajlar: { role: string; content: string }[] = [
    { role: 'system', content: sistem },
  ];
  // Sohbet geçmişi (kısa)
  for (const m of gecmis.slice(-6)) {
    mesajlar.push({ role: m.rol === 'kullanici' ? 'user' : 'assistant', content: m.metin });
  }
  mesajlar.push({ role: 'user', content: sorununOzeti });

  // Hızlı ve uygun maliyetli model — gpt-4.1
  const icerik = await openrouterChat('openai/gpt-5-mini', mesajlar, { temperature: 0.2, max_tokens: 2000 });
  const veri = jsonAyikla(icerik) as Record<string, unknown>;

  // Validation: dogruCevap şık seti içinde mi?
  const yeniSecenekler = (veri.secenekler && typeof veri.secenekler === 'object') ? veri.secenekler as Record<string, string> : undefined;
  const yeniDogru = typeof veri.dogruCevap === 'string' ? veri.dogruCevap.toUpperCase() : undefined;
  let uyari = typeof veri.uyari === 'string' ? veri.uyari : undefined;
  if (yeniDogru && yeniSecenekler && !(yeniDogru in yeniSecenekler)) {
    uyari = (uyari || '') + ' (Doğru cevap olarak işaretlenen şık şık setinde yok; lütfen kontrol edin.)';
  }
  if (yeniDogru && !yeniSecenekler && !(yeniDogru in (soru.secenekler || {}))) {
    uyari = (uyari || '') + ` (Doğru cevap "${yeniDogru}" mevcut şık setinde yok.)`;
  }

  let metinKokOut: string | undefined =
    typeof veri.metinHtml === 'string' ? veri.metinHtml : undefined;
  if (metinKokOut !== undefined) {
    const gorunurUzunluk = metinKokOut
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim().length;
    if (gorunurUzunluk === 0) metinKokOut = undefined;
  }

  let svgOut: string | undefined =
    typeof veri.svgGorsel === 'string' ? veri.svgGorsel : undefined;
  if (svgOut !== undefined) {
    const norm = svgNormalize(svgOut);
    svgOut = norm.length >= 20 ? norm : undefined;
  }

  const birlesikMetin =
    metinKokOut !== undefined || svgOut !== undefined
      ? metinHtmlSvgBirlestir(
          metinKokOut ?? metinKok,
          svgOut ?? (sekilKomutu ? null : mevcutSvg),
        )
      : undefined;

  const degisiklikVar = Boolean(
    birlesikMetin ||
    yeniSecenekler ||
    yeniDogru ||
    (typeof veri.kazanim === 'string' && veri.kazanim.trim()) ||
    (typeof veri.zorluk === 'string' && veri.zorluk.trim()),
  );

  return {
    metinHtml: birlesikMetin,
    svgGorsel: svgOut,
    secenekler: yeniSecenekler,
    dogruCevap: yeniDogru,
    kazanim: typeof veri.kazanim === 'string' ? veri.kazanim : undefined,
    zorluk: typeof veri.zorluk === 'string' ? veri.zorluk : undefined,
    aciklama: typeof veri.aciklama === 'string' ? veri.aciklama : 'Soru güncellendi.',
    uyari: degisiklikVar
      ? uyari?.trim() || undefined
      : uyari?.trim() ||
        'AI yanıtından uygulanabilir değişiklik çıkarılamadı. Komutu daha net yazıp tekrar deneyin.',
  };
}
