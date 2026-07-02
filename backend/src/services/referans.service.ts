/**
 * Referans Tabanlı Soru Üretimi
 *
 * PDF: Tüm sayfalar metin olarak okunur; sorular tespit edilir; her biri için özgün varyasyon üretilir.
 * Görsel: Tek sayfa analizi (önceki davranış).
 */

import axios from 'axios';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import {
  fizikDersiMi,
  gorselSvgKaliteDuzelt,
  modelSec,
  modelSecGorselUretim,
  openrouterChat,
  stemKontrolGerekli,
  svgNormalize,
} from './ai.service';
import { OSYM_FIZIK_DEVRE_KURAL } from '../utils/fizikSvgYardim';
import {
  LATEX_KATEX_YONERGESI,
  SVG_GEOMETRI_ACI_KURALI,
  uretilenSoruAiTemizle,
} from '../utils/aiSoruMetinTemizle';
import {
  INGILIZCE_SVG_YONERGESI,
  TABLO_SVG_YONERGESI,
  referansDilKurali,
  soruUretimDili,
  yabanciDilDersiMi,
} from '../utils/yabanciDilSoru';
import {
  OSYM_CIZGI_GRAFIK_SVG_ORNEK,
  OSYM_CIZGI_GRAFIK_SVG_YONERGESI,
} from '../utils/grafikSvgSablonu';
import { pdfBufferdanMetinDetay } from '../utils/pdfMetinCikar';
import { getOpenRouterApiKey } from '../config/openrouter';
import { AppHatasi } from '../middlewares/hata.middleware';
import { openrouterHttpHeaders } from '../utils/openrouterHeaders';
import {
  OPENROUTER_YEDEK_MODELLER,
  openrouterModelKullanilamaz,
} from '../utils/openrouterHata';

// ── Sabitler ─────────────────────────────────────────────────────

const ANALIZ_MODEL = process.env.REFERANS_ANALIZ_MODEL || 'anthropic/claude-sonnet-4.6';
/** Görsel analiz ve soru üretiminde varsayılan; boşsa modelSec(ders) kullanılır */
const URETIM_MODEL = process.env.REFERANS_URETIM_MODEL || '';
const PDF_MAX_CHARS = Math.min(
  parseInt(process.env.REFERANS_PDF_MAX_CHARS || '500000', 10) || 500000,
  900000
);
/** Uzun PDF'lerde sayfa grupları (tek LLM çağrısı başına) */
const SAYFA_GRUBU = parseInt(process.env.REFERANS_PDF_SAYFA_GRUBU || '6', 10) || 6;
/** Tek seferde okunabilecek karakter eşiği — altında tek parça soru çıkarımı */
const TEK_PARCA_KARAKTER = parseInt(process.env.REFERANS_PDF_TEK_PARCA_MAX || '120000', 10) || 120000;
/** Varyasyon üretiminde her API çağrısındaki soru sayısı */
const URETIM_PARTI_BOYUTU = parseInt(process.env.REFERANS_URETIM_PARTI || '10', 10) || 10;
const URETIM_PARTI_SVG = parseInt(process.env.REFERANS_URETIM_PARTI_SVG || '2', 10) || 2;

function referansPartiBoyutu(analiz: ReferansAnalizi, gorselMod?: ReferansGorselMod): number {
  if (referansSvgAktifMi(analiz, gorselMod)) {
    return Math.max(1, Math.min(URETIM_PARTI_BOYUTU, URETIM_PARTI_SVG));
  }
  return URETIM_PARTI_BOYUTU;
}

async function referansPartiArasiBekle(): Promise<void> {
  const ms = parseInt(process.env.REFERANS_PARTI_ARASI_MS || '800', 10) || 800;
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}

// ── Tip tanımları ────────────────────────────────────────────────

export interface ReferansPdfSoruOzeti {
  sira: number;
  sayfa?: number;
  /** Ölçülen kavram / kök özeti — telif için orijinal metin kopyalanmaz */
  ozet: string;
  /** Orijinal sorunun tam metni, şıkları ve yapısı (benzer soru üretiminde kullanılır) */
  soruDetay?: string;
}

export interface ReferansAnalizi {
  dersAdi: string;
  konular: string[];
  zorlukSeviyesi: string;
  soruTipleri: string[];
  ogretimTuru: string;
  formatNotu: string;
  ornek_soru_sayisi: number;
  /** Analiz: soruda grafik/şekil var mı */
  gorselGerekli?: boolean;
  /** Kullanıcı görsel (JPEG/PNG) yüklediyse true — SVG üretimi zorunlu */
  kaynakGorsel?: boolean;
  /** PDF analizinde doldurulur */
  sayfa_sayisi?: number;
  tespit_edilen_soru_sayisi?: number;
  referans_sorular?: ReferansPdfSoruOzeti[];
  tam_metin_okundu?: boolean;
}

export type ReferansGorselMod = 'oto' | 'svg' | 'yok';

const GORSEL_ANAHTAR = [
  'grafik', 'pasta', 'dilim', 'sütun', 'sutun', 'çubuk', 'cubuk', 'histogram',
  'çizgi grafik', 'geometri', 'şekil', 'sekil', 'üçgen', 'ucgen', 'çember', 'cember',
  'açı', 'aci', 'koordinat', 'diyagram', 'tablo', 'veri analiz', 'görsel yorum',
  'chart', 'pie', 'bar', 'daire', 'grafikte', 'şekildeki', 'yukarıdaki grafik',
];

export function referansAnaliziNormalize(j: Partial<ReferansAnalizi>): ReferansAnalizi {
  const konularHam = Array.isArray(j.konular)
    ? j.konular.map(String).filter(Boolean)
    : typeof (j as { konu?: unknown }).konu === 'string'
      ? [(j as { konu: string }).konu]
      : [];
  const soruTipleriHam = Array.isArray(j.soruTipleri)
    ? j.soruTipleri.map(String).filter(Boolean)
    : typeof (j as { soruTipi?: unknown }).soruTipi === 'string'
      ? [(j as { soruTipi: string }).soruTipi]
      : [];

  const ham = {
    dersAdi: typeof j.dersAdi === 'string' && j.dersAdi.trim() ? j.dersAdi.trim() : 'Genel',
    konular: konularHam.length ? konularHam : ['Genel'],
    zorlukSeviyesi: j.zorlukSeviyesi || 'ORTA',
    soruTipleri: soruTipleriHam.length ? soruTipleriHam : ['çoktan seçmeli'],
    ogretimTuru: j.ogretimTuru || 'YKS',
    formatNotu: j.formatNotu || 'ÖSYM tarzı, 5 şık',
    ornek_soru_sayisi:
      typeof j.ornek_soru_sayisi === 'number'
        ? j.ornek_soru_sayisi
        : Array.isArray(j.referans_sorular)
          ? j.referans_sorular.length
          : 1,
    gorselGerekli: typeof j.gorselGerekli === 'boolean' ? j.gorselGerekli : undefined,
    kaynakGorsel: j.kaynakGorsel === true,
    referans_sorular: Array.isArray(j.referans_sorular)
      ? j.referans_sorular.map(normalizeReferansSoru).filter((x): x is ReferansPdfSoruOzeti => !!x)
      : [],
    sayfa_sayisi: j.sayfa_sayisi,
    tespit_edilen_soru_sayisi: j.tespit_edilen_soru_sayisi,
    tam_metin_okundu: j.tam_metin_okundu,
  };

  return referansAnaliziDersZenginlestir(ham);
}

/** Dosya adı veya URL'den ders tahmini — AI yanlış sınıflandırdığında güçlü sinyal */
export function referansKaynakAdindanDersTahmin(kaynak: string): string | null {
  if (!kaynak?.trim()) return null;
  const s = kaynak
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[_\s]+/g, '-');

  const kalip: Array<[string, RegExp]> = [
    ['İnkılap Tarihi ve Atatürkçülük', /inkilap|inkılap|ataturkculuk|atatürkçülük/i],
    ['Coğrafya', /cografya|coğrafya|cog-|cogr-/i],
    ['Fen Bilimleri', /fen-bilim|fenbilim|fen-bilimleri|\/fen\//i],
    ['Din Kültürü ve Ahlak Bilgisi', /din-kultur|dinkultur|din-kulturu/i],
    ['Türk Dili ve Edebiyatı', /turk-dili|edebiyat|turkce|türkçe/i],
    ['Matematik', /matematik|mat-|mat\./i],
    ['Geometri', /geometri|geo-/i],
    ['Fizik', /fizik/i],
    ['Kimya', /kimya/i],
    ['Biyoloji', /biyoloji/i],
    ['Felsefe', /felsefe|psikoloji|sosyoloji|mantik|mantık/i],
    ['Tarih', /(?:^|[-/])tarih(?:[-/]|$)|tarih-/i],
    ['İngilizce', /ingilizce|english/i],
    ['Almanca', /almanca/i],
    ['Fransızca', /fransizca|fransızca/i],
  ];
  for (const [ders, rx] of kalip) {
    if (rx.test(s)) return ders;
  }
  return null;
}

const REFERANS_ICERIK_DERS_KALIP: Array<[string, RegExp]> = [
  ['İnkılap Tarihi ve Atatürkçülük', /inkılap|inkilap|atatürkçülük|atatürk|mondros|sevr|lozan|cemiyet|kuva-yi|dünya savaşı|dünya savasi/i],
  ['Coğrafya', /coğrafya|cografya|harita|izohips|nüfus|nufus|iklim tipi|yer şekil|yersekli|plaka hareket|enlem|boylam|akarsu|göl tabanı|kıta|kita|sanayi bölge|tarım alan|turizm|enerji kaynak|nem oran|basınç alan|rüzgar|deprem|volkan|erozyon|havza/i],
  ['Felsefe', /felsefe|sokrates|platon|aristoteles|epistemoloji|ontoloji|psikoloji|sosyoloji|mantık/i],
  ['Din Kültürü ve Ahlak Bilgisi', /din kültürü|din kulturu|ahlak|peygamber|hadis|sünnet|kuran|ayet/i],
  ['Fen Bilimleri', /fen bilim|fen bilimleri|maddenin hal|kuvvet ve hareket|ses ve özellikleri|ışık ve ses|elektrik devreleri|canlılar|besin zinciri|ekosistem|hücre bölünmesi|dna|genetik|kalıtım|adaptasyon|doğal seçilim|mitoz|mayoz|asit ve baz|periyodik sistem|kimyasal tepkime|element|bileşik|karışım|enerji dönüşüm|mevsim|iklim|yer kabuğu|gölge|dünya|güneş|ay|ekvator|kuzey|güney|basınç|basinc|deney|makara|kaldıraç|eğik düzlem|çıkrık/i],
  ['Geometri', /geometri|üçgen|ucgen|açı|aci|çember|cember|orta nokta|pisagor|trigonometri|dikdörtgen|dikdortgen|kare|prizma|silindir|alan|hacim|şekil|sekil|vektör|vektor/i],
  ['Matematik', /matematik|türev|turev|integral|fonksiyon|polinom|logaritma|limit|olasılık|olasilik|permutasyon|kombinasyon|denklem|eşitsizlik|esitsizlik/i],
  ['Fizik', /fizik|kuvvet|devre|hız|hiz|enerji|elektrik|optik|basınç|basinc|ısı|isi/i],
  ['Kimya', /kimya|mol|asit|baz|organik|periyodik|tepkime/i],
  ['Biyoloji', /biyoloji|hücre|hucre|genetik|ekosistem|canlı|canli/i],
  ['Türkçe', /türkçe|turkce|paragraf|anlam|sözcük|sozcuk|dil bilgisi|edebiyat/i],
  ['Tarih', /tarih|osmanlı|selçuklu|ilkçağ|ortaçağ|soğuk savaş|cumhuriyet dönemi/i],
  ['İngilizce', /ingilizce|english|according to|which of the following|look at the picture|read the|speech bubble|dialogue|social media|reading passage|choose the best/i],
];

function referansIceriktenDersTahmin(icerikMetni: string): string | null {
  for (const [ders, rx] of REFERANS_ICERIK_DERS_KALIP) {
    if (rx.test(icerikMetni)) return ders;
  }
  return null;
}

/** "Genel" ders adını konu/özet metninden tahmin eder; dosya adı AI etiketinden önceliklidir */
export function referansAnaliziDersZenginlestir(analiz: ReferansAnalizi, kaynakAdi?: string): ReferansAnalizi {
  const kaynakDers = kaynakAdi ? referansKaynakAdindanDersTahmin(kaynakAdi) : null;
  if (kaynakDers) {
    return { ...analiz, dersAdi: kaynakDers };
  }

  const ana = analiz.dersAdi?.split(',')[0].trim() || '';
  const icerikMetni = [
    ...(analiz.konular || []),
    ...(analiz.soruTipleri || []),
    analiz.formatNotu || '',
    ...(analiz.referans_sorular || []).map((r) => r.ozet + ' ' + (r.soruDetay || '')),
  ].join(' ');

  const icerikDers = referansIceriktenDersTahmin(icerikMetni);
  if (icerikDers) {
    return { ...analiz, dersAdi: icerikDers };
  }

  const barizGecersizGeometri = /yerküre|yerkure|ekvator|gölge boy|golge boy|mevsim|iklim|kuzey yarımküre|güney yarımküre|kuzey yarimkure|guney yarimkure|güneş ışın|gunes isin|deney tüpü|deney tupu|dna|rna|genetik|fotosentez|mitoz|mayoz|asit ve baz|periyodik sistem|element|bileşik|bilesik|kimyasal tepkime|basit makine|kaldıraç|kaldirac|makara|eğik düzlem|egik duzlem|kuvvet ve hareket|elektrik devre|ampermetre|voltmetre|direnç|direnc|paragraf|dil bilgis|noktalama|anlatım bozuk|edebiyat|roman|şiir|inkılap|felsefe/i;

  if (!barizGecersizGeometri.test(icerikMetni)) {
    if (ana && ana.toLowerCase() !== 'genel') return analiz;
  }

  /** Görsel/şekil ağırlıklı referans; konu belirsizse geometri varsay — yabancı dil hariç */
  if (
    referansGorselGerekliMi(analiz) &&
    !yabanciDilDersiMi(ana) &&
    !/ingilizce|english|almanca|frans/i.test(icerikMetni) &&
    !/fizik|kimya|biyoloji|devre|atom|hücre|hucre|organik|periyodik|fen bilim|madde|ekosistem|canlı|canli|enerji|ısı|isi|ses|ışık|isik|gölge|dünya|güneş|ay|ekvator|kuzey|güney|basınç|deney|makara|kaldıraç|eğik düzlem/i.test(icerikMetni)
  ) {
    return { ...analiz, dersAdi: 'Geometri', gorselGerekli: true };
  }
  return analiz;
}

const GRAFIK_SVG_YONERGESI = `
GRAFİK / TABLO SORULARI (ZORUNLU):
- Referansta pasta, sütun, çizgi grafik veya tablo varsa svgGorsel içinde AYNI TÜRDE özgün grafik çiz (veriler farklı olsun).
- Pasta: <path> dilimler + merkez etiketleri; açı derecelerini soru metniyle tutarlı yaz.
- Sütun/çubuk: <rect> sütunlar, eksen çizgileri, ay/mağaza etiketleri.
- Çizgi grafik (koordinat düzlemi): eksen okları, birim etiketleri, mavi veri çizgisi (#2563eb), vurgu noktasında kesik yönlendirme çizgileri.
- Renkler: #3b82f6, #f59e0b, #e11d48, #22c55e; stroke #111827; yazılar font-size 14–16.
- Soru kökünde "grafikte", "şekilde", "tabloda" ifadesi kullan; svg ile uyumlu olsun.
${OSYM_CIZGI_GRAFIK_SVG_YONERGESI}
${OSYM_CIZGI_GRAFIK_SVG_ORNEK}
${TABLO_SVG_YONERGESI}
`;

/** Referans analizinde grafik/şekil gerekip gerekmediğini sezgisel belirler. */
export function referansGorselGerekliMi(analiz: ReferansAnalizi): boolean {
  if (analiz.kaynakGorsel === true) return true;
  if (analiz.gorselGerekli === true) return true;
  if (/geometri/i.test(analiz.dersAdi || '')) return true;
  if (analiz.gorselGerekli === false) return false;
  const metin = [
    analiz.dersAdi,
    ...(analiz.konular || []),
    ...(analiz.soruTipleri || []),
    analiz.formatNotu || '',
    ...(analiz.referans_sorular || []).map((r) => r.ozet),
  ]
    .join(' ')
    .toLowerCase();
  return GORSEL_ANAHTAR.some((k) => metin.includes(k));
}

export function referansSvgAktifMi(analiz: ReferansAnalizi, gorselMod?: ReferansGorselMod): boolean {
  if (gorselMod === 'svg') return true;
  if (gorselMod === 'yok') return false;
  return referansGorselGerekliMi(analiz);
}

/** oto modunda görsel referans → svg üretimine zorla */
export function referansEfektifGorselMod(
  analiz: ReferansAnalizi,
  gorselMod?: ReferansGorselMod
): ReferansGorselMod {
  if (gorselMod === 'yok') return 'yok';
  if (gorselMod === 'svg') return 'svg';
  return referansGorselGerekliMi(analiz) ? 'svg' : 'oto';
}

function referansSoruSvgVarMi(s: ReferansTabanliSoru | undefined): boolean {
  return !!s?.svgGorsel && String(s.svgGorsel).trim().length >= 40;
}

export interface ReferansTabanliSoru {
  metin: string;
  svgGorsel?: string;
  secenekler: { A: string; B: string; C: string; D: string; E: string };
  dogruCevap: string;
  kazanim: string;
  cozumAciklamasi: string;
  /** PDF tam varyasyonunda kaynak sıra */
  kaynakSira?: number;
}

// ── Yardımcı: Görsel → Base64 ───────────────────────────────────

async function gorselBase64e(buffer: Buffer, mimeTuru: string): Promise<string> {
  const optimize = await sharp(buffer)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${optimize.toString('base64')}`;
}

// ── PDF: tüm sayfalar + metin ─────────────────────────────────────

interface PdfDetay {
  text: string;
  pageCount: number;
  pages: Array<{ num: number; text: string }>;
}

async function pdfMetniDetay(buffer: Buffer): Promise<PdfDetay> {
  const sonuc = await pdfBufferdanMetinDetay(buffer, PDF_MAX_CHARS);
  let text = sonuc.text;
  if (text.length > PDF_MAX_CHARS) {
    logger.warn(`[Referans] PDF metni ${text.length} karakter; ${PDF_MAX_CHARS} ile kesildi`);
    text = text.substring(0, PDF_MAX_CHARS);
  }
  return { text, pageCount: sonuc.pageCount, pages: sonuc.pages };
}

import { aiJsonAyikla } from '../utils/aiJsonAyikla';

// ── JSON ayıklayıcı ───────────────────────────────────────────────

function jsonAyikla(metin: string): Record<string, unknown> {
  const temiz = metin.trim();
  const blok = temiz.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const ham = blok ? blok[1].trim() : temiz;
  const ilk = ham.indexOf('{');
  const son = ham.lastIndexOf('}');
  if (ilk < 0 || son < 0) return {};
  const jStr = ham.slice(ilk, son + 1);
  try {
    return JSON.parse(jStr) as Record<string, unknown>;
  } catch (err) {
    const ekler = ['', '}', ']}', '"}]}', '"]}', '" }] }', '} ] }', '"]'];
    for (const ek of ekler) {
      try {
        return JSON.parse(jStr + ek) as Record<string, unknown>;
      } catch {
        /* sonraki */
      }
    }
    return {};
  }
}

function normalizeReferansSoru(raw: unknown): ReferansPdfSoruOzeti | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const ozet = typeof o.ozet === 'string' ? o.ozet.trim() : '';
  if (!ozet) return null;
  const sira = typeof o.sira === 'number' ? o.sira : parseInt(String(o.sira || '0'), 10) || 0;
  const sayfa =
    typeof o.sayfa === 'number'
      ? o.sayfa
      : o.sayfa != null
        ? parseInt(String(o.sayfa), 10)
        : undefined;
  const soruDetay = typeof o.soruDetay === 'string' ? o.soruDetay.trim() : undefined;
  return { sira, sayfa: Number.isFinite(sayfa as number) ? (sayfa as number) : undefined, ozet, soruDetay };
}

/** Bir metin parçasındaki soruları çıkar (JSON) */
async function llmSoruListesiCikar(
  kitapParcasi: string,
  sayfaAraligiAciklama: string
): Promise<ReferansPdfSoruOzeti[]> {
  const prompt = `Sen bir sınav içerik analistisin. Aşağıdaki metin bir PDF sınav kitapçığından çıkarılmıştır.
Kapsam: ${sayfaAraligiAciklama}

GÖREV (ZORUNLU):
- Bu metinde geçen TÜM çoktan seçmeli (A–E şıklı) soruları bul; hiçbirini atlama.
- Paragraf, klasik veya sayısal fark etmez; soru numaralı blokların hepsini say.
- Her soru için ölçülen kavramın/becerinin 1-3 cümlelik özetini "ozet" alanına yaz.
- Sorunun tüm orijinal metnini, sayısal değerlerini, şıklarını ve yapısını "soruDetay" alanına aynen kaydet. Bu bilgi, benzer varyasyonlar üretilirken temel alınacaktır.

Çıktı SADECE şu JSON (başka metin yok):
{"referans_sorular":[{"sira":1,"sayfa":3,"ozet":"...", "soruDetay": "..."}, ...]}

"sira" bu parça içindeki sıra (1'den başla). "sayfa" metinde --- SAYFA x / y --- işaretinden veya içerikten çıkarılabiliyorsa yaz, yoksa null kullan.

METİN:
${kitapParcasi}`;

  const yanit = await openrouterChat(
    ANALIZ_MODEL,
    [{ role: 'user', content: prompt }],
    { max_tokens: 8192, temperature: 0.2 },
    240000
  );
  const veri = jsonAyikla(yanit);
  const arr = Array.isArray(veri.referans_sorular) ? veri.referans_sorular : [];
  const out: ReferansPdfSoruOzeti[] = [];
  for (const item of arr) {
    const n = normalizeReferansSoru(item);
    if (n) out.push(n);
  }
  return out;
}

/** Genel meta (ders, konular, format) — kısa metin parçasından */
async function llmMetaAnaliz(ozetMetin: string, toplamSoru: number): Promise<Partial<ReferansAnalizi>> {
  const prompt = `Aşağıdaki metin bir sınav kitapçığından alınmış özet/baştır. Tespit edilen soru sayısı (tahmini): ${toplamSoru}.

DİKKAT — ders ayrımı:
- Coğrafya: harita, iklim, nüfus, yer şekilleri, sanayi, tarım, enerji kaynakları
- Tarih: osmanlı, cumhuriyet, savaş, antlaşma, inkılap (LGS ise İnkılap Tarihi ayrı ders)
- AYT/TYT dosya başlığında "Coğrafya" geçiyorsa dersAdi mutlaka "Coğrafya" olmalı; tarih konularıyla karıştırma

Şu alanları JSON olarak doldur (sadece JSON):
{
  "dersAdi": "birden fazlaysa virgülle",
  "konular": ["ana konular"],
  "zorlukSeviyesi": "KOLAY|ORTA|ZOR",
  "soruTipleri": ["ör. paragraf", "işlem"],
  "ogretimTuru": "YKS veya LGS",
  "formatNotu": "ÖSYM tarzı 5 şık vb.",
  "ornek_soru_sayisi": ${toplamSoru}
}

METİN (başlangıç):
${ozetMetin.slice(0, 80000)}`;

  const yanit = await openrouterChat(
    ANALIZ_MODEL,
    [{ role: 'user', content: prompt }],
    { max_tokens: 1500, temperature: 0.3 },
    120000
  );
  return jsonAyikla(yanit) as Partial<ReferansAnalizi>;
}

async function pdfTumSorulariCikar(text: string, pages: Array<{ num: number; text: string }>, pageCount: number): Promise<ReferansPdfSoruOzeti[]> {
  const sayfaListesi =
    pages.length > 0
      ? pages
      : [{ num: 1, text }];

  const tekParcaUygun = text.length <= TEK_PARCA_KARAKTER && pageCount <= 80;

  if (tekParcaUygun) {
    logger.info(`[Referans] PDF soru çıkarımı — tek parça (${text.length} karakter)`);
    const liste = await llmSoruListesiCikar(text, `Tüm kitapçık (~${pageCount} sayfa)`);
    liste.forEach((s, i) => {
      if (!s.sira) s.sira = i + 1;
    });
    return liste.sort((a, b) => a.sira - b.sira);
  }

  logger.info(`[Referans] PDF soru çıkarımı — ${SAYFA_GRUBU} sayfalık gruplar (toplam ~${pageCount} sayfa)`);
  const tum: ReferansPdfSoruOzeti[] = [];
  for (let i = 0; i < sayfaListesi.length; i += SAYFA_GRUBU) {
    const slice = sayfaListesi.slice(i, i + SAYFA_GRUBU);
    const first = slice[0]?.num ?? i + 1;
    const last = slice[slice.length - 1]?.num ?? first;
    const chunk = slice.map((p) => `--- SAYFA ${p.num} ---\n${p.text}`).join('\n\n');
    const part = await llmSoruListesiCikar(chunk, `Sayfa ${first}–${last} (${slice.length} sayfa)`);
    tum.push(...part);
  }

  tum.forEach((s, idx) => {
    s.sira = idx + 1;
  });
  return tum;
}

// ── ADIM 1: Referans içeriği analiz et ───────────────────────────

export async function referansAnalize(buffer: Buffer, mimeTuru: string): Promise<ReferansAnalizi> {
  const key = getOpenRouterApiKey();

  const isPdf = mimeTuru === 'application/pdf';
  logger.info(`[Referans] Analiz başlıyor — tür: ${isPdf ? 'PDF (tam sayfa)' : 'Görsel'}`);

  const analizPrompt = `Bu materyali incele.
Eğer birden fazla ders varsa "dersAdi" alanında virgülle ayır.
Eğer bu bir soru görseliyse, sorunun ölçtüğü kavramı 1–3 cümleyle özetle ve "referans_sorular" içindeki "ozet" alanına tek madde olarak yaz.
Ayrıca, sorunun görselden çıkarılan tam metnini (soru kökü, verileri, şıkları vb.) "referans_sorular" içindeki "soruDetay" alanına yaz. Bu detaylar benzer bir soru üretmek için kullanılacaktır.
ÖNEMLİ: "ogretimTuru" alanını doğru belirle:
- LGS (Liselere Geçiş Sınavı): 8. sınıf, 4 şık (A-D), ders adları "Fen Bilimleri", "Matematik", "Türkçe", "İnkılap Tarihi", "Din Kültürü", "İngilizce"
- YKS (Yükseköğretim Kurumları Sınavı): lise, 5 şık (A-E), ÖSYM formatı
Eğer şıklar A-D ise (4 şık) bu LGS sorusudur. Eğer şıklar A-E ise (5 şık) bu YKS sorusudur.
DİKKAT: Şekil, grafik veya tablo içeren her soru Geometri DEĞİLDİR! Dünya, Güneş, Ay, mevsimler, gölge boyu, ekvator, basınç, deney tüpü, DNA, elektrik devresi, basit makine, kuvvet, hareket gibi kavramlar içeren görselli soruları "Fen Bilimleri" (LGS ise) veya Fizik/Kimya/Biyoloji (YKS ise) olarak etiketle. Kesinlikle "Geometri" YAZMA.
JSON formatında şu alanları doldur:
{
  "dersAdi": "...",
  "konular": [],
  "zorlukSeviyesi": "ORTA",
  "soruTipleri": [],
  "ogretimTuru": "YKS veya LGS",
  "formatNotu": "LGS ise: LGS tarzı, 4 şık (A-D); YKS ise: ÖSYM tarzı, 5 şık (A-E). İngilizce dersinde TÜM metin İngilizce; diğer derslerde Türkçe.",
  "ornek_soru_sayisi": 0,
  "tespit_edilen_soru_sayisi": 0,
  "referans_sorular": [{"sira":1,"sayfa":null,"ozet":"...","soruDetay":"..."}],
  "gorselGerekli": true veya false (pasta/sütun/çizgi grafik, geometri şekli, tablo varsa true)
}
Sadece geçerli JSON döndür.`;

  if (isPdf) {
    const { text, pageCount, pages } = await pdfMetniDetay(buffer);
    const referans_sorular = await pdfTumSorulariCikar(text, pages, pageCount);
    const meta = await llmMetaAnaliz(text, referans_sorular.length);

    const birlesik: ReferansAnalizi = {
      dersAdi: meta.dersAdi || 'Genel',
      konular: Array.isArray(meta.konular) && meta.konular.length ? (meta.konular as string[]) : ['Genel'],
      zorlukSeviyesi: meta.zorlukSeviyesi || 'ORTA',
      soruTipleri: Array.isArray(meta.soruTipleri) ? (meta.soruTipleri as string[]) : ['çoktan seçmeli'],
      ogretimTuru: meta.ogretimTuru || 'YKS',
      formatNotu: meta.formatNotu || 'ÖSYM tarzı, 5 şık',
      ornek_soru_sayisi: referans_sorular.length || meta.ornek_soru_sayisi || 0,
      gorselGerekli:
        typeof (meta as { gorselGerekli?: boolean }).gorselGerekli === 'boolean'
          ? (meta as { gorselGerekli: boolean }).gorselGerekli
          : undefined,
      sayfa_sayisi: pageCount,
      tespit_edilen_soru_sayisi: referans_sorular.length,
      referans_sorular,
      tam_metin_okundu: text.length < PDF_MAX_CHARS,
    };
    if (birlesik.gorselGerekli === undefined) {
      birlesik.gorselGerekli = referansGorselGerekliMi(birlesik);
    }
    logger.info(
      `[Referans] PDF analiz bitti — ${pageCount} sayfa, ${referans_sorular.length} soru özeti`
    );
    return birlesik;
  }

  const base64 = await gorselBase64e(buffer, mimeTuru);
  const yanit = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: URETIM_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: base64 } },
            { type: 'text', text: `Bu sınav sorusu görselini analiz et.\n\n${analizPrompt}` },
          ],
        },
      ],
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...openrouterHttpHeaders(),
      },
      timeout: 90000,
    }
  );

  const icerik = yanit.data?.choices?.[0]?.message?.content || '{}';
  logger.info(`[Referans] OpenRouter vision model yanıtı:\n${icerik}`);
  const j = jsonAyikla(icerik) as unknown as Partial<ReferansAnalizi>;
  logger.info(`[Referans] Ayıklanan analiz JSON: ${JSON.stringify(j)}`);
  const birlesik = referansAnaliziNormalize(j);
  birlesik.kaynakGorsel = true;
  birlesik.gorselGerekli = true;
  if (!birlesik.referans_sorular?.length) {
    const ders = birlesik.dersAdi || 'Genel';
    const isGeo = /geometri/i.test(ders);
    birlesik.referans_sorular = [
      {
        sira: 1,
        ozet: isGeo
          ? 'Görsel referans: geometri/şekil içeren çoktan seçmeli soru — aynı şekil türünde özgün varyasyon üret.'
          : `Görsel referans: ${ders} dersine ait görsel/grafik içeren çoktan seçmeli soru — görseldeki konuya uygun özgün soru üret.`,
      },
    ];
  } else {
    const isGeo = /geometri/i.test(birlesik.dersAdi || '');
    birlesik.referans_sorular = birlesik.referans_sorular.map((r) => ({
      ...r,
      ozet: r.ozet.includes('şekil') || r.ozet.includes('geometri')
        ? r.ozet
        : isGeo
          ? `${r.ozet} (referans görselde geometri/şekil var)`
          : `${r.ozet} (referans görselde konuya uygun grafik/şekil var)`,
      soruDetay: r.soruDetay,
    }));
  }
  if (birlesik.gorselGerekli === undefined) {
    birlesik.gorselGerekli = true;
  }
  if (birlesik.tespit_edilen_soru_sayisi == null) {
    birlesik.tespit_edilen_soru_sayisi = birlesik.referans_sorular?.length || 1;
  }
  return birlesik;
}

async function referansEksikSvgTamamla(
  sorular: ReferansTabanliSoru[],
  analiz: ReferansAnalizi,
  _model: string
): Promise<ReferansTabanliSoru[]> {
  const varsayilan = modelSec(analiz.dersAdi, analiz.zorlukSeviyesi);
  const svgModel = process.env.REFERANS_SVG_MODEL || modelSecGorselUretim(analiz.dersAdi, analiz.zorlukSeviyesi, varsayilan);
  const out = [...sorular];
  const girdiGorsel = {
    ders: analiz.dersAdi,
    konu: analiz.konular?.[0] || '',
    ogretimTuru: analiz.ogretimTuru || 'YKS',
    sayi: 1,
    zorluk: analiz.zorlukSeviyesi,
  };
  const sistemGorsel = `Sen ÖSYM tarzı ${analiz.dersAdi} soru şeması üreten bir asistansın.`;

  for (let i = 0; i < out.length; i++) {
    const s = out[i];
    const eksik = !s?.svgGorsel || String(s.svgGorsel).trim().length < 40;
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 700));
    }
    if (!eksik) {
      try {
        out[i] = { ...s, svgGorsel: svgNormalize(s.svgGorsel) };
      } catch {
        /* yoksay */
      }
      try {
        const duzeltilmis = await gorselSvgKaliteDuzelt(girdiGorsel, s, svgModel, sistemGorsel);
        if (duzeltilmis) out[i] = { ...out[i], svgGorsel: duzeltilmis };
      } catch {
        /* yoksay */
      }
      continue;
    }
    try {
      const ekIcerik = await openrouterChat(
        svgModel,
        [
          {
            role: 'user',
            content: `Aşağıdaki ${analiz.dersAdi} sorusu için ÖSYM tarzı GEOMETRİ/ŞEKİL SVG üret. Soru metnini değiştirme.
Soru:
"""
${(s?.metin || '').replace(/<[^>]+>/g, ' ').slice(0, 1500)}
"""
Şıklar: ${JSON.stringify(s?.secenekler || {})}
Doğru: ${s?.dogruCevap || ''}
Referans tipi: ${analiz.soruTipleri.join(', ')}

GEOMETRİ KURALLARI:
- Üçgen/dörtgen/çember: köşe harfleri (A,B,C), kenar ve açı etiketleri soru metniyle tutarlı
- viewBox="0 0 600 400"; width/height attribute YOK; preserveAspectRatio="xMidYMid meet"
- En az bir anlamlı şekil (<polygon>, <circle>, <line> vb.)

YALNIZCA JSON: {"svgGorsel":"<svg viewBox='0 0 600 400' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMidYMid meet'>...</svg>"}
${GRAFIK_SVG_YONERGESI}
${SVG_GEOMETRI_ACI_KURALI}`,
          },
        ],
        { temperature: 0.25, max_tokens: 3500 },
        180000
      );
      const svgVeri = jsonAyikla(ekIcerik) as { svgGorsel?: string };
      const svg = typeof svgVeri.svgGorsel === 'string' ? svgNormalize(svgVeri.svgGorsel) : '';
      if (svg.length >= 40) {
        out[i] = { ...s, svgGorsel: svg };
        logger.info(`[Referans] Eksik SVG tamamlandı (soru ${i + 1})`);
        try {
          const duzeltilmis = await gorselSvgKaliteDuzelt(girdiGorsel, out[i], svgModel, sistemGorsel);
          if (duzeltilmis) out[i] = { ...out[i], svgGorsel: duzeltilmis };
        } catch {
          /* yoksay */
        }
      }
    } catch (e) {
      logger.warn(`[Referans] SVG tamamlama hata (soru ${i + 1}): ${(e as Error).message}`);
    }
  }
  return out;
}

// ── ADIM 2: Özgün sorular (tam varyasyon veya serbest sayı) ──────

async function referansPartiUret(
  analiz: ReferansAnalizi,
  parti: ReferansPdfSoruOzeti[],
  zorluk: string | undefined,
  gorselMod: ReferansGorselMod | undefined,
  uretimTarzi: 'benzer' | 'ozgun'
): Promise<ReferansTabanliSoru[]> {
  const secilenModel = URETIM_MODEL || modelSec(analiz.dersAdi, zorluk || analiz.zorlukSeviyesi);
  const isGorsel = referansSvgAktifMi(analiz, gorselMod);
  if (isGorsel) {
    logger.info('[Referans] SVG/şekil modu aktif (referans grafik veya şekil içeriyor)');
  }
  const grafikVurgu = referansGorselGerekliMi(analiz) ? GRAFIK_SVG_YONERGESI : '';
  const ingilizceSvgVurgu = yabanciDilDersiMi(analiz.dersAdi) ? INGILIZCE_SVG_YONERGESI : '';
  const referansDil = soruUretimDili(analiz.dersAdi);
  const fizikSvgBlok = fizikDersiMi(analiz.dersAdi) ? OSYM_FIZIK_DEVRE_KURAL : '';
  const fenSvgYonergesi = (analiz.dersAdi === 'Fen Bilimleri' || analiz.dersAdi === 'Fizik' || analiz.dersAdi === 'Coğrafya')
    ? `\nFEN BİLİMLERİ / DÜNYA VE MEVSİMLER ÖZEL SVG TALİMATI (ZORUNLU):
- Eğer referans soruda gölge boyu grafiği VE Dünya/Yerküre çizimi varsa, svgGorsel içinde yan yana HER İKİSİNİ DE ÇİZ:
  • Sol kısımda (x: 50–250): Gölge boyu bar grafiği (sütun grafik; X, Y, Z sütunları, eksenler ve etiketler).
  • Sağ kısımda (x: 350–550): Bir Yerküre/Dünya küresi çiz (merkez x=450, y=200, r=100 olan büyük bir daire; ortasından geçen kesikli Ekvator çizgisi; Kuzey ve Güney etiketleri; ve X, Y, Z şehirlerinin küre üzerindeki konum noktaları/etiketleri).
- Böylece öğrenci tek bir görselde hem gölge grafiğini hem de Dünya üzerindeki konumları net şekilde görebilsin.`
    : '';

  const svgYonergesi = isGorsel
    ? `Her soruda ZORUNLU olarak anlamlı şekil/grafik olmalı — sadece metin soru KABUL EDİLMEZ.
Şekli "svgGorsel" alanına <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg"> formatında ekle.
width/height ATTRIBUTE kullanma; preserveAspectRatio="xMidYMid meet" ekle.
Soru kökünde "grafikte", "şekilde" veya "tabloda" ifadesi kullan.
${grafikVurgu}
${ingilizceSvgVurgu}
${fizikSvgBlok}
${fenSvgYonergesi}
${analiz.dersAdi === 'Geometri' ? SVG_GEOMETRI_ACI_KURALI : ''}`
    : ingilizceSvgVurgu;

  const soruListesiMetni = parti
    .map((r, i) => {
      let metin = `${i + 1}. (Kaynak sıra #${r.sira}${r.sayfa != null ? `, sayfa ~${r.sayfa}` : ''})\n   - Ölçülen kavram özeti: ${r.ozet}`;
      if (r.soruDetay) {
        metin += `\n   - Orijinal Soru Metni/Yapısı: ${r.soruDetay}`;
      }
      return metin;
    })
    .join('\n');

  const stil = uretimTarzi === 'benzer'
    ? isGorsel
      ? referansDil === 'en'
        ? `SIMILAR QUESTION (CLONE): Keep the EXACT format of the reference — dialogue layout, table structure, speech-bubble arrangement, question stem pattern and distractor logic. Change only names, numbers, vocabulary and specific details. Do NOT simplify to plain text if reference has visuals.`
        : `BENZER SORU (KLON): Referanstan alınan sorunun kurgusunu, mantığını ve anlatım yapısını birebir koru (ör. görseldeki şeklin türünü de koru: pasta→pasta, sütun→sütun, tablo→tablo, geometri→geometri). Orijinal Soru Metni/Yapısı alanındaki soruyu temel al ve sadece verilen sayısal değerleri, isimleri, nesneleri ve etiketleri değiştirerek tamamen aynı kurguda ama farklı çözümlü/şıkklı birebir benzer bir soru üret.`
      : referansDil === 'en'
        ? `SIMILAR QUESTION (CLONE): Preserve reference question type, sentence structure, stem wording pattern and distractor style. Change only details (names, numbers, options content).`
        : `BENZER SORU (KLON): Referanstaki orijinal sorunun kurgusunu, mantığını, cümle yapısını ve soru tipini birebir koru. Orijinal Soru Metni/Yapısı alanındaki soruyu temel al ve sadece sayısal değerleri, isimleri, nesneleri ve verilenleri değiştirerek tamamen aynı tarzda, farklı çözümlü/şıkklı birebir benzer bir soru üret.`
    : referansDil === 'en'
      ? 'ORIGINAL QUESTION: Measure the same skill/competency but use a clearly different scenario; keep English exam style.'
      : 'ÖZGÜN SORU: Aynı kazanımı ölç, fakat kurguyu tamamen farklılaştır; yalnızca kavram düzeyi eşleşsin.';

  const isLGS = analiz.ogretimTuru === 'LGS';
  const sikSayisi = isLGS ? '4 şık A–D' : '5 şık A–E';
  const dilKurali = referansDilKurali(analiz.dersAdi, sikSayisi);
  const seceneklerJSON = isLGS
    ? '{"A":"...","B":"...","C":"...","D":"..."}'
    : '{"A":"...","B":"...","C":"...","D":"...","E":"..."}';
  const dogruCevapDegerleri = isLGS ? '"A"|"B"|"C"|"D"' : '"A"|"B"|"C"|"D"|"E"';

  const kullanici = `
Sen sınav soru yazarı ve editörsün. Aşağıdaki listedeki HER bir referans satırı için, o satırın ölçtüğü kavrama denk gelen bir soru yaz.
Üretim stili: ${stil}
Satır sayısı = üretilecek soru sayısı (${parti.length}).

REFERANS ÖZETLERİ (orijinal metni kopyalama; sadece kavram eşlemesi):
${soruListesiMetni}

GENEL BAĞLAM:
- Ders: ${analiz.dersAdi}
- Konular: ${analiz.konular.join(', ')}
- Soru tipleri: ${analiz.soruTipleri.join(', ')}
- Sınav: ${analiz.ogretimTuru}
- Format: ${analiz.formatNotu}
- Zorluk: ${zorluk || analiz.zorlukSeviyesi}

KURALLAR:
- Her soru farklı kavram satırına karşılık gelmeli; aynı kökü tekrarlama
${dilKurali}
- Varyasyon: Eğer referans satırı sayısal değer içeriyorsa, kendi sorunda mutlaka farklı sayılar seç; şıkları da buna göre üret.
- "kazanim" alanında ilgili satırın kavramını belirt
- "metin" ve şıklarda düşünce süreci, öz-düzeltme, "yanlış topladım", "tekrar kontrol" vb. YASAK; yalnızca öğrenciye gösterilecek nihai soru metni.
- "metin" içinde "Adım 1/2", "Sonuç:" veya doğru şık harfini açıklamak YASAK; çözüm yalnızca "cozumAciklamasi" alanında.
${stemKontrolGerekli(analiz.dersAdi) ? LATEX_KATEX_YONERGESI : ''}
${svgYonergesi}

JSON formatı: "sorular" dizisi tam ${parti.length} elemanlı olmalı. Her nesnede:
- "kaynakSira": ilgili referans satırının #sira değeri
- "metin": "<p>...</p>"
${isGorsel ? '- "svgGorsel": "<svg viewBox=\\\'0 0 400 300\\\' xmlns=\\\'http://www.w3.org/2000/svg\\\'>...</svg>"' : ''}
- "secenekler": ${seceneklerJSON}
- "dogruCevap": ${dogruCevapDegerleri}
- "kazanim": string
- "cozumAciklamasi": string
}`;

  const sistem =
    referansDil === 'en'
      ? `You are an expert MEB/YÖK English exam item writer. Return ONLY valid JSON. No other text.`
      : `Sen uzman bir Türk eğitim içerik yazarısın. SADECE geçerli JSON döndür. Başka metin yazma.`;

  const maxTokens = Math.min(
    8192,
    Math.max(isGorsel ? 2800 : 1800, (isGorsel ? 2200 : 1400) * parti.length)
  );
  const modeller = [
    secilenModel,
    ...OPENROUTER_YEDEK_MODELLER.filter((m) => m !== secilenModel),
  ];
  let sonHam = '';

  for (const model of modeller) {
    for (let deneme = 0; deneme < 2; deneme++) {
      try {
        const yanit = await openrouterChat(
          model,
          [
            { role: 'system', content: sistem },
            { role: 'user', content: kullanici },
          ],
          { max_tokens: maxTokens, temperature: deneme === 0 ? 0.65 : 0.35 },
          300000
        );
        sonHam = yanit;
        const veri = jsonAyikla(yanit);
        const hamListe = Array.isArray(veri.sorular) ? (veri.sorular as ReferansTabanliSoru[]) : [];
        const temiz = hamListe
          .map((s, i) => ({
            ...uretilenSoruAiTemizle(s),
            kaynakSira: s.kaynakSira ?? parti[i]?.sira,
          }))
          .filter((s) => s.metin?.trim() && s.secenekler && s.dogruCevap);
        if (temiz.length > 0) {
          let sonuc = isGorsel ? await referansEksikSvgTamamla(temiz, analiz, model) : temiz;
          if (isGorsel) {
            sonuc = sonuc.map((s) => {
              if (!s.svgGorsel) return s;
              try {
                return { ...s, svgGorsel: svgNormalize(s.svgGorsel) };
              } catch {
                return s;
              }
            });
            const svgSay = sonuc.filter((s) => referansSoruSvgVarMi(s)).length;
            if (svgSay === 0) {
              logger.warn(
                `[Referans] SVG üretilemedi (model=${model}, deneme=${deneme + 1}) — metin-only yanıt reddedildi`
              );
              continue;
            }
            logger.info(`[Referans] ${sonuc.length} soru üretildi (${svgSay} SVG, model=${model})`);
          } else {
            logger.info(`[Referans] ${sonuc.length} soru üretildi (model=${model}, svg=false)`);
          }
          return sonuc;
        }
        logger.warn(
          `[Referans] Boş/geçersiz JSON (model=${model}, deneme=${deneme + 1}): ${yanit.slice(0, 280)}`
        );
      } catch (err) {
        if (openrouterModelKullanilamaz(err)) continue;
        throw err;
      }
    }
  }

  throw new AppHatasi(
    isGorsel
      ? 'Referans tabanlı şekilli soru üretilemedi (SVG eksik). Görsel mod açık — soru sayısını 2–3\'e düşürüp tekrar deneyin veya «Her zaman SVG şekil» seçin.'
      : 'Referans tabanlı soru üretilemedi. OpenRouter geçerli soru JSON\'u döndürmedi; hesap kredisi veya model limitini kontrol edip tekrar deneyin.',
    isGorsel ? 422 : 502,
    true,
    sonHam ? { hamOnizleme: sonHam.slice(0, 400) } : null
  );
}

export async function referansTabanliSoruUret(
  analiz: ReferansAnalizi,
  istek: {
    sayi: number;
    zorluk?: string;
    gorselMod?: ReferansGorselMod;
    konuId?: string;
    /** true: PDF'de tespit edilen her soru için bir varyasyon */
    tamVaryasyon?: boolean;
    /** benzer: aynı kurgu/format; ozgun: farklı kurgu */
    uretimTarzi?: 'benzer' | 'ozgun';
  }
): Promise<ReferansTabanliSoru[]> {
  const { sayi, zorluk, gorselMod, tamVaryasyon = true } = istek;
  const uretimTarzi: 'benzer' | 'ozgun' = istek.uretimTarzi === 'ozgun' ? 'ozgun' : 'benzer';
  const efektifGorselMod = referansEfektifGorselMod(analiz, gorselMod);

  const liste = analiz.referans_sorular?.filter((x) => x.ozet?.trim());
  const tamListe = tamVaryasyon && liste && liste.length > 0;
  const partiBoyutu = referansPartiBoyutu(analiz, efektifGorselMod);

  if (tamListe) {
    logger.info(
      `[Referans] Tam varyasyon — ${liste.length} soru, parti boyutu ${partiBoyutu}`
    );
    const tum: ReferansTabanliSoru[] = [];
    for (let i = 0; i < liste.length; i += partiBoyutu) {
      if (i > 0) await referansPartiArasiBekle();
      const parti = liste.slice(i, i + partiBoyutu);
      const uretilen = await referansPartiUret(analiz, parti, zorluk, efektifGorselMod, uretimTarzi);
      tum.push(...uretilen);
    }
    return tum;
  }

  // Görsel / soru listesi yok: eski davranış (serbest sayı)
  const adet = Math.min(Math.max(sayi || 5, 1), 40);
  const sahteParti: ReferansPdfSoruOzeti[] = Array.from({ length: adet }, (_, i) => ({
    sira: i + 1,
    ozet: `Genel üretim ${i + 1} — ${analiz.konular.join(', ')}`,
  }));
  logger.info(`[Referans] Serbest üretim — ${adet} soru, parti boyutu ${partiBoyutu}`);
  const tum: ReferansTabanliSoru[] = [];
  for (let i = 0; i < sahteParti.length; i += partiBoyutu) {
    if (i > 0) await referansPartiArasiBekle();
    const slice = sahteParti.slice(i, i + partiBoyutu);
    tum.push(...(await referansPartiUret(analiz, slice, zorluk, efektifGorselMod, uretimTarzi)));
  }
  return tum;
}

/**
 * URL'den çekilmiş ham metin içeriğini analiz eder.
 * PDF analizi gibi soruları, ders adını, kazanımları çıkarır.
 */
export async function referansTextAnalize(text: string, kaynakUrl: string): Promise<ReferansAnalizi> {
  logger.info(`[Referans] URL metin analizi başlıyor — URL: ${kaynakUrl}`);

  // Metinden tüm soruları çıkar (PDF gibi davran)
  const referans_sorular = await pdfTumSorulariCikar(text, [], 1);
  // Metinden genel ders/kazanım meta verisini çıkar
  const meta = await llmMetaAnaliz(text, referans_sorular.length);

  const urlDersAdi = referansKaynakAdindanDersTahmin(kaynakUrl) || meta.dersAdi || 'Genel';

  const birlesik: ReferansAnalizi = {
    dersAdi: urlDersAdi,
    konular: Array.isArray(meta.konular) && meta.konular.length ? (meta.konular as string[]) : ['Genel'],
    zorlukSeviyesi: meta.zorlukSeviyesi || 'ORTA',
    soruTipleri: Array.isArray(meta.soruTipleri) ? (meta.soruTipleri as string[]) : ['çoktan seçmeli'],
    ogretimTuru: meta.ogretimTuru || 'YKS',
    formatNotu: meta.formatNotu || 'ÖSYM tarzı, 5 şık',
    ornek_soru_sayisi: referans_sorular.length || meta.ornek_soru_sayisi || 0,
    gorselGerekli:
      typeof (meta as { gorselGerekli?: boolean }).gorselGerekli === 'boolean'
        ? (meta as { gorselGerekli: boolean }).gorselGerekli
        : undefined,
    sayfa_sayisi: 1,
    tespit_edilen_soru_sayisi: referans_sorular.length,
    referans_sorular,
    tam_metin_okundu: true,
  };

  if (birlesik.gorselGerekli === undefined) {
    birlesik.gorselGerekli = referansGorselGerekliMi(birlesik);
  }

  logger.info(
    `[Referans] URL metin analizi tamamlandı — ${referans_sorular.length} adet soru özeti tespit edildi.`
  );
  return referansAnaliziDersZenginlestir(referansAnaliziNormalize(birlesik));
}
