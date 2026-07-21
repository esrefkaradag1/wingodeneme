/**
 * KPSS GY + GK konu ağacı — ÖSYM Tablo-1 + KitapSec 2026 konu listeleri.
 * Kaynaklar:
 * - https://www.kitapsec.com/blog/2023-kpss-lisans-konulari-ve-soru-dagilimi-147.html
 * - https://www.kitapsec.com/blog/2026-kpss-onlisans-konulari-ve-soru-dagilimi-154.html
 * - https://www.kitapsec.com/blog/2026-kpss-ortaogretim-konulari-ve-soru-dagilimi-229.html
 *
 * Not: Alt başlıklar (yüzlerce madde) değil; sınavda soru atamaya uygun ana konular.
 * Üç kademe aynı ağacı paylaşır (öğretmen branş sırasına göre seçer).
 */
import { OgretimTuru } from '@prisma/client';
import { KonuAgaciKayit } from './konuAgaci';
import { konuIdStable } from './konuId';

type KpssUnite = 'Genel Yetenek' | 'Genel Kültür';

function kpssKayit(
  tur: OgretimTuru,
  ders: string,
  ad: string,
  uniteAdi: KpssUnite,
): KonuAgaciKayit {
  return {
    id: konuIdStable([tur, ders, uniteAdi, ad]),
    ad,
    ders,
    ogretimTuru: tur,
    uniteAdi,
    yksSegment: null,
  };
}

function kpssTurAgaci(tur: OgretimTuru): KonuAgaciKayit[] {
  const gy = (ders: string, konular: string[]) =>
    konular.map((ad) => kpssKayit(tur, ders, ad, 'Genel Yetenek'));
  const gk = (ders: string, konular: string[]) =>
    konular.map((ad) => kpssKayit(tur, ders, ad, 'Genel Kültür'));

  return [
    ...gy('Türkçe', [
      // Anlam
      'Sözcükte Anlam',
      'Cümlede Anlam',
      'Paragrafta Anlam',
      'Paragraf Yapısı',
      'Anlatım Biçimleri',
      'Düşünceyi Geliştirme Yolları',
      // Dil bilgisi
      'Ses Bilgisi',
      'Yapı Bilgisi',
      'Ekler',
      'Sözcük Türleri',
      'Fiiller ve Fiilimsiler',
      'Cümle Bilgisi',
      'Cümlenin Ögeleri',
      'Yazım Kuralları',
      'Noktalama İşaretleri',
      'Anlatım Bozuklukları',
      // Sözel mantık (lisans ~4 soru)
      'Sözel Mantık',
      'Sözel Akıl Yürütme',
    ]),
    ...gy('Matematik', [
      'Temel Kavramlar',
      'Sayılar',
      'Bölme ve Bölünebilme Kuralları',
      'Asal Çarpanlara Ayırma',
      'EBOB-EKOK',
      'Birinci Dereceden Denklemler',
      'Rasyonel Sayılar',
      'Ondalık Sayılar',
      'Eşitsizlikler',
      'Mutlak Değer',
      'Üslü Sayılar',
      'Çarpanlara Ayırma',
      'Köklü Sayılar',
      'Oran Orantı',
      'Problemler',
      'Kümeler',
      'İşlem ve Modüler Aritmetik',
      'Fonksiyon',
      'Bağıntı',
      'Permütasyon, Kombinasyon ve Olasılık',
      'Tablo ve Grafikler',
      'Matematiksel İlişkilerden Yararlanma',
      'Sayısal Mantık',
    ]),
    ...gy('Geometri', [
      'Geometrik Kavramlar ve Doğruda Açılar',
      'Üçgenler',
      'Üçgende Açılar',
      'Dörtgenler ve Çokgenler',
      'Çember ve Daire',
      'Analitik Geometri',
      'Katı Cisimler',
    ]),
    ...gk('Tarih', [
      'İslamiyet Öncesi Türk Tarihi',
      'Türk-İslam Tarihi',
      'İlk Türk-İslam Devletleri ve Beylikleri',
      'Anadolu Selçuklu Devleti',
      'Osmanlı Tarihi',
      'Osmanlı Kuruluş ve Yükselme Dönemleri',
      'Osmanlı Kültür ve Uygarlık',
      'XVII. Yüzyıl Osmanlı (Duraklama)',
      'XVIII. Yüzyıl Osmanlı (Gerileme)',
      'XIX. Yüzyıl Osmanlı (Dağılma)',
      "Avrupa'da Yaşanan Gelişmeler ve Türk-İslam Dünyasına Etkileri",
      'XX. Yüzyılda Osmanlı Devleti',
      'Trablusgarp ve Balkan Savaşları',
      'I. Dünya Savaşı',
      'Kurtuluş Savaşı Hazırlık Dönemi',
      'I. TBMM Dönemi',
      'Kurtuluş Savaşı Muharebeler ve Antlaşmalar Dönemi',
      'Cumhuriyet Dönemi',
      'Atatürk İnkılapları',
      'Atatürk İlkeleri',
      "Atatürk'ün Hayatı ve Kişiliği",
      'Partiler ve İç Politika',
      'Atatürk Dönemi Türk Dış Politikası',
      'Atatürk Sonrası Dönem',
      'Çağdaş Türk ve Dünya Tarihi',
    ]),
    ...gk('Coğrafya', [
      "Türkiye'nin Coğrafi Konumu",
      "Türkiye'nin Jeopolitiği",
      "Türkiye'nin Yer Şekilleri ve Özellikleri",
      "Türkiye'nin Su Varlığı",
      "Türkiye'de Doğal Afetler",
      "Türkiye'nin İklimi ve Bitki Örtüsü",
      "Türkiye'de Nüfus ve Yerleşme",
      "Türkiye'de Göçler",
      "Türkiye'de Tarım, Hayvancılık ve Ormancılık",
      "Türkiye'de Madenler, Enerji Kaynakları ve Sanayi",
      "Türkiye'de Ulaşım, Turizm ve Ticaret",
      "Türkiye'nin Ekonomik Coğrafyası",
      "Türkiye'nin Bölgesel Coğrafyası",
    ]),
    ...gk('Vatandaşlık', [
      'Hukukun Temel Kavramları',
      'Devlet Kavramı ve Hükümet Sistemleri',
      'Anayasa Hukuku ve Temel Esaslar',
      'Türk Anayasa Tarihi',
      'Anayasal Gelişmeler',
      'Temel Hak ve Ödevler',
      'Yasama (TBMM)',
      'Yürütme',
      'Yargı',
      'İdare Hukuku',
      'Uluslararası Kuruluşlar ve Anlaşmalar',
    ]),
    ...gk('Güncel Bilgiler', [
      "Türkiye'deki Güncel Gelişmeler",
      'Dünyadaki Güncel Gelişmeler',
      'Bilim ve Teknoloji Gündemi',
      'Ekonomi ve Kültür Gündemi',
    ]),
  ];
}

export const KPSS_KONU_AGACI: KonuAgaciKayit[] = [
  ...kpssTurAgaci(OgretimTuru.KPSS_LISANS),
  ...kpssTurAgaci(OgretimTuru.KPSS_ONLISANS),
  ...kpssTurAgaci(OgretimTuru.KPSS_ORTAOGRETIM),
];
