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

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': asciiHeaderValue(process.env.APP_URL || 'https://wingodeneme.local') || 'https://wingodeneme.local',
    'X-Title': asciiHeaderValue(process.env.APP_NAME || 'Wingo Deneme') || 'Wingo Deneme',
  },
});

interface AnalizGirdisi {
  ogrenciAd: string;
  ogretimTuru: string;
  sinif?: string;
  performanslar: Array<{ ders: string; konu: string; basari: number; toplamSoru: number }>;
  sinavGecmisi: Array<{ baslik: string; net: number; siralama?: number; tarih: string }>;
  hedefUniversite?: string;
}

export async function analizYap(girdi: AnalizGirdisi) {
  const prompt = `
Sen bir YKS/LGS uzman eğitim danışmanısın. Öğrenci verisini derinlemesine analiz et.

Öğrenci: ${girdi.ogrenciAd}
Öğretim Türü: ${girdi.ogretimTuru}
Sınıf: ${girdi.sinif || 'Belirtilmemiş'}
Hedef Üniversite: ${girdi.hedefUniversite || 'Belirtilmemiş'}

PERFORMANS VERİSİ:
${JSON.stringify(girdi.performanslar, null, 2)}

SINAV GEÇMİŞİ:
${JSON.stringify(girdi.sinavGecmisi, null, 2)}

Detaylı analiz yaparak aşağıdaki JSON formatında yanıt ver:
{
  "genelDurum": {
    "seviye": "BAŞLANGIC|GELİŞEN|ORTA|İYİ|MÜKEMMELb",
    "puan": 75,
    "trend": "YUKARI|DURAK|ASAGI"
  },
  "gucluYonler": [
    {"ders": "Matematik", "konu": "Türev", "basariYuzdesi": 85, "yorum": "..."}
  ],
  "zayifYonler": [
    {"ders": "Fizik", "konu": "Newton Yasaları", "basariYuzdesi": 35, "yorum": "...", "oncelik": "YÜKSEK"}
  ],
  "kisiselMesaj": "Ahmet, matematik konusunda...",
  "acilOnlemler": ["Newton yasalarına gün içinde 1 saat ayır", "..."],
  "tahminiNYKS": {
    "TYT": 85.5,
    "AYT": 62.3
  },
  "motivasyonSeviyesi": "YUKSEK|ORTA|DUSUK",
  "tavsiyeEdilenKaynaklar": [
    {"tur": "KİTAP|VİDEO|TEST", "baslik": "...", "ders": "Fizik"}
  ]
}
`;

  try {
    const yanit = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 3000,
    });
    return JSON.parse(yanit.choices[0].message.content || '{}');
  } catch (err) {
    console.error('Analiz hatası:', err);
    return {
      genelDurum: { seviye: 'ORTA', puan: 50, trend: 'DURAK' },
      kisiselMesaj: `${girdi.ogrenciAd}, çalışmaya devam et! Her gün biraz daha iyi oluyorsun.`,
      acilOnlemler: ['Zayıf konularına odaklan', 'Düzenli tekrar yap'],
    };
  }
}
