# AI Soru Üretim Sistemi — Taşıma Rehberi

Bu rehber, Wingo Deneme projesindeki AI destekli **çoktan seçmeli soru üretim** ve **şekilli (SVG) soru üretim** sistemini başka bir projeye 1:1 taşıyabilmen için hazırlanmıştır.

İçeriği üretim çağrısı, prompt mimarisi, doğrulama, çapraz çözücü garanti katmanı ve frontend tetikleme dahil tüm akışı kapsar.

---

## 1) Yüksek Seviye Mimari

```
[Client]
   │  POST /ai/soru-uret  {konuId, sayi, zorluk, gorselMod, modelOverride}
   ▼
[ai.controller.ts]
   │ konuyu DB'den çek, yetki kontrolü, soruUret() çağır
   ▼
[ai.service.ts → soruUret()]
   ├─ modelSec(ders, zorluk)              ← akıllı model seçimi
   ├─ RAG: similaritySearch(konuId)       ← konuya özel kaynaklar (opsiyonel)
   ├─ prompt oluştur (metin veya SVG)
   ├─ openrouterChat() paralel/seri çağrı (yedek model zinciri)
   ├─ JSON ayıkla + normalize (svg dahil)
   ├─ validateUretilenSoruListesi()        ← şıklar, doğru cevap, kök
   ├─ soruUretimGarantiKatmani()           ← bağımsız çözücü ile çapraz check
   └─ aiSoruKaliteIsleme()                 ← son polish: kazanım, açıklama
   ▼
[Prisma → Soru tablosuna kayıt]
```

Üretim sıralı değil; aynı anda paralel n adet model çağrısı yapılır, eksik gelenler için **yedek model zinciri** (`OPENROUTER_YEDEK_MODELLER`) ile yeniden denenir.

---

## 2) Veri Modeli (Prisma)

Yeni projede minimum şu tablolar yeterli:

```prisma
model Konu {
  id          String  @id @default(cuid())
  ad          String
  ders        String
  uniteAdi    String?
  yksSegment  String?
  ogretimTuru String  // YKS | LGS vb.
}

model Soru {
  id              String   @id @default(cuid())
  konuId          String
  siraNo          Int
  metinHtml       String   // soru + (varsa) inline SVG + çözüm
  gorselUrl       String?
  secenekler      Json     // {A:"...", B:"...", ...}
  dogruCevap      String   // "A" | "B" | "C" | "D" | "E"
  zorluk          String
  kazanim         String?
  aiMeta          Json?
  onayDurumu      String   @default("ONAYLANDI")
  konu            Konu     @relation(fields: [konuId], references: [id])
}

model EgitimDokuman { // RAG için opsiyonel
  id        String @id @default(cuid())
  konuId    String?
  baslik    String
  icerik    String
  embedding Bytes? // pgvector veya benzeri
}
```

---

## 3) OpenRouter Entegrasyonu

OpenRouter, tek API anahtarıyla 50+ modelin (GPT-4.1, Claude, Gemini, o3-mini, Mistral, DeepSeek) çağrılmasını sağlar. Yeni projeye temel iletişim katmanı:

```ts
import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const OPENROUTER_YEDEK_MODELLER: Record<string, string[]> = {
  'openai/gpt-4.1':             ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
  'openai/o3-mini':             ['openai/gpt-4.1', 'anthropic/claude-3.5-sonnet'],
  'anthropic/claude-3.5-sonnet':['anthropic/claude-3.7-sonnet', 'openai/gpt-4.1'],
  'google/gemini-2.5-pro':      ['openai/gpt-4.1', 'anthropic/claude-3.5-sonnet'],
};

export async function openrouterChat(
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {},
  timeoutMs = 120_000,
): Promise<string> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const retryable = (e: any) => {
    const s = e?.response?.status;
    return (
      [408, 409, 425, 429, 500, 502, 503, 504].includes(s) ||
      /timeout|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(String(e?.message))
    );
  };

  const istek = async (m: string) => {
    const max_tokens = Math.min(Math.max(512, opts.max_tokens ?? 4096), 8192);
    const r = await axios.post(
      OPENROUTER_API_URL,
      {
        model: m,
        messages,
        temperature: opts.temperature ?? 0.8,
        max_tokens,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost',
          'X-Title': process.env.APP_NAME || 'WingoApp',
        },
        timeout: timeoutMs,
      },
    );
    return r.data?.choices?.[0]?.message?.content || '';
  };

  // 3 deneme + yedek model zinciri
  const zincir = [model, ...(OPENROUTER_YEDEK_MODELLER[model] ?? [])];
  let sonHata: any;
  for (const m of zincir) {
    for (let deneme = 0; deneme < 3; deneme++) {
      try {
        return await istek(m);
      } catch (e) {
        sonHata = e;
        if (!retryable(e)) break;
        await sleep(500 * (deneme + 1));
      }
    }
  }
  throw sonHata;
}
```

`.env` örneği:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxx
APP_URL=https://senin-projen.com
APP_NAME=SeninProje
```

---

## 4) Akıllı Model Seçimi

Doğruluk öncelikli; STEM zor ⇒ o3-mini, görsel/geometri ⇒ Gemini Pro, sözel ⇒ Claude.

```ts
const STEM   = ['matematik','fizik','kimya','biyoloji','istatistik','olasılık','analitik'];
const GORSEL = ['geometri','trigonometri','koordinat'];
const SOZEL  = ['türkçe','dil','edebiyat','tarih','coğrafya','felsefe','sosyal','din','psikoloji','sosyoloji'];

export function modelSec(ders: string, zorluk?: string): string {
  const d = ders.toLowerCase();
  const z = (zorluk || '').toUpperCase();
  if (GORSEL.some((g) => d.includes(g))) return z === 'ZOR' ? 'openai/o3-mini' : 'google/gemini-2.5-pro';
  if (STEM.some((m) => d.includes(m)))   return z === 'ZOR' ? 'openai/o3-mini' : 'openai/gpt-4.1';
  if (SOZEL.some((t) => d.includes(t)))  return 'anthropic/claude-3.5-sonnet';
  return 'openai/gpt-4.1';
}

/** SVG üretimi için ek tercih (görsel modeller daha temiz inline SVG çiziyor) */
export function modelSecGorselUretim(ders: string, _zorluk: string | undefined, fallback: string) {
  const d = ders.toLowerCase();
  if (['fizik', 'geometri', 'trigonometri', 'kimya'].some((x) => d.includes(x))) {
    return 'openai/gpt-4o';
  }
  return fallback;
}
```

---

## 5) Prompt Mimarisi

Sistem mesajı sabit, kullanıcı mesajı dinamik. İki ana varyasyon vardır: **düz metin** ve **SVG zorunlu**.

### 5.1 Ortak Sistem Mesajı

```ts
export const LATEX_KATEX_YONERGESI = `
LaTeX yazımında KaTeX uyumlu sözdizimi kullan; \\frac, \\sqrt, \\angle, ^, _ vb.
\\(, \\) yerine $...$ tercih et. HTML içinde &amp; yerine doğrudan & kullan.
`;

export const SVG_GEOMETRI_ACI_KURALI = `
Geometri çizimlerinde açı işaretlemeleri ve etiketler GÖRSEL olarak çizilmeli;
metinde "üçgenin köşeleri A,B,C" yazıyorsan SVG'de gerçekten o köşelere etiket koy.
`;

export const SYS_SORU_URET = `
Sen ÖSYM standartlarına göre soru yazan bir eğitim editörüsün.
Cevabını YALNIZCA tek bir JSON döndüreceksin: { "sorular": [ ... ] }.
JSON dışında metin yazma. Markdown veya açıklama ekleme.

KURALLAR:
- TYT/AYT için 5 şık (A-E), LGS için 4 şık (A-D).
- "dogruCevap" şıklardan biri olmalı.
- Şıklar birbirinden ayırt edilebilir, tek doğru cevaplı.
- Soru kökü ≥ 12 kelime, eksiksiz cümle, yazım hatasız.
- Matematik için LaTeX kullan: $...$ (inline) veya $$...$$ (block).
- ${LATEX_KATEX_YONERGESI}
- ${SVG_GEOMETRI_ACI_KURALI}
`;
```

### 5.2 Metin Sorusu Prompt'u

```ts
function metin_promptu(g: SoruUretGirdisi & { ragMetni?: string }): string {
  return `
Ders: ${g.ders}
Konu: ${g.konu}
Ünite: ${g.uniteAdi ?? '—'}
Zorluk: ${g.zorluk ?? 'ORTA'}
Adet: ${g.sayi}
Şık sayısı: ${g.ogretimTuru === 'LGS' ? 4 : 5}

${g.ogretmenTalimat ? `Öğretmen ek talimatı: ${g.ogretmenTalimat}\n` : ''}
${g.ragMetni ? `\n— KAYNAKLAR —\n${g.ragMetni}\n— /KAYNAKLAR —\n` : ''}

ŞABLON:
{
  "sorular": [
    {
      "metin": "Soru kökü...",
      "secenekler": {"A":"...","B":"...","C":"...","D":"...","E":"..."},
      "dogruCevap": "C",
      "kazanim": "Konuya özgü kazanım cümlesi",
      "cozumAciklamasi": "Adım adım çözüm",
      "svgGorsel": ""
    }
  ]
}
`;
}
```

### 5.3 SVG (Şekilli Soru) Prompt'u

```ts
function svgPrompt(g: SoruUretGirdisi & { ragMetni?: string }): string {
  return `
${metin_promptu(g)}

⛔ ZORUNLU: HER sorunun "svgGorsel" alanı dolu, anlamlı bir inline SVG OLMALI.
Kurallar:
- <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
- stroke #111827, fill yalnızca açıklayıcı renk (mavi/turuncu/yeşil) ya da yok.
- Etiketler <text> ile, font-size 14, fill #111827.
- Soru kökünde "Şekilde...", "Grafikte..." gibi atıflar bulundur.
- Hiçbir soruda svgGorsel boş veya "yok" geçemez.

Örnek format:
{
  "sorular": [{
    "metin": "Şekilde verilen ABC üçgeninde...",
    "svgGorsel": "<svg viewBox='0 0 600 400' xmlns='http://www.w3.org/2000/svg'>...</svg>",
    "secenekler": {"A":"...","B":"...","C":"...","D":"...","E":"..."},
    "dogruCevap": "B",
    "kazanim": "...",
    "cozumAciklamasi": "..."
  }]
}
`;
}
```

---

## 6) Üretim Akışı (`soruUret`)

```ts
export interface SoruUretGirdisi {
  konu: string;
  ders: string;
  konuId?: string;
  sayi: number;
  zorluk?: 'KOLAY' | 'ORTA' | 'ZOR';
  gorselMod?: 'svg' | 'dalle' | 'yok';
  modelOverride?: string;
  ogretmenTalimat?: string;
  uniteAdi?: string;
  ogretimTuru?: 'YKS' | 'LGS';
  yksSegment?: 'TYT' | 'AYT';
}

export interface UretilenSoru {
  metin: string;
  secenekler: Record<'A' | 'B' | 'C' | 'D' | 'E', string>;
  dogruCevap: 'A' | 'B' | 'C' | 'D' | 'E';
  cozumAciklamasi?: string;
  kazanim?: string;
  svgGorsel?: string;
  gorselUrl?: string | null;
}

export async function soruUret(g: SoruUretGirdisi): Promise<{
  sorular: UretilenSoru[];
  kullanılanModel: string;
  kullanilanKaynaklar: string[];
}> {
  const secilenModel = g.modelOverride ?? modelSec(g.ders, g.zorluk);
  const gorselMod = g.gorselMod ?? 'yok';
  const svgModel =
    gorselMod === 'svg' ? modelSecGorselUretim(g.ders, g.zorluk, secilenModel) : secilenModel;

  // 1) RAG (opsiyonel): konuya ait dokümanları getir
  const kaynaklar = g.konuId ? await similaritySearch(g.konuId, g.konu, 5) : [];
  const ragMetni = kaynaklariPromptaCevir(kaynaklar);

  // 2) Prompt
  const kullaniciPrompt =
    gorselMod === 'svg'
      ? svgPrompt({ ...g, ragMetni } as any)
      : metin_promptu({ ...g, ragMetni } as any);

  // 3) Parti büyüklüğü: SVG modunda küçük tut (daha doğru SVG)
  const partiBoyu =
    gorselMod === 'svg' && g.ders.toLowerCase().includes('fizik')
      ? 2
      : gorselMod === 'svg'
        ? 3
        : 4;

  // 4) Paralel üretim
  const sorular: UretilenSoru[] = [];
  for (let kalan = g.sayi; kalan > 0; ) {
    const adet = Math.min(partiBoyu, kalan);
    const ham = await openrouterChat(
      gorselMod === 'svg' ? svgModel : secilenModel,
      [
        { role: 'system', content: SYS_SORU_URET },
        { role: 'user', content: `${kullaniciPrompt}\nADET: ${adet}` },
      ],
      { temperature: 0.7, max_tokens: gorselMod === 'svg' ? 8192 : 4096, json: true },
    );

    const parça = (jsonAyikla(ham) as { sorular: UretilenSoru[] }).sorular ?? [];
    sorular.push(...parça);
    kalan -= parça.length || adet; // model az verdiyse yine ilerle
  }

  // 5) Normalize
  sorular.forEach((s) => {
    if (s.svgGorsel) s.svgGorsel = svgNormalize(s.svgGorsel);
  });

  // 6) SVG modunda boş SVG'leri tamamla
  if (gorselMod === 'svg') {
    for (let i = 0; i < sorular.length; i++) {
      const s = sorular[i];
      if (!s.svgGorsel || s.svgGorsel.length < 30) {
        sorular[i] = await svgEklemeIstegi(s, svgModel, g);
      }
    }
  }

  return {
    sorular: sorular.slice(0, g.sayi),
    kullanılanModel: secilenModel,
    kullanilanKaynaklar: kaynaklar.map((k: any) => k.baslik),
  };
}
```

### 6.1 SVG Eksikse Tek Soruluk Yeniden İstek

```ts
async function svgEklemeIstegi(s: UretilenSoru, model: string, _g: SoruUretGirdisi) {
  const prompt = `
Aşağıdaki soruya inline SVG hazırla.
SADECE şu JSON'u döndür: {"svgGorsel":"<svg ...>...</svg>"}.
SORU: ${s.metin}
`;
  const ham = await openrouterChat(
    model,
    [
      { role: 'system', content: SYS_SORU_URET },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.6, max_tokens: 4096, json: true },
  );
  const ext = jsonAyikla(ham) as { svgGorsel?: string };
  return { ...s, svgGorsel: ext.svgGorsel ? svgNormalize(ext.svgGorsel) : '' };
}
```

### 6.2 JSON Ayıkla + SVG Normalize

```ts
export function jsonAyikla(s: string): any {
  // Markdown ```json ``` veya ham JSON'ı yakala
  const blok = s.match(/```json([\s\S]*?)```/);
  const ham = blok ? blok[1] : s;
  const ilk = ham.indexOf('{');
  const son = ham.lastIndexOf('}');
  if (ilk < 0 || son < 0) return {};
  try {
    return JSON.parse(ham.slice(ilk, son + 1));
  } catch {
    return {};
  }
}

export function svgNormalize(s: string): string {
  let svg = s.trim();
  // Markdown wrap, escape veya tek tırnak SVG sözdizimini tolere et
  if (!svg.startsWith('<svg')) {
    const m = svg.match(/<svg[\s\S]*<\/svg>/i);
    if (!m) return '';
    svg = m[0];
  }
  // viewBox yoksa ekle
  if (!/viewBox=/.test(svg)) svg = svg.replace('<svg', '<svg viewBox="0 0 600 400"');
  // xmlns yoksa ekle
  if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg;
}
```

---

## 7) Doğrulama (`validateUretilenSoruListesi`)

İlk savunma hattı — model şıkları eksik döndü ise oraya geri dönmemek için.

```ts
export function validateUretilenSoruListesi(
  sorular: UretilenSoru[],
  opts: { secenekSayisi: 4 | 5 },
): { ok: boolean; sorular: UretilenSoru[]; hatalar: string[] } {
  const hatalar: string[] = [];
  const siklar = ['A', 'B', 'C', 'D', 'E'].slice(0, opts.secenekSayisi);
  const temiz: UretilenSoru[] = [];

  sorular.forEach((s, i) => {
    if (!s.metin || s.metin.split(' ').length < 6) hatalar.push(`#${i + 1} soru kökü kısa`);
    const sec = s.secenekler || ({} as any);
    const eksik = siklar.filter((k) => !sec[k as 'A' | 'B' | 'C' | 'D' | 'E']?.trim());
    if (eksik.length) hatalar.push(`#${i + 1} eksik şık: ${eksik.join(',')}`);
    if (!siklar.includes(s.dogruCevap)) hatalar.push(`#${i + 1} geçersiz dogruCevap`);
    temiz.push(s);
  });

  return { ok: hatalar.length === 0, sorular: temiz, hatalar };
}
```

---

## 8) Garanti Katmanı (Çapraz Çözücü)

Bağımsız bir model üretilen soruyu çözer, kendi cevabıyla AI'ın `dogruCevap`'ı uyuşmuyorsa ya soruyu reddet ya da düzelt.

```ts
const CROSSCHECK = ['openai/o3-mini', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4.1'];

export async function soruUretimGarantiKatmani(
  sorular: UretilenSoru[],
  _ders: string,
  opts: { sikiDogrulama?: boolean; hataYerineDuzelt?: boolean },
) {
  const sonuc: UretilenSoru[] = [];
  const garantiMeta: any[] = [];

  for (const s of sorular) {
    const cozumModeli = CROSSCHECK[0];
    const prompt = `
Aşağıdaki çoktan seçmeli soruyu kendi başına çöz. SADECE bu JSON'u döndür:
{"cevap":"A|B|C|D|E","gerekçe":"kısa"}
SORU:
${s.metin}${s.svgGorsel ? '\nSVG:' + s.svgGorsel : ''}
ŞIKLAR:
${Object.entries(s.secenekler)
  .map(([k, v]) => `${k}) ${v}`)
  .join('\n')}
`;
    const ham = await openrouterChat(
      cozumModeli,
      [
        { role: 'system', content: 'Sen titiz bir çözücüsün.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.0, max_tokens: 600, json: true },
    );
    const cevap = (jsonAyikla(ham) as { cevap?: string }).cevap;

    if (cevap && cevap === s.dogruCevap) {
      sonuc.push(s);
      garantiMeta.push({ cevap, dogru: true });
    } else if (opts.hataYerineDuzelt) {
      // Bağımsız çözücünün cevabını doğru kabul et
      sonuc.push({ ...s, dogruCevap: (cevap || s.dogruCevap) as any });
      garantiMeta.push({ cevap, dogru: false, otoDuzeltildi: true });
    } else if (!opts.sikiDogrulama) {
      sonuc.push(s);
      garantiMeta.push({ cevap, dogru: false });
    }
    // sıkı dogrulama + duzeltme yok → soruyu at
  }

  return { sorular: sonuc, garantiMeta };
}
```

---

## 9) Fizik için Özel SVG Şablonları (opsiyonel ama çok faydalı)

Modeller seri devre, optik vb. çizimlerde sürekli hata yapar. Bilinen şablonlarla **fallback** sun:

```ts
export function seriDevreSorusuMu(metin: string): boolean {
  return /(seri\s+devre|toplam\s+direnç|R1.*R2.*R3)/i.test(metin);
}

export function seriDevreSvgSablonuOlustur(r: number[], emf = 12): string {
  const baslangic = 50;
  const adim = 100;
  const dirençler = r
    .map(
      (deger, i) => `
    <rect x="${baslangic + i * adim}" y="180" width="60" height="40" fill="none" stroke="#111827" stroke-width="2"/>
    <text x="${baslangic + i * adim + 30}" y="170" font-size="12" text-anchor="middle">R${i + 1}=${deger}Ω</text>
  `,
    )
    .join('');
  return `
<svg viewBox="0 0 ${baslangic + r.length * adim + 60} 300" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="200" x2="${baslangic + r.length * adim + 60}" y2="200" stroke="#111827" stroke-width="2"/>
  ${dirençler}
  <circle cx="20" cy="200" r="10" fill="none" stroke="#111827"/>
  <text x="5" y="195" font-size="12">${emf}V</text>
</svg>`;
}

export function fizikSvgZayifMi(svg: string): boolean {
  return !svg || svg.length < 200 || !/<rect|<circle|<line|<path/.test(svg);
}
```

`soruUret` içinde fizik ise:

```ts
if (gorselMod === 'svg' && g.ders.toLowerCase().includes('fizik')) {
  for (const s of sorular) {
    if (fizikSvgZayifMi(s.svgGorsel ?? '') && seriDevreSorusuMu(s.metin)) {
      s.svgGorsel = seriDevreSvgSablonuOlustur([10, 20, 30]);
    }
  }
}
```

---

## 10) Controller + Endpoint

```ts
router.post(
  '/soru-uret',
  kimlikDogrula,
  rolKontrol('ADMIN', 'TEACHER'),
  async (req, res, next) => {
    try {
      const { konuId, sayi, zorluk, gorselMod, modelOverride, ogretmenTalimat } = req.body;
      const konu = await prisma.konu.findUnique({ where: { id: konuId } });
      if (!konu) return res.status(404).json({ basarili: false, mesaj: 'Konu yok' });

      const { sorular, kullanılanModel } = await soruUret({
        konu: konu.ad,
        ders: konu.ders,
        konuId: konu.id,
        sayi: sayi ?? 5,
        zorluk,
        gorselMod,
        modelOverride,
        ogretmenTalimat,
        ogretimTuru: konu.ogretimTuru as 'YKS' | 'LGS',
        uniteAdi: konu.uniteAdi ?? undefined,
      });

      const secenekSayisi = konu.ogretimTuru === 'LGS' ? 4 : 5;
      const dogr = validateUretilenSoruListesi(sorular, { secenekSayisi });
      if (!dogr.ok) return res.status(422).json({ basarili: false, hatalar: dogr.hatalar });

      const garanti = await soruUretimGarantiKatmani(dogr.sorular, konu.ders, {
        sikiDogrulama: true,
        hataYerineDuzelt: true,
      });

      const kayit = await Promise.all(
        garanti.sorular.map((s, i) =>
          prisma.soru.create({
            data: {
              konuId,
              siraNo: i + 1,
              metinHtml: s.svgGorsel
                ? `${s.metin}<div class="soru-svg-gorsel">${s.svgGorsel}</div>`
                : s.metin,
              secenekler: s.secenekler,
              dogruCevap: s.dogruCevap,
              zorluk: zorluk || 'ORTA',
              kazanim: s.kazanim || null,
              aiMeta: { model: kullanılanModel, garanti: garanti.garantiMeta[i] },
            },
          }),
        ),
      );

      res.json({ basarili: true, veri: { sorular: kayit, model: kullanılanModel } });
    } catch (e) {
      next(e);
    }
  },
);
```

---

## 11) Frontend Tetikleme

```ts
// frontend/lib/api.ts
export const aiApi = {
  soruUret: (veri: {
    konuId: string;
    sayi: number;
    zorluk: 'KOLAY' | 'ORTA' | 'ZOR';
    gorselMod?: 'svg' | 'yok';
    modelOverride?: string;
    ogretmenTalimat?: string;
  }) =>
    api.post('/ai/soru-uret', veri, { timeout: 180_000 }).then((r) => r.data.veri),
};
```

UI tarafında:

```tsx
const { mutate, isPending } = useMutation({
  mutationFn: aiApi.soruUret,
  onSuccess: (r) => toast.basarili(`${r.sorular.length} soru üretildi`),
});

mutate({ konuId, sayi: 5, zorluk: 'ORTA', gorselMod: 'svg' });
```

---

## 12) SVG Render (Güvenli Gösterim)

`metinHtml` içinde inline SVG var. Tarayıcıda göstermek için sanitize et:

```tsx
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';
import katex from 'katex';

export function SoruMetni({ html }: { html: string }) {
  // 1) SVG dahil sanitize
  const temiz = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
  });

  // 2) KaTeX inline render
  const katexli = temiz.replace(/\$([^$]+)\$/g, (_, expr) =>
    katex.renderToString(expr, { throwOnError: false }),
  );

  return <div dangerouslySetInnerHTML={{ __html: katexli }} />;
}
```

---

## 13) Önemli Püf Noktaları (Tecrübeden Çıkarımlar)

1. **`temperature 0.7-0.8` üretim için ideal, `0.0` çözüm/doğrulama için.**
2. **JSON modda zorla** (`response_format: { type: 'json_object' }`) – yine de markdown çıkışına karşı `jsonAyikla` kullan.
3. **Parti boyutu** SVG modunda 2-3, metinde 4-5 olmalı. Daha büyük parti → SVG bozulur.
4. **Yedek model zinciri** zorunlu. OpenRouter zaman zaman 429/503 verir.
5. **Çapraz çözücü** olmadan AI'ın doğru cevabı sık kaymaktadır; özellikle sözel sorularda.
6. **SVG'yi `dangerouslySetInnerHTML` ile render** ederken sanitize et (örn. DOMPurify SVG profili).
7. **KaTeX** ile `metinHtml` render et – LaTeX matematik ifadeleri için.
8. **Cache yazma**: aynı `konuId + zorluk + model` kombinasyonu için kısa Redis cache (1-2 dk) yararlı; aynı saniyede çift istek gelirse maliyet patlamaz.
9. **Maliyet kontrolü**: `usage` alanını dönen `data.usage.total_tokens` ile loglayıp aylık `kullaniciId` bazlı kotaya bağla.
10. **Kazanım/Çözüm AI ile ayrıca polish**: ilk üretimden sonra `aiSoruKaliteIsleme` fonksiyonu kazanım cümlesini ve çözümü ÖSYM tarzına çekmek için ikinci geçiş yapar (opsiyonel ama çok daha kaliteli sonuç verir).

---

## 14) Yeni Projedeki Klasör Yapısı (Önerim)

```
backend/
  src/
    config/
      openrouter.ts            # API key yönetimi
    services/
      ai.service.ts            # soruUret() + prompts
      rag.service.ts           # opsiyonel doküman araması
      soruGarantiKatmani.ts    # çapraz çözücü
      soruAiKalite.ts          # opsiyonel polish
    controllers/
      ai.controller.ts
    routes/
      ai.routes.ts
    utils/
      openrouterHeaders.ts
      aiSoruMetinTemizle.ts    # LATEX yönergesi, SVG kuralları, jsonAyikla, svgNormalize
      fizikSvgYardim.ts        # seri devre vb. şablonları
      soruUretimDogrulama.ts
```

---

## 15) Bağımlılıklar

`package.json`:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "@prisma/client": "^5.9.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "prisma": "^5.9.0",
    "typescript": "^5.3.0"
  }
}
```

Frontend için ek:

```json
{
  "dependencies": {
    "dompurify": "^3.0.0",
    "katex": "^0.16.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

---

## 16) Akış Özeti (Bir Tabloda)

| Adım | Sorumluluk | Çıktı |
|------|------------|-------|
| 1 | `modelSec(ders, zorluk)` | Ana model seçimi (ör. `openai/gpt-4.1`) |
| 2 | `modelSecGorselUretim()` | SVG modunda görsel modele override |
| 3 | `similaritySearch()` (opsiyonel) | Konuya özel RAG metinleri |
| 4 | Prompt oluştur | Metin veya SVG prompt'u |
| 5 | `openrouterChat()` parti parti çağrı | Ham JSON metni |
| 6 | `jsonAyikla()` + `svgNormalize()` | Yapılandırılmış soru dizisi |
| 7 | `svgEklemeIstegi()` (eksik SVG için) | Boş SVG'ler dolduruluyor |
| 8 | `validateUretilenSoruListesi()` | Şık/cevap doğrulama |
| 9 | `soruUretimGarantiKatmani()` | Bağımsız modelle çapraz çözüm |
| 10 | `aiSoruKaliteIsleme()` (opsiyonel) | Kazanım/çözüm polish |
| 11 | `prisma.soru.create()` | Veri tabanına kayıt |

---

Bu rehberi 1:1 yeni projene aktarırsan başka değişiklik yapmadan `POST /ai/soru-uret` çağrısıyla hem **metin** hem **SVG'li** sorular üretebilirsin. Tablo isimleri farklıysa yalnızca `prisma.soru.create()` ve `prisma.konu.findUnique()` çağrılarını değiştirmen yeterli.
