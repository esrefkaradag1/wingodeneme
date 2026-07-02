/**
 * KPSS GY + GK konu ağacı — ÖSYM Tablo-1 dağılımına uygun (Ortaöğretim / Önlisans ortak havuz).
 * Kaynak: ÖSYM KPSS konu dağılım tabloları; 2026 müfredat çerçevesi.
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
      'Sözcükte Anlam',
      'Cümlede Anlam',
      'Paragrafta Anlam',
      'Ses Bilgisi',
      'Yapı Bilgisi',
      'Sözcük Türleri',
      'Cümle Bilgisi',
      'Yazım Kuralları',
      'Noktalama İşaretleri',
      'Anlatım Bozuklukları',
      'Sözel Mantık',
    ]),
    ...gy('Matematik', [
      'Temel Kavramlar',
      'Sayılar',
      'Bölme ve Bölünebilme Kuralları',
      'Asal Çarpanlara Ayırma',
      'EBOB-EKOK',
      'Birinci Dereceden Denklemler',
      'Rasyonel Sayılar',
      'Eşitsizlikler',
      'Mutlak Değer',
      'Üslü Sayılar',
      'Çarpanlara Ayırma',
      'Köklü Sayılar',
      'Oran Orantı',
      'Problemler',
      'Kümeler',
      'Fonksiyon',
      'Permütasyon, Kombinasyon ve Olasılık',
      'Tablo ve Grafikler',
      'Sayısal Mantık',
    ]),
    ...gy('Geometri', [
      'Üçgenler',
      'Dörtgenler ve Çokgenler',
      'Çember ve Daire',
      'Analitik Geometri',
      'Katı Cisimler',
    ]),
    ...gk('Tarih', [
      'İslamiyet Öncesi Türk Tarihi',
      'Türk-İslam Tarihi',
      'Osmanlı Tarihi',
      'Osmanlı Yenileşme ve Demokratikleşme Hareketleri',
      "Avrupa'da Yaşanan Gelişmeler ve Türk-İslam Dünyasına Etkileri",
      'XX. Yüzyılda Osmanlı Devleti',
      'Kurtuluş Savaşı Hazırlık Dönemi',
      'Kurtuluş Savaşı Muharebeler ve Antlaşmalar Dönemi',
      'Cumhuriyet Dönemi',
      'Atatürk Dönemi Türk Dış Politikası',
      'Çağdaş Türk ve Dünya Tarihi',
    ]),
    ...gk('Coğrafya', [
      "Türkiye'nin Coğrafi Konumu",
      "Türkiye'nin Yer Şekilleri ve Özellikleri",
      "Türkiye'nin İklimi ve Bitki Örtüsü",
      "Türkiye'de Nüfus ve Yerleşme",
      "Türkiye'de Tarım, Hayvancılık ve Ormancılık",
      "Türkiye'de Madenler, Enerji Kaynakları ve Sanayi",
      "Türkiye'de Ulaşım, Turizm ve Ticaret",
      "Türkiye'nin Bölgesel Coğrafyası",
    ]),
    ...gk('Vatandaşlık', [
      'Hukukun Temel Kavramları',
      'Anayasa Hukuku ve Temel Esaslar',
      'Türk Anayasa Tarihi',
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
