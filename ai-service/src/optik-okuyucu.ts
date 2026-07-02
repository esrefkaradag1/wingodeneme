import OpenAI from 'openai';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'https://wingodeneme.local',
    'X-Title': process.env.APP_NAME || 'Wingo Deneme',
  },
});

export interface OptikSonuc {
  soruNo: number;
  secilen: string | null;
}

export async function optikFormOku(dosyaBuffer: Buffer, soruSayisi: number): Promise<OptikSonuc[]> {
  // Görüntüyü optimize et
  const optimizeGorsel = await sharp(dosyaBuffer)
    .resize(2480, 3508, { fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();

  const base64Gorsel = optimizeGorsel.toString('base64');

  const prompt = `
Bu bir Türk öğrenci cevap kâğıdı (optik form / OMR sheet) görüntüsüdür.
${soruSayisi} adet sorunun cevaplarını oku.

Her soru için öğrencinin işaretlediği şıkkı belirle (A, B, C, D, E).
Eğer soru boş bırakılmışsa null olarak işaretle.
Eğer birden fazla şık işaretlenmişse (iptal) null olarak işaretle.

Sadece JSON formatında döndür:
{
  "cevaplar": [
    {"soruNo": 1, "secilen": "A"},
    {"soruNo": 2, "secilen": null},
    ...
  ]
}
`;

  try {
    const yanit = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Gorsel}`, detail: 'high' },
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const icerik = yanit.choices[0].message.content || '{"cevaplar":[]}';
    const veri = JSON.parse(icerik);
    return veri.cevaplar || [];
  } catch (err) {
    console.error('Optik form okuma hatası:', err);
    // Görüntü işleme ile fallback dene
    return goruntuIslemeFallback(dosyaBuffer, soruSayisi);
  }
}

// Basit görüntü işleme ile cevap okuma (fallback)
async function goruntuIslemeFallback(dosyaBuffer: Buffer, soruSayisi: number): Promise<OptikSonuc[]> {
  // Görüntüyü analiz et - basit renk/piksel bazlı yaklaşım
  const gorsel = sharp(dosyaBuffer).grayscale();
  const { width = 2480, height = 3508 } = await gorsel.metadata();

  // Optik formun grid konumlarını hesapla
  // YKS/LGS optik formu: 40 soru, 5 şık (A-E)
  const secenek_genislik = width / 7; // margin + 5 secenek + margin
  const soru_yukseklik = height / (soruSayisi + 4); // header + sorular + footer

  const sonuclar: OptikSonuc[] = [];
  const sekiller = ['A', 'B', 'C', 'D', 'E'];

  for (let soruNo = 1; soruNo <= soruSayisi; soruNo++) {
    let enKaranlik = 255;
    let secilenSik: string | null = null;

    for (let sikIndex = 0; sikIndex < 5; sikIndex++) {
      const x = Math.round(secenek_genislik * (sikIndex + 1));
      const y = Math.round(soru_yukseklik * (soruNo + 1));
      const bolgeBoyutu = Math.round(Math.min(secenek_genislik, soru_yukseklik) * 0.6);

      try {
        const bolge = await sharp(dosyaBuffer)
          .extract({ left: x, top: y, width: bolgeBoyutu, height: bolgeBoyutu })
          .grayscale()
          .raw()
          .toBuffer();

        const ortalama = bolge.reduce((a, b) => a + b, 0) / bolge.length;
        if (ortalama < enKaranlik) {
          enKaranlik = ortalama;
          secilenSik = sekiller[sikIndex];
        }
      } catch {
        // Bölge sınır dışı
      }
    }

    // Eşik değeri: işaretli alan 128'den karanlık olmalı
    sonuclar.push({ soruNo, secilen: enKaranlik < 128 ? secilenSik : null });
  }

  return sonuclar;
}
