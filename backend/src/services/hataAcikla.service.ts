import { openrouterChat, modelSec } from './ai.service';
import { aiJsonAyikla } from '../utils/aiJsonAyikla';
import { logger } from '../utils/logger';

export interface HataAciklaSonuc {
  ogretmenSozu: string;
  neden: string;
  neYapmali: string;
  miniIpucu: string;
  tahtaAdimlari: { baslik: string; satirlar: string[] }[];
  cizimAdimlari: { adimIdx: number; elemanlar: Record<string, unknown>[] }[];
  videoAdimlari?: {
    adimIdx: number;
    baslik: string;
    anlatim: string;
    formul?: string;
    elemanlar?: Record<string, unknown>[];
  }[];
  model: string;
  yedekMi?: boolean;
}

function soruCozumMetni(soru: { aiMeta?: unknown }): string {
  const meta = soru?.aiMeta;
  if (!meta || typeof meta !== 'object') return '';
  return String((meta as Record<string, unknown>).cozumAciklamasi || '').trim();
}

function jsonModu(model: string): Record<string, unknown> {
  if (model.startsWith('openai/')) return { response_format: { type: 'json_object' } };
  return {};
}

function hataAciklaModelleri(ders: string, zorluk?: string): string[] {
  const ozel = process.env.HATA_ACIKLA_MODEL?.trim();
  const birincil = ozel || modelSec(ders || 'matematik', zorluk);
  return Array.from(
    new Set([
      birincil,
      modelSec(ders || 'matematik', zorluk),
      'openai/gpt-4.1',
      'openai/gpt-4o',
      'google/gemini-2.5-flash',
      'anthropic/claude-3.5-sonnet',
    ])
  );
}

function promptOlustur(girdi: {
  ders: string;
  konu: string;
  kazanim: string;
  sinavBaslik: string;
  sinavTur: string;
  soruMetin: string;
  secenekler: Record<string, string>;
  dogru: string;
  secilen: string | null;
  cozumOzeti: string;
}): string {
  const cozumBlok = girdi.cozumOzeti
    ? `\nÖğretmen çözüm özeti (öğrenciye adım adım kopyalama; hatayı ve stratejiyi buna göre anlat):\n${girdi.cozumOzeti.slice(0, 1800)}\n`
    : '';

  return `Sen deneyimli bir ${girdi.ders} öğretmenisin. Öğrencinin yanlış/boş bıraktığı soruyu, referans videodaki gibi hologram 3D tahtada ADIM ADIM video çözümüyle anlatacaksın.
Tüm metinler TÜRKÇE olacak (İngilizce YASAK). Samimi öğretmen üslubu kullan.

REFERANS VİDEO STİLİ:
- Futuristik sınıfta mavi hologram üçgen/şekil
- Adım adım: şekil kur → yardımcı çizgiler → kenar etiketleri (k, 2k) → benzerlik/oran formülü → alan etiketleri
- Her adımda sesli anlatım metni (anlatim) ve görsel (elemanlar) birlikte ilerler

KURALLAR — YAZILI METİN:
- neden: 3-5 cümle; BU SORUYA özel tipik yanılgı (genel cümle YASAK).
- neYapmali: 2-3 cümle; uygulanabilir strateji.
- miniIpucu: 1-2 cümle; konuya özel kural.
- ogretmenSozu: 1 samimi Türkçe giriş cümlesi.

KURALLAR — VİDEO ADIMLARI (videoAdimlari) — ZORUNLU, 5-7 adım:
- Her adım: adimIdx (0..n), baslik (Türkçe), anlatim (sesli okunacak Türkçe metin, 1-3 cümle), formul (varsa Türkçe, örn. "Benzerlik Oranı: 2k/3k = 2/3"), elemanlar (çizim)
- elemanlar koordinatları 0-1 normalize; türler: segment, angle, triangle, circle, arrow, label, dikAci
- SADECE label YASAK: her adımda en az bir segment, circle, triangle veya arrow olmalı
- Adımlar kümülatif: her adımda önceki çizimler korunur, yeniler eklenir
- Geometri/benzerlik: ABC üçgeni → DE doğruları → k,2k,3k etiketleri → benzerlik formülü → 4S,9S alan
- Trigonometri: dik üçgen → θ açısı → sin/cos/tan formülleri
- Analitik geometri/teğet: x-y eksenleri → çember (O merkez) → OT yarıçapı → T noktası → teğet doğrusu → dik açı işareti

KURALLAR — TAHTA ADIMLARI (tahtaAdimlari): 3 özet adım (yedek metin).
KURALLAR — cizimAdimlari: videoAdimlari ile uyumlu veya boş bırakılabilir.

ÖRNEK videoAdimlari (benzerlik):
{"adimIdx":0,"baslik":"Üçgeni kur","anlatim":"Önce ABC üçgenini hologramda çizelim.","elemanlar":[{"tur":"triangle","noktalar":[0.5,0.16,0.2,0.84,0.8,0.84],"renk":"#22d3ee"},{"tur":"label","x":0.5,"y":0.1,"metin":"A"}]}
{"adimIdx":3,"baslik":"Benzerlik oranı","anlatim":"Benzer üçgenlerde karşılıklı kenarlar orantılıdır.","formul":"Benzerlik Oranı: 2k/3k = 2/3","elemanlar":[...]}

ÖRNEK videoAdimlari (analitik geometri / teğet):
{"adimIdx":0,"baslik":"Eksenler","anlatim":"Koordinat düzlemini çizelim.","elemanlar":[{"tur":"segment","x1":0.12,"y1":0.72,"x2":0.88,"y2":0.72},{"tur":"segment","x1":0.3,"y1":0.88,"x2":0.3,"y2":0.14},{"tur":"label","x":0.26,"y":0.78,"metin":"O(0,0)"}]}
{"adimIdx":2,"baslik":"Teğet noktası","anlatim":"T noktasından OT yarıçapını çizelim.","elemanlar":[{"tur":"circle","cx":0.3,"cy":0.72,"r":0.32},{"tur":"segment","x1":0.3,"y1":0.72,"x2":0.52,"y2":0.42},{"tur":"label","x":0.54,"y":0.38,"metin":"T(3,4)"}]}

Çıktı SADECE geçerli JSON:
{
  "ogretmenSozu":"...",
  "neden":"...",
  "neYapmali":"...",
  "miniIpucu":"...",
  "videoAdimlari":[{"adimIdx":0,"baslik":"...","anlatim":"...","formul":"...","elemanlar":[...]}],
  "tahtaAdimlari":[{"baslik":"1. ...","satirlar":["..."]}],
  "cizimAdimlari":[]
}

Sınav: ${girdi.sinavBaslik} (${girdi.sinavTur})
Ders/Konu: ${girdi.ders} / ${girdi.konu}
Kazanım: ${girdi.kazanim || '—'}
${cozumBlok}
Soru:
${girdi.soruMetin}

Şıklar:
${Object.entries(girdi.secenekler).map(([k, v]) => `${k}: ${String(v).slice(0, 220)}`).join('\n')}

Doğru cevap: ${girdi.dogru}
Öğrencinin seçimi: ${girdi.secilen || 'BOŞ'}`;
}

function parseCikti(icerik: string): Partial<HataAciklaSonuc> | null {
  const veri = aiJsonAyikla(icerik);
  const neden = typeof veri.neden === 'string' ? veri.neden.trim() : '';
  const neYapmali = typeof veri.neYapmali === 'string' ? veri.neYapmali.trim() : '';
  const miniIpucu = typeof veri.miniIpucu === 'string' ? veri.miniIpucu.trim() : '';
  if (!neden && !neYapmali && !miniIpucu) return null;

  const ogretmenSozu = typeof veri.ogretmenSozu === 'string' ? veri.ogretmenSozu.trim() : '';
  const tahtaAdimlari = Array.isArray(veri.tahtaAdimlari)
    ? veri.tahtaAdimlari
        .map((adim) => {
          if (!adim || typeof adim !== 'object') return null;
          const a = adim as Record<string, unknown>;
          const baslik = typeof a.baslik === 'string' ? a.baslik.trim() : '';
          const satirlar = Array.isArray(a.satirlar)
            ? a.satirlar.map((s) => String(s || '').trim()).filter(Boolean)
            : [];
          if (!baslik && satirlar.length === 0) return null;
          return { baslik: baslik || 'Adım', satirlar };
        })
        .filter(Boolean) as { baslik: string; satirlar: string[] }[]
    : [];

  const cizimAdimlari = Array.isArray(veri.cizimAdimlari)
    ? veri.cizimAdimlari
        .map((raw) => {
          if (!raw || typeof raw !== 'object') return null;
          const c = raw as Record<string, unknown>;
          const adimIdx = typeof c.adimIdx === 'number' ? c.adimIdx : Number(c.adimIdx);
          if (!Number.isFinite(adimIdx)) return null;
          const elemanlar = Array.isArray(c.elemanlar)
            ? c.elemanlar.filter((el) => el && typeof el === 'object') as Record<string, unknown>[]
            : [];
          return { adimIdx, elemanlar };
        })
        .filter(Boolean) as { adimIdx: number; elemanlar: Record<string, unknown>[] }[]
    : [];

  const videoAdimlari = Array.isArray(veri.videoAdimlari)
    ? veri.videoAdimlari
        .map((raw) => {
          if (!raw || typeof raw !== 'object') return null;
          const v = raw as Record<string, unknown>;
          const adimIdx = typeof v.adimIdx === 'number' ? v.adimIdx : Number(v.adimIdx);
          if (!Number.isFinite(adimIdx)) return null;
          const baslik = typeof v.baslik === 'string' ? v.baslik.trim() : '';
          const anlatim = typeof v.anlatim === 'string' ? v.anlatim.trim() : '';
          if (!baslik && !anlatim) return null;
          const formul = typeof v.formul === 'string' ? v.formul.trim() : undefined;
          const elemanlar = Array.isArray(v.elemanlar)
            ? v.elemanlar.filter((el) => el && typeof el === 'object') as Record<string, unknown>[]
            : undefined;
          return { adimIdx, baslik: baslik || `Adım ${adimIdx + 1}`, anlatim: anlatim || baslik, formul, elemanlar };
        })
        .filter(Boolean) as HataAciklaSonuc['videoAdimlari']
    : undefined;

  return { ogretmenSozu, neden, neYapmali, miniIpucu, tahtaAdimlari, cizimAdimlari, videoAdimlari };
}

function konuBazliYedek(girdi: {
  ders: string;
  konu: string;
  soruMetin: string;
  dogru: string;
  secilen: string | null;
}): HataAciklaSonuc {
  const birlesik = `${girdi.ders} ${girdi.konu} ${girdi.soruMetin}`.toLowerCase();
  const bos = !girdi.secilen;

  if (/trigonometri|sinüs|sinus|kosinüs|kosinus|tanjant/.test(birlesik)) {
    return {
      ogretmenSozu: 'Bu trigonometri sorusunda önce üçgeni ve açıyı netleştirelim.',
      neden: bos
        ? 'Soruyu boş bırakmışsın. Trigonometride hangi oranın (sin, cos, tan) istendiği netleşmeden çözüme başlamak zor.'
        : 'Trigonometride en sık hata, karşı-komşu-hipotenüs kenarlarını karıştırmak veya yanlış oranı seçmektir.',
      neYapmali:
        'Dik üçgen çiz; verilen açıyı işaretle; karşı ve komşu kenarları yaz. sin=karşın/hip, cos=komşu/hip, tan=karşın/komşu formülünden doğru şıka git.',
      miniIpucu: 'Önce “bu açıya karşı hangi kenar?” sorusunu sor; sonra oranı seç.',
      tahtaAdimlari: [
        { baslik: '1. Üçgeni kur', satirlar: ['Dik üçgende açı θ ve kenarları işaretle.'] },
        { baslik: '2. Oranı seç', satirlar: ['sin, cos veya tan — soru hangisini istiyor?'] },
        { baslik: '3. Kontrol', satirlar: [`Doğru şık ${girdi.dogru}; oranı hesaplayıp eşleştir.`] },
      ],
      cizimAdimlari: [],
      model: 'yedek-sablon',
      yedekMi: true,
    };
  }

  if (/matematik|geometri|analitik|fonksiyon|denklem|limit|türev|turev|integral/.test(birlesik)) {
    return {
      ogretmenSozu: 'Bu matematik sorusunda hangi kuralı kullanacağımıza birlikte bakalım.',
      neden: bos
        ? 'Soruyu boş bırakmışsın; verilen ifadeyi hangi kurala bağlayacağını belirleyemediysen çözüm başlamaz.'
        : 'Bu soruda muhtemelen ara adımı atladın veya verilenleri yanlış yorumladın.',
      neYapmali: 'Verilenleri yaz; istenen netleşsin; hangi formül/kural geçerli onu işaretle; adım adım uygula.',
      miniIpucu: 'Önce “ne verilmiş, ne isteniyor?” tablosunu kur.',
      tahtaAdimlari: [
        { baslik: '1. Verilenler', satirlar: ['Sorudaki sayıları ve ilişkileri not al.'] },
        { baslik: '2. Kural', satirlar: ['Bu konuda hangi formül geçerli?'] },
        { baslik: '3. Sonuç', satirlar: [`Doğru şık ${girdi.dogru}; adımları kontrol et.`] },
      ],
      cizimAdimlari: [],
      model: 'yedek-sablon',
      yedekMi: true,
    };
  }

  if (/coğrafya|cografya|rüzgar|ruzgar|enerji|iklim|maden/.test(birlesik)) {
    return {
      ogretmenSozu: 'Harita ve bölge bilgisini tahtada birlikte görelim.',
      neden: bos
        ? 'Soruyu boş bırakmışsın; bölgesel özellikleri (iklim, konum, kaynak) eşleştirmeden şık seçmek zor.'
        : 'Bu soruda bölgesel özellik ile enerji/kaynak eşleşmesini karıştırmış olabilirsin.',
      neYapmali: 'Haritada bölgeyi bul; o bölgenin iklim ve kaynak özelliklerini hatırla; şıkları tek tek ele.',
      miniIpucu: 'Konum → iklim → enerji potansiyeli zincirini kur.',
      tahtaAdimlari: [
        { baslik: '1. Bölge', satirlar: ['Sorudaki yeri haritada netleştir.'] },
        { baslik: '2. Özellik', satirlar: ['İklim ve kaynak ne diyor?'] },
        { baslik: '3. Eşleştir', satirlar: [`Doğru şık ${girdi.dogru}.`] },
      ],
      cizimAdimlari: [],
      model: 'yedek-sablon',
      yedekMi: true,
    };
  }

  return {
    ogretmenSozu: 'Hadi bu soruyu tahtada adım adım inceleyelim.',
    neden: bos
      ? 'Soruyu boş bırakmışsın; soru kökündeki anahtar kavramı kaçırmış olabilirsin.'
      : 'Bu soruda kazanımı uygularken bir ara adımı atlamış veya yanlış varsayım yapmış olabilirsin.',
    neYapmali: 'Soru kökünü parçala; her şıkkı verilenlerle tek tek sınayıp ele.',
    miniIpucu: 'Önce istenen netleşsin, sonra şıklara bak.',
    tahtaAdimlari: [
      { baslik: '1. Hata nerede?', satirlar: ['Anahtar kavramı veya adımı gözden kaçırmış olabilirsin.'] },
      { baslik: '2. Ne yapmalı?', satirlar: ['Çözümü 2-3 adımda yaz ve kontrol et.'] },
      { baslik: '3. Mini ipucu', satirlar: [`Doğru şık ${girdi.dogru}.`] },
    ],
    cizimAdimlari: [],
    model: 'yedek-sablon',
    yedekMi: true,
  };
}

export async function hataAciklaUret(girdi: {
  ders: string;
  konu: string;
  kazanim: string;
  sinavBaslik: string;
  sinavTur: string;
  soru: { metinHtml?: string | null; aiMeta?: unknown; zorluk?: string | null };
  secenekler: Record<string, string>;
  dogru: string;
  secilen: string | null;
}): Promise<HataAciklaSonuc> {
  const soruMetin = String(girdi.soru?.metinHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const cozumOzeti = soruCozumMetni(girdi.soru).replace(/<[^>]+>/g, ' ').slice(0, 1800);
  const prompt = promptOlustur({
    ders: girdi.ders,
    konu: girdi.konu,
    kazanim: girdi.kazanim,
    sinavBaslik: girdi.sinavBaslik,
    sinavTur: girdi.sinavTur,
    soruMetin: soruMetin.slice(0, 2500),
    secenekler: girdi.secenekler,
    dogru: girdi.dogru,
    secilen: girdi.secilen,
    cozumOzeti,
  });

  const modeller = hataAciklaModelleri(girdi.ders, String(girdi.soru?.zorluk || 'ORTA'));
  const sistem = {
    role: 'system',
    content:
      'Sen Türkçe konuşan bir öğretmensin. Yalnızca geçerli JSON döndür. Markdown, açıklama veya kod bloğu yazma.',
  };

  for (const model of modeller) {
    try {
      const icerik = await openrouterChat(
        model,
        [sistem, { role: 'user', content: prompt }],
        { temperature: 0.2, max_tokens: 3500, ...jsonModu(model) },
        90000
      );
      const parsed = parseCikti(icerik);
      if (parsed?.neden || parsed?.neYapmali || parsed?.miniIpucu) {
        return {
          ogretmenSozu: parsed.ogretmenSozu || 'Şimdi hologramda adım adım çözelim.',
          neden: parsed.neden || '',
          neYapmali: parsed.neYapmali || '',
          miniIpucu: parsed.miniIpucu || '',
          tahtaAdimlari: parsed.tahtaAdimlari || [],
          cizimAdimlari: parsed.cizimAdimlari || [],
          videoAdimlari: parsed.videoAdimlari,
          model,
        };
      }
      logger.warn(`[hata-acikla] ${model} geçersiz/boş JSON döndü`);
    } catch (err) {
      logger.warn(`[hata-acikla] ${model} başarısız: ${err instanceof Error ? err.message : err}`);
    }
  }

  logger.warn('[hata-acikla] Tüm modeller başarısız; konu bazlı yedek kullanılıyor');
  return konuBazliYedek({
    ders: girdi.ders,
    konu: girdi.konu,
    soruMetin,
    dogru: girdi.dogru,
    secilen: girdi.secilen,
  });
}
