/**
 * LGS / YKS TYT / YKS AYT konu ağacı — soru üretimi ve sınav planlaması için tek kaynak.
 */
import { OgretimTuru, YksKonuSegmenti } from '@prisma/client';
import { konuIdStable } from './konuId';

export { konuIdStable };

export interface KonuAgaciKayit {
  id: string;
  ad: string;
  ders: string;
  ogretimTuru: OgretimTuru;
  uniteAdi: string | null;
  yksSegment: YksKonuSegmenti | null;
}

function lgs(ders: string, ad: string): KonuAgaciKayit {
  const id = konuIdStable(['LGS', ders, ad]);
  return {
    id,
    ad,
    ders,
    ogretimTuru: OgretimTuru.LGS,
    uniteAdi: null,
    yksSegment: null,
  };
}

function ortaokulSinif(tur: 'SINIF_6' | 'SINIF_7', ders: string, ad: string): KonuAgaciKayit {
  const id = konuIdStable([tur, ders, ad]);
  return {
    id,
    ad,
    ders,
    ogretimTuru: tur,
    uniteAdi: null,
    yksSegment: null,
  };
}

function liseSinif(
  tur: 'SINIF_9' | 'SINIF_10' | 'SINIF_11',
  ders: string,
  ad: string,
): KonuAgaciKayit {
  const id = konuIdStable([tur, ders, ad]);
  return {
    id,
    ad,
    ders,
    ogretimTuru: tur,
    uniteAdi: null,
    yksSegment: null,
  };
}

function yks(
  ders: string,
  ad: string,
  uniteAdi: string | null,
  seg: YksKonuSegmenti
): KonuAgaciKayit {
  const id = konuIdStable(['YKS', seg, ders, uniteAdi || '', ad]);
  return {
    id,
    ad,
    ders,
    ogretimTuru: OgretimTuru.YKS,
    uniteAdi,
    yksSegment: seg,
  };
}

const LGS_MAT = [
  'Çarpanlar ve Katlar',
  'Üslü İfadeler',
  'Kareköklü İfadeler',
  'Veri Analizi',
  'Basit Olayların Olma Olasılığı',
  'Cebirsel İfadeler ve Özdeşlikler',
  'Doğrusal Denklemler',
  'Eşitsizlikler',
  'Üçgenler',
  'Eşlik ve Benzerlik',
  'Dönüşüm Geometrisi',
  'Geometrik Cisimler',
];

const LGS_FEN = [
  'Mevsimler ve İklim',
  'DNA ve Genetik Kod',
  'Basınç',
  'Madde ve Endüstri',
  'Basit Makineler',
  'Enerji Dönüşümleri ve Çevre Bilimi',
  'Elektrik Yükleri ve Elektrik Enerjisi',
];

const LGS_TR = [
  'Sözcükte Anlam',
  'Cümlede Anlam',
  'Parçada Anlam (Ana fikir, Yardımcı fikir, Yapı)',
  'Fiilimsiler',
  'Cümlenin Ögeleri',
  'Yazım Kuralları',
  'Noktalama İşaretleri',
  'Metin Türleri',
  'Söz Sanatları',
  'Cümlede Anlam İlişkileri (Neden-Sonuç vb.)',
  'Sözel Mantık ve Görsel Okuma',
];

const LGS_INKILAP = [
  'Bir Kahraman Doğuyor',
  'Milli Uyanış',
  'Ya İstiklal Ya Ölüm',
  'Atatürkçülük ve Çağdaşlaşan Türkiye',
  'Demokratikleşme Çabaları',
  'Atatürk Dönemi Dış Politika',
  "Atatürk'ün Ölümü ve Sonrası",
];

const LGS_DIN = [
  'Kader İnancı',
  'Zekat ve Sadaka',
  'Din ve Hayat',
  "Hz. Muhammed'in Örnekliği",
  "Kur'an-ı Kerim ve Özellikleri",
];

const LGS_EN = [
  'Friendship',
  'Teen Life',
  'In the Kitchen',
  'On the Phone',
  'The Internet',
  'Adventures',
  'Tourism',
  'Chores',
  'Science',
  'Natural Forces',
];

const SINIF6_MAT = [
  'Doğal Sayılarla İşlemler',
  'Çarpanlar ve Katlar',
  'Kümeler',
  'Tam Sayılar',
  'Kesirlerle İşlemler',
  'Ondalık Gösterim',
  'Oran',
  'Cebirsel İfadeler',
  'Veri Toplama ve Değerlendirme',
  'Açılar',
  'Alan Ölçme',
  'Çember',
];

const SINIF6_FEN = [
  'Güneş Sistemi ve Tutulmalar',
  'Vücudumuzdaki Sistemler',
  'Kuvvet ve Hareket',
  'Madde ve Isı',
  'Ses ve Özellikleri',
  'Vücudumuzdaki Sistemler ve Sağlığı',
  'Elektriğin İletimi',
];

const SINIF6_TR = [
  'Sözcükte Anlam',
  'Cümlede Anlam',
  'Paragrafta Anlam',
  'İsimler ve İsim Tamlamaları',
  'Sıfatlar',
  'Zamirler',
  'Fiiller',
  'Yazım Kuralları',
  'Noktalama İşaretleri',
  'Metin Türleri',
  'Sözel Mantık ve Görsel Okuma',
];

const SINIF6_SOSYAL = [
  'Birey ve Toplum',
  'Kültür ve Miras',
  'İnsanlar, Yerler ve Çevreler',
  'Bilim, Teknoloji ve Toplum',
  'Üretim, Dağıtım ve Tüketim',
  'Etkin Vatandaşlık',
  'Küresel Bağlantılar',
];

const SINIF6_DIN = [
  'Peygamber ve İlahi Kitap İnancı',
  'Namaz',
  'Zararlı Alışkanlıklar',
  "Hz. Muhammed'in Hayatı",
  'Temel Değerlerimiz',
];

const SINIF6_EN = [
  'Life',
  'Yummy Breakfast',
  'Downtown',
  'Weather and Emotions',
  'At the Fair',
  'Occupations',
  'Holidays',
  'Bookworms',
];

const SINIF7_MAT = [
  'Tam Sayılarla İşlemler',
  'Rasyonel Sayılar',
  'Cebirsel İfadeler',
  'Oran ve Orantı',
  'Yüzdeler',
  'Doğrular ve Açılar',
  'Çokgenler',
  'Çember ve Daire',
  'Veri Analizi',
  'Olasılık',
  'Cisimlerin Farklı Yönlerden Görünümleri',
];

const SINIF7_FEN = [
  'Güneş Sistemi ve Ötesi',
  'Hücre ve Bölünmeler',
  'Kuvvet ve Enerji',
  'Saf Madde ve Karışımlar',
  'Işığın Madde ile Etkileşimi',
  'Canlılarda Üreme, Büyüme ve Gelişme',
  'Elektrik Devreleri',
];

const SINIF7_TR = [
  'Fiilde Yapı',
  'Ek Fiil',
  'Cümlede Fiil',
  'Paragrafta Anlam ve Yorum',
  'Anlatım Biçimleri',
  'Metin Türleri',
  'Yazım Kuralları',
  'Noktalama İşaretleri',
  'Cümle Türleri',
  'Sözel Mantık',
];

const SINIF7_SOSYAL = [
  'İletişim ve İnsan İlişkileri',
  'Türk Tarihinde Yolculuk',
  'Ülkemizde Nüfus',
  'Zaman İçinde Bilim',
  'Ekonomi ve Sosyal Hayat',
  'Yaşayan Demokrasi',
  'Ülkeler Arası Köprüler',
];

const SINIF7_DIN = [
  'Melek ve Ahiret İnancı',
  'Hac ve Kurban',
  'Ahlaki Davranışlar',
  "Allah'ın Kulu ve Elçisi: Hz. Muhammed",
  'İslam Düşüncesinde Yorumlar',
];

const SINIF7_EN = [
  'Appearance and Personality',
  'Sports',
  'Biographies',
  'Wild Animals',
  'Television',
  'Celebrations',
  'Dreams',
  'Public Buildings',
  'Environment',
];

const SINIF9_MAT = [
  'Mantık',
  'Kümeler',
  'Denklem ve Eşitsizlikler',
  'Üçgenler',
  'Veri',
  'Sayı Kümeleri',
  'Mutlak Değer',
  'Üslü İfadeler ve Denklemler',
  'Fonksiyonlar',
  'Doğrusal Fonksiyonlar',
];

const SINIF9_FIZIK = [
  'Fizik Bilimine Giriş',
  'Madde ve Özellikleri',
  'Hareket ve Kuvvet',
  'Enerji',
  'Isı ve Sıcaklık',
  'Elektrostatik',
];

const SINIF9_KIMYA = [
  'Kimya Bilimi',
  'Atom ve Periyodik Sistem',
  'Kimyasal Türler Arası Etkileşimler',
  'Maddenin Halleri',
  'Doğa ve Kimya',
];

const SINIF9_BIYOLOJI = [
  'Yaşam Bilimi Biyoloji',
  'Canlıların Ortak Özellikleri',
  'Canlıların Yapısında Bulunan Temel Bileşikler',
  'Hücre',
  'Canlılar Dünyası',
];

const SINIF9_TRDEB = [
  'İletişim ve Dil',
  'Dillerin Sınıflandırılması',
  'Türkçenin Tarihi Gelişimi',
  'Metinlerin Sınıflandırılması',
  'Şiir Bilgisi',
  'Hikâye',
  'Masal ve Fabl',
  'Roman',
];

const SINIF9_TARIH = [
  'Tarih Bilimi',
  'İnsanlığın İlk Dönemleri',
  'Orta Çağ Dünyası',
  'İlk ve Orta Çağlarda Türk Dünyası',
  'İslam Medeniyetinin Doğuşu',
];

const SINIF9_COGRAFYA = [
  'Doğa ve İnsan',
  'Dünyanın Şekli ve Hareketleri',
  'Harita Bilgisi',
  'Atmosfer ve İklim',
  'Yer Şekillerinin Oluşum Süreçleri',
  'Su Kaynakları',
];

const SINIF9_DIN = [
  'Bilgi ve İnanç',
  'İslam ve İbadet',
  'Gençlik ve Değerler',
  'Allah İnsan İlişkisi',
  'Hz. Muhammed ve Gençlik',
];

const SINIF9_EN = [
  'Studying Abroad',
  'My Environment',
  'Movies',
  'Human in Nature',
  'Inspirational People',
  'Bridging Cultures',
];

// ————— 10. SINIF (MEB müfredatı üniteleri) —————
const SINIF10_MAT = [
  'Sayma ve Olasılık — Sıralama ve Seçme',
  'Sayma ve Olasılık — Basit Olayların Olasılıkları',
  'Fonksiyonlar — Fonksiyon Kavramı ve Gösterimi',
  'Fonksiyonlar — İki Fonksiyonun Bileşkesi ve Ters Fonksiyon',
  'Fonksiyonlarla İşlemler ve Uygulamaları',
  'Polinomlar — Polinom Kavramı ve İşlemler',
  'Polinomlarda Çarpanlara Ayırma',
  'İkinci Dereceden Denklemler',
  'Dörtgenler ve Çokgenler — Çokgenler',
  'Dörtgenler ve Çokgenler — Dörtgenler ve Özellikleri',
  'Dörtgenler ve Çokgenler — Paralelkenar, Eşkenar Dörtgen, Deltoid',
  'Dörtgenler ve Çokgenler — Dikdörtgen, Kare, Yamuk',
  'Uzay Geometri — Katı Cisimler (Prizma, Piramit, Küre)',
];

const SINIF10_FIZIK = [
  'Elektrik ve Manyetizma — Elektrik Akımı, Potansiyel Fark ve Direnç',
  'Elektrik ve Manyetizma — Elektrik Devreleri',
  'Elektrik ve Manyetizma — Mıknatıs ve Manyetik Alan',
  'Basınç ve Kaldırma Kuvveti — Basınç',
  'Basınç ve Kaldırma Kuvveti — Kaldırma Kuvveti',
  'Dalgalar — Dalgalar Hakkında Temel Kavramlar',
  'Dalgalar — Yay ve Su Dalgaları',
  'Dalgalar — Ses ve Deprem Dalgaları',
  'Optik — Aydınlanma ve Gölge',
  'Optik — Düzlem Ayna ve Küresel Aynalar',
  'Optik — Işığın Kırılması ve Mercekler',
];

const SINIF10_KIMYA = [
  'Kimyanın Temel Kanunları',
  'Mol Kavramı ve Kimyasal Hesaplamalar',
  'Kimyasal Tepkimeler ve Denklemler',
  'Karışımlar — Homojen ve Heterojen Karışımlar',
  'Karışımların Ayrılması',
  'Asitler, Bazlar ve Tuzlar',
  'Kimya Her Yerde — Temizlik Maddeleri ve Polimerler',
];

const SINIF10_BIYOLOJI = [
  'Hücre Bölünmeleri — Mitoz ve Eşeysiz Üreme',
  'Hücre Bölünmeleri — Mayoz ve Eşeyli Üreme',
  'Kalıtımın Genel İlkeleri — Kalıtım ve Biyolojik Çeşitlilik',
  'Kalıtımın Genel İlkeleri — Genetik Uygulamalar ve Biyoteknoloji',
  'Ekosistem Ekolojisi — Madde ve Enerji Akışı',
  'Ekosistem Ekolojisi — Güncel Çevre Sorunları',
];

const SINIF10_TRDEB = [
  'Hikâye (Olay Çevresinde Gelişen Metinler)',
  'Şiir — Nazım Biçimleri ve Ölçü',
  'Destan / Efsane',
  'Roman',
  'Tiyatro',
  'Biyografi ve Otobiyografi',
  'Mektup ve E-Posta',
  'Günlük ve Blog',
  'Dil Bilgisi — Sözcük Türleri ve Yapısı',
];

const SINIF10_TARIH = [
  'Selçuklu Türkiyesi — Yerleşme ve Devletleşme',
  'Beylikten Devlete Osmanlı Siyaseti (1302-1453)',
  'Devletleşme Sürecinde Savaşçılar ve Askerler',
  'Beylikten Devlete Osmanlı Medeniyeti',
  'Dünya Gücü Osmanlı Devleti (1453-1595)',
  'Sultan ve Osmanlı Merkez Teşkilatı',
  'Klasik Çağda Osmanlı Toplum Düzeni',
];

const SINIF10_COGRAFYA = [
  'Doğal Sistemler — Yer Şekilleri ve Oluşum Süreçleri',
  'Doğal Sistemler — Kayaçlar ve Yer Kabuğu',
  'Doğal Sistemler — Su Kaynakları',
  'Doğal Sistemler — Toprak ve Bitki Örtüsü',
  'Beşeri Sistemler — Nüfus Politikaları ve Özellikleri',
  'Beşeri Sistemler — Göçlerin Nedenleri ve Sonuçları',
  'Küresel Ortam — Bölgeler ve Ülkeler',
  'Çevre ve Toplum — Doğal Afetler',
];

const SINIF10_FELSEFE = [
  'Felsefeyi Tanıma',
  'Felsefe ile Düşünme',
  'Felsefenin Temel Konuları — Varlık ve Bilgi',
  'Felsefenin Temel Konuları — Ahlak ve Siyaset',
  'Felsefenin Temel Konuları — Sanat, Din ve Bilim',
];

const SINIF10_DIN = [
  'Allah-İnsan İlişkisi',
  'Hz. Muhammed ve Gençlik',
  'Din ve Hayat',
  'Ahlaki Tutum ve Davranışlar',
  'İslam Düşüncesinde İtikadi ve Amelî Yorumlar',
];

const SINIF10_EN = [
  'School Life',
  'Plans',
  'Legendary Figures',
  'Traditions',
  'Travel',
  'Helpful Tips',
  'Food and Festivals',
  'Digital Era',
  'Modern Heroes',
  'Shopping',
];

// ————— 11. SINIF (MEB müfredatı üniteleri) —————
const SINIF11_MAT = [
  'Trigonometri — Yönlü Açılar ve Birim Çember',
  'Trigonometri — Trigonometrik Fonksiyonlar',
  'Trigonometri — Toplam-Fark ve İki Kat Açı Formülleri',
  'Trigonometri — Trigonometrik Denklemler',
  'Analitik Geometri — Doğrunun Analitik İncelenmesi',
  'Fonksiyonlarda Uygulamalar — Fonksiyonlarla İlgili Uygulamalar',
  'Fonksiyonlarda Uygulamalar — İkinci Dereceden Fonksiyonlar ve Grafikleri',
  'Denklem ve Eşitsizlik Sistemleri',
  'Çember ve Daire — Çemberin Temel Elemanları',
  'Çember ve Daire — Çemberde Açılar ve Uzunluk',
  'Çember ve Daire — Dairenin Alanı',
  'Uzay Geometri — Katı Cisimlerin Yüzey Alanı ve Hacmi',
  'Olasılık — Koşullu Olasılık ve Bağımsız Olaylar',
];

const SINIF11_FIZIK = [
  'Kuvvet ve Hareket — Vektörler',
  'Kuvvet ve Hareket — Bağıl Hareket',
  'Kuvvet ve Hareket — Newton\'ın Hareket Yasaları',
  'Kuvvet ve Hareket — Bir Boyutta Sabit İvmeli Hareket',
  'Kuvvet ve Hareket — İki Boyutta Hareket (Atışlar)',
  'Kuvvet ve Hareket — Enerji ve Hareket',
  'Kuvvet ve Hareket — İtme ve Çizgisel Momentum',
  'Kuvvet ve Hareket — Tork, Denge ve Basit Makineler',
  'Elektrik ve Manyetizma — Elektriksel Kuvvet ve Elektrik Alan',
  'Elektrik ve Manyetizma — Elektriksel Potansiyel',
  'Elektrik ve Manyetizma — Düzgün Elektrik Alan ve Sığa',
  'Elektrik ve Manyetizma — Manyetik Alan ve Manyetik Kuvvet',
  'Elektrik ve Manyetizma — İndüksiyon ve Alternatif Akım',
];

const SINIF11_KIMYA = [
  'Modern Atom Teorisi — Atomun Kuantum Modeli',
  'Modern Atom Teorisi — Periyodik Sistem ve Özellikler',
  'Modern Atom Teorisi — Kimyasal Türler Arası Etkileşimler',
  'Gazlar — Gaz Yasaları ve İdeal Gaz Denklemi',
  'Gazlar — Gaz Karışımları ve Kısmi Basınç',
  'Sıvı Çözeltiler ve Çözünürlük',
  'Kimyasal Tepkimelerde Enerji',
  'Kimyasal Tepkimelerde Hız',
  'Kimyasal Tepkimelerde Denge',
  'Sulu Çözelti Dengeleri — Asit-Baz ve Çözünürlük Dengesi',
];

const SINIF11_BIYOLOJI = [
  'İnsan Fizyolojisi — Denetleyici ve Düzenleyici Sistemler',
  'İnsan Fizyolojisi — Duyu Organları',
  'İnsan Fizyolojisi — Destek ve Hareket Sistemi',
  'İnsan Fizyolojisi — Sindirim Sistemi',
  'İnsan Fizyolojisi — Dolaşım ve Bağışıklık Sistemi',
  'İnsan Fizyolojisi — Solunum Sistemi',
  'İnsan Fizyolojisi — Üriner Sistem (Boşaltım)',
  'İnsan Fizyolojisi — Üreme Sistemi ve Embriyonik Gelişim',
  'Komünite ve Popülasyon Ekolojisi',
];

const SINIF11_TRDEB = [
  'Hikâye — Cumhuriyet Dönemi Türk Hikâyeciliği',
  'Şiir — Divan Şiiri ve Halk Şiiri',
  'Makale',
  'Sohbet ve Fıkra',
  'Roman — Tanzimat ve Servetifünun Romanı',
  'Tiyatro — Modern Türk Tiyatrosu',
  'Eleştiri',
  'Mülakat ve Röportaj',
  'Dil Bilgisi — Cümle Türleri ve Ögeleri',
];

const SINIF11_TARIH = [
  'Değişen Dünya Dengeleri Karşısında Osmanlı Siyaseti (1595-1774)',
  'Değişim Çağında Avrupa ve Osmanlı',
  'Uluslararası İlişkilerde Denge Stratejisi (1774-1914)',
  'Devrimler Çağında Değişen Devlet-Toplum İlişkileri',
  'Sermaye ve Emek',
  'XIX. ve XX. Yüzyılda Değişen Gündelik Hayat',
];

const SINIF11_COGRAFYA = [
  'Doğal Sistemler — Biyoçeşitlilik ve Ekosistem',
  'Doğal Sistemler — Madde Döngüleri ve Enerji Akışı',
  'Beşeri Sistemler — Şehirler ve Etki Alanları',
  'Beşeri Sistemler — Ekonomik Faaliyetler',
  'Beşeri Sistemler — Türkiye Ekonomisi (Tarım, Sanayi, Hizmet)',
  'Küresel Ortam — Bölge Türleri ve Ülkeler Arası Etkileşim',
  'Çevre ve Toplum — Doğal Kaynaklar ve Çevre Sorunları',
];

const SINIF11_FELSEFE = [
  'MÖ 6. Yüzyıl - MS 2. Yüzyıl Felsefesi',
  'MS 2. Yüzyıl - MS 15. Yüzyıl Felsefesi',
  '15. Yüzyıl - 17. Yüzyıl Felsefesi',
  '18. Yüzyıl - 19. Yüzyıl Felsefesi',
  '20. Yüzyıl Felsefesi',
];

const SINIF11_DIN = [
  'Dünya ve Ahiret',
  'Kur\'an\'a Göre Hz. Muhammed',
  'Kur\'an\'da Bazı Kavramlar',
  'İnançla İlgili Meseleler',
  'Yahudilik ve Hristiyanlık',
];

const SINIF11_EN = [
  'Future Jobs',
  'Hobbies and Skills',
  'Hard Times',
  'What a Life',
  'Back to the Past',
  'Open Your Heart',
  'Facts About Turkey',
  'Sports',
  'My Friends',
  'Values and Norms',
];


function tytMatGrup(unite: string, ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks('Matematik', ad, unite, YksKonuSegmenti.TYT));
}

function tytGeo(ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks('Geometri', ad, 'Geometri', YksKonuSegmenti.TYT));
}

function tytFenBrans(brans: string, unite: string, ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks(brans, ad, unite, YksKonuSegmenti.TYT));
}

function aytMat(unite: string | null, ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks('Matematik', ad, unite, YksKonuSegmenti.AYT_MATEMATIK));
}

function aytFen(brans: string, unite: string | null, ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks(brans, ad, unite, YksKonuSegmenti.AYT_FEN_BILIMLERI));
}

function aytEdeb(ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks('Edebiyat', ad, 'Edebiyat', YksKonuSegmenti.AYT_EDEBIYAT));
}

function aytTarih2(ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks('Tarih', ad, 'Tarih-2', YksKonuSegmenti.AYT_TARIH2));
}

function aytCog2(ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks('Coğrafya', ad, 'Coğrafya-2', YksKonuSegmenti.AYT_COG2));
}

function aytTar1(ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks('Tarih', ad, 'Tarih-1', YksKonuSegmenti.AYT_TARIH1));
}

function aytCog1(ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks('Coğrafya', ad, 'Coğrafya-1', YksKonuSegmenti.AYT_COG1));
}

/** Felsefe, Psikoloji, Sosyoloji, Mantık — tek ünite başlığı (ÖSYM SB-2) */
function aytFelGrubu(ders: string, ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) => yks(ders, ad, 'AYT Felsefe Grubu', YksKonuSegmenti.AYT_FELSEFE_GRUBU));
}

function aytDinAyri(ads: string[]): KonuAgaciKayit[] {
  return ads.map((ad) =>
    yks('Din Kültürü ve Ahlak Bilgisi', ad, 'AYT Din Kültürü', YksKonuSegmenti.AYT_DIN)
  );
}

export const KONU_AGACI: KonuAgaciKayit[] = [
  ...LGS_MAT.map((ad) => lgs('Matematik', ad)),
  ...LGS_FEN.map((ad) => lgs('Fen Bilimleri', ad)),
  ...LGS_TR.map((ad) => lgs('Türkçe', ad)),
  ...LGS_INKILAP.map((ad) => lgs('T.C. İnkılap Tarihi ve Atatürkçülük', ad)),
  ...LGS_DIN.map((ad) => lgs('Din Kültürü ve Ahlak Bilgisi', ad)),
  ...LGS_EN.map((ad) => lgs('İngilizce', ad)),

  ...SINIF6_MAT.map((ad) => ortaokulSinif(OgretimTuru.SINIF_6, 'Matematik', ad)),
  ...SINIF6_FEN.map((ad) => ortaokulSinif(OgretimTuru.SINIF_6, 'Fen Bilimleri', ad)),
  ...SINIF6_TR.map((ad) => ortaokulSinif(OgretimTuru.SINIF_6, 'Türkçe', ad)),
  ...SINIF6_SOSYAL.map((ad) => ortaokulSinif(OgretimTuru.SINIF_6, 'Sosyal Bilgiler', ad)),
  ...SINIF6_DIN.map((ad) => ortaokulSinif(OgretimTuru.SINIF_6, 'Din Kültürü ve Ahlak Bilgisi', ad)),
  ...SINIF6_EN.map((ad) => ortaokulSinif(OgretimTuru.SINIF_6, 'İngilizce', ad)),

  ...SINIF7_MAT.map((ad) => ortaokulSinif(OgretimTuru.SINIF_7, 'Matematik', ad)),
  ...SINIF7_FEN.map((ad) => ortaokulSinif(OgretimTuru.SINIF_7, 'Fen Bilimleri', ad)),
  ...SINIF7_TR.map((ad) => ortaokulSinif(OgretimTuru.SINIF_7, 'Türkçe', ad)),
  ...SINIF7_SOSYAL.map((ad) => ortaokulSinif(OgretimTuru.SINIF_7, 'Sosyal Bilgiler', ad)),
  ...SINIF7_DIN.map((ad) => ortaokulSinif(OgretimTuru.SINIF_7, 'Din Kültürü ve Ahlak Bilgisi', ad)),
  ...SINIF7_EN.map((ad) => ortaokulSinif(OgretimTuru.SINIF_7, 'İngilizce', ad)),

  ...SINIF9_MAT.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'Matematik', ad)),
  ...SINIF9_FIZIK.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'Fizik', ad)),
  ...SINIF9_KIMYA.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'Kimya', ad)),
  ...SINIF9_BIYOLOJI.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'Biyoloji', ad)),
  ...SINIF9_TRDEB.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'Türk Dili ve Edebiyatı', ad)),
  ...SINIF9_TARIH.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'Tarih', ad)),
  ...SINIF9_COGRAFYA.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'Coğrafya', ad)),
  ...SINIF9_DIN.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'Din Kültürü ve Ahlak Bilgisi', ad)),
  ...SINIF9_EN.map((ad) => liseSinif(OgretimTuru.SINIF_9, 'İngilizce', ad)),

  ...SINIF10_MAT.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Matematik', ad)),
  ...SINIF10_FIZIK.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Fizik', ad)),
  ...SINIF10_KIMYA.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Kimya', ad)),
  ...SINIF10_BIYOLOJI.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Biyoloji', ad)),
  ...SINIF10_TRDEB.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Türk Dili ve Edebiyatı', ad)),
  ...SINIF10_TARIH.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Tarih', ad)),
  ...SINIF10_COGRAFYA.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Coğrafya', ad)),
  ...SINIF10_FELSEFE.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Felsefe', ad)),
  ...SINIF10_DIN.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'Din Kültürü ve Ahlak Bilgisi', ad)),
  ...SINIF10_EN.map((ad) => liseSinif(OgretimTuru.SINIF_10, 'İngilizce', ad)),

  ...SINIF11_MAT.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Matematik', ad)),
  ...SINIF11_FIZIK.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Fizik', ad)),
  ...SINIF11_KIMYA.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Kimya', ad)),
  ...SINIF11_BIYOLOJI.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Biyoloji', ad)),
  ...SINIF11_TRDEB.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Türk Dili ve Edebiyatı', ad)),
  ...SINIF11_TARIH.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Tarih', ad)),
  ...SINIF11_COGRAFYA.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Coğrafya', ad)),
  ...SINIF11_FELSEFE.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Felsefe', ad)),
  ...SINIF11_DIN.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'Din Kültürü ve Ahlak Bilgisi', ad)),
  ...SINIF11_EN.map((ad) => liseSinif(OgretimTuru.SINIF_11, 'İngilizce', ad)),

  ...tytMatGrup('Sayılar', [
    'Temel Kavramlar',
    'Sayı Basamakları',
    'Bölme-Bölünebilme',
    'Asal Çarpanlar',
    'EBOB-EKOK',
    'Rasyonel Sayılar',
    'Ondalık Sayılar',
  ]),
  ...tytMatGrup('Cebir', [
    'Basit Eşitsizlikler',
    'Mutlak Değer',
    'Üslü Sayılar',
    'Köklü Sayılar',
    'Çarpanlara Ayırma',
    'Oran-Orantı',
    'Denklem Çözme',
  ]),
  ...tytMatGrup('Problemler (Kritik)', [
    'Sayı Problemleri',
    'Kesir Problemleri',
    'Yaş Problemleri',
    'İşçi Problemleri',
    'Yüzde Problemleri',
    'Kar-Zarar Problemleri',
    'Karışım Problemleri',
    'Hareket Problemleri',
    'Grafik Problemleri',
    'Rutin Olmayan Problemler',
  ]),
  ...tytMatGrup('Veri ve Sayma', [
    'Kümeler',
    'Kartezyen Çarpım',
    'Fonksiyonlar (Temel)',
    'Permütasyon',
    'Kombinasyon',
    'Binom',
    'Olasılık',
    'Veri-İstatistik',
  ]),

  ...tytGeo([
    'Doğruda ve Üçgende Açılar',
    'Özel Üçgenler (Dik, İkizkenar, Eşkenar)',
    'Üçgende Alan ve Benzerlik',
    'Açı-Kenar Bağıntıları',
    'Çokgenler',
    'Dörtgenler (Paralelkenar, Dikdörtgen, Kare, Deltoid, Yamuk)',
    'Çember ve Daire',
    'Katı Cisimler (Prizma, Piramit, Silindir, Koni, Küre)',
  ]),

  ...tytFenBrans('Fizik', 'TYT Fizik', [
    'Fizik Bilimine Giriş',
    'Madde ve Özellikleri',
    'Hareket ve Kuvvet',
    'Enerji',
    'Isı ve Sıcaklık',
    'Basınç ve Kaldırma Kuvveti',
    'Elektrik ve Manyetizma (Temel)',
    'Optik',
    'Dalgalar',
  ]),
  ...tytFenBrans('Kimya', 'TYT Kimya', [
    'Kimya Bilimi',
    'Atom ve Periyodik Sistem',
    'Kimyasal Türler Arası Etkileşimler',
    'Maddenin Halleri',
    'Doğa ve Kimya',
    'Kimyanın Temel Kanunları',
    'Mol Kavramı',
    'Kimyasal Hesaplamalar',
    'Karışımlar',
    'Asitler-Bazlar-Tuzlar',
    'Kimya Her Yerde',
  ]),
  ...tytFenBrans('Biyoloji', 'TYT Biyoloji', [
    'Canlıların Ortak Özellikleri',
    'Canlıların Yapısında Bulunan Temel Bileşikler',
    'Hücre (Yapısı, Organeller)',
    'Canlıların Çeşitliliği ve Sınıflandırılması',
    'Hücre Bölünmeleri (Mitoz-Mayoz)',
    'Kalıtımın Temel İlkeleri',
    'Ekosistem Ekolojisi ve Güncel Çevre Sorunları',
  ]),

  ...[
    'Sözcükte Anlam',
    'Cümlede Anlam',
    'Paragrafta Anlam',
    'Ses Bilgisi',
    'Yazım Kuralları',
    'Noktalama İşaretleri',
    'Sözcükte Yapı',
    'İsimler',
    'Sıfatlar',
    'Zamirler',
    'Zarflar',
    'Edat-Bağlaç-Ünlem',
    'Fiiller',
    'Ek Fiil',
    'Fiilimsiler',
    'Fiil Çatısı',
    'Cümlenin Ögeleri',
    'Cümle Türleri',
    'Anlatım Bozuklukları',
  ].map((ad) => yks('Türkçe', ad, 'TYT Türkçe', YksKonuSegmenti.TYT)),

  ...[
    'Tarih ve Zaman',
    'İnsanlığın İlk Dönemleri',
    "Orta Çağ'da Dünya",
    'İlk ve Orta Çağlarda Türk Dünyası',
    'İslam Medeniyetinin Doğuşu',
    "Türklerin İslamiyet'i Kabulü ve İlk Türk İslam Devletleri",
    'Yerleşme ve Yapılanma Sürecinde Selçuklu Türkiye’si',
    'Osmanlı Siyaseti (1300-1453)',
    'Dünya Gücü Osmanlı (1453-1595)',
    'Yeni Çağ Avrupası',
    'Yakın Çağ Avrupası',
    '19. ve 20. Yüzyılda Osmanlı',
    'Kurtuluş Savaşı Hazırlık Dönemi',
    'I. ve II. TBMM Dönemi',
    'Atatürk İlke ve İnkılapları',
  ].map((ad) => yks('Tarih', ad, 'TYT Tarih', YksKonuSegmenti.TYT)),

  ...[
    'Doğa ve İnsan',
    'Dünyanın Şekli ve Hareketleri',
    'Yer ve Zaman (Yerel Saat)',
    'Harita Bilgisi',
    'Atmosfer ve İklim',
    'Yerin İç Yapısı',
    'İç ve Dış Kuvvetler',
    "Türkiye'nin Yer Şekilleri",
    'Su-Toprak-Bitki Varlığı',
    'Nüfus ve Yerleşme',
    'Ekonomik Faaliyetler',
    'Bölge Kavramı',
    'Uluslararası Ulaşım Hatları',
    'Doğal Afetler',
  ].map((ad) => yks('Coğrafya', ad, 'TYT Coğrafya', YksKonuSegmenti.TYT)),

  ...[
    'Felsefeyi Tanıma',
    'Bilgi Felsefesi',
    'Varlık Felsefesi',
    'Ahlak Felsefesi',
    'Din Felsefesi',
    'Siyaset Felsefesi',
    'Bilim Felsefesi',
  ].map((ad) => yks('Felsefe', ad, 'TYT Felsefe', YksKonuSegmenti.TYT)),

  ...[
    'Bilgi ve İnanç',
    'Din ve İslam',
    'İslam ve İbadet',
    'Gençlik ve Değerler',
    'Allah İnsan İlişkisi',
    'Hz. Muhammed ve Gençlik',
    'İslam Düşüncesinde Yorumlar (Mezhepler)',
    'Güncel Dini Meseleler',
  ].map((ad) => yks('Din Kültürü ve Ahlak Bilgisi', ad, 'TYT Din Kültürü', YksKonuSegmenti.TYT)),

  // ——— AYT (ÖSYM: toplam 160 soru, 180 dk; SB-1 + SB-2 + Mat + Fen) — müfredat üniteleri özet başlıklarla
  ...aytTar1([
    'İlk ve Orta Çağlarda Türkiye ile İlgili Siyasi Olaylar',
    'Son Çağlarda Osmanlı Türkiyesi',
    'Yüzyılın Başındaki Gelişmeler ile I. ve II. Dünya Savaşları Çevresinde Türkiye',
    'II. Dünya Savaşı Sonrası Türkiyede ve Dünyada Meydana Gelen Gelişmeler',
    'Yakın Türkiye Tarihi (1960 Sonrası Belirgin Olay Çerçevesi)',
  ]),
  ...aytCog1([
    'Tektonik Yer Şekilleri ve Türkiyede Dağlar',
    'İklim ve Türkiyede İklime Etkiler',
    'Türkiye Haritasında Ekonominin Temel Göstergeleri',
  ]),
  ...aytFelGrubu('Felsefe', [
    'Bilgi Üzerine Yaklaşımlar',
    'Bilimin Doğası ve Yöntemi',
    'Klasik Ahlak Yaklaşımları',
  ]),
  ...aytFelGrubu('Psikoloji', [
    'Psikolojinin Temelleri ve Biyopsikososyal Aktarım Modeli',
    'Öğrenme Kuramları ile İlgili Kısa Kavram Çerçevesi',
    'Duygu ve Dinamik Süreçlere Yaklaşım',
  ]),
  ...aytFelGrubu('Sosyoloji', [
    'Toplumu Anlamak İçin Temel Kavramlar',
    'Toplumsal Tabakalaşma',
    'Toplumsal Kurumlara Yaklaşım',
  ]),
  ...aytFelGrubu('Mantık', [
    'Yargılar',
    'Klasik Çıkarım Kavramları',
    'Temel Kavramlar',
  ]),
  ...aytDinAyri([
    'Din ile Hayat Üzerinden Temalar',
    'Din Dilinde Kavramların Anlamına Yaklaşım',
    'Din Dilinde Kavramların İlişkileri ile İbadet Kavramına Yaklaşım',
    'Peygamber ve Kitap Kavramına Yaklaşım',
    'Hz. Peygamberin Örneğine Yaklaşım ile İnanç Esasları',
    'Yaşanılan Güncel Kavramların Bağlantısı',
  ]),

  ...aytMat(null, [
    'Karmaşık Sayılar',
    'İkinci Dereceden Denklemler ve Fonksiyonlar (Parabol)',
    'Eşitsizlikler (Sistemler)',
    'Fonksiyonlarda Uygulamalar',
    'Logaritma',
    'Diziler',
    'Trigonometri (Geniş müfredat)',
    'Limit ve Süreklilik',
    'Türev (Kurallar ve Uygulamalar)',
    'İntegral (Belirsiz, Belirli ve Alan)',
    'Analitik Geometri (Nokta, Doğru, Dönüşümler, Çember)',
  ]),

  ...aytFen('Fizik', 'AYT Fizik', [
    'Vektörler',
    'Bağıl Hareket',
    "Newton'un Hareket Yasaları",
    'Bir ve İki Boyutta Sabit İvmeli Hareket (Atışlar)',
    'Enerji ve Güç',
    'İtme ve Çizgisel Momentum',
    'Tork ve Denge',
    'Kütle Merkezi',
    'Basit Makineler',
    'Elektriksel Kuvvet ve Potansiyel',
    'Kondansatörler',
    'Manyetizma ve Elektromanyetik İndükleme',
    'Alternatif Akım ve Transformatörler',
    'Çembersel Hareket',
    'Basit Harmonik Hareket',
    'Dalga Mekaniği',
    'Atom Fiziğine Giriş ve Radyoaktivite',
    'Modern Fizik (Görelilik, Fotoelektrik)',
    'Modern Fiziğin Teknolojideki Uygulamaları',
  ]),
  ...aytFen('Kimya', 'AYT Kimya', [
    'Modern Atom Teorisi',
    'Gazlar',
    'Sıvı Çözeltiler ve Çözünürlük',
    'Kimyasal Tepkimelerde Enerji',
    'Kimyasal Tepkimelerde Hız',
    'Kimyasal Denge (Asit-Baz ve Çözünürlük Dengesi dahil)',
    'Kimya ve Elektrik',
    'Organik Kimya (Hidrokarbonlar, Fonksiyonel Gruplar)',
    'Enerji Kaynakları ve Bilimsel Gelişmeler',
  ]),
  ...aytFen('Biyoloji', 'AYT Biyoloji', [
    'Denetleyici ve Düzenleyici Sistemler (Sinir, Endokrin)',
    'Duyu Organları',
    'Destek ve Hareket Sistemi',
    'Sindirim Sistemi',
    'Dolaşım ve Bağışıklık Sistemi',
    'Solunum Sistemi',
    'Boşaltım Sistemi',
    'Üreme Sistemi ve Embriyonik Gelişim',
    'Komünite ve Popülasyon Ekolojisi',
    'Genden Proteine (Nükleik Asitler, Replikasyon, Protein Sentezi)',
    'Canlılarda Enerji Dönüşümleri (Fotosentez, Kemosentez, Hücresel Solunum)',
    'Bitki Biyolojisi',
    'Canlılar ve Çevre',
  ]),

  ...aytEdeb([
    'Güzel Sanatlar ve Edebiyat',
    'Metinlerin Sınıflandırılması',
    'Şiir Bilgisi (Kafiye, Redif, Ölçü)',
    'Edebi Sanatlar',
    'Türk Edebiyatı Tarihi (İslamiyet Öncesi, Geçiş Dönemi)',
    'Halk Edebiyatı',
    'Divan Edebiyatı',
    'Tanzimat',
    'Servet-i Fünun',
    'Fecr-i Ati',
    'Milli Edebiyat',
    'Cumhuriyet Dönemi Türk Edebiyatı (Roman, Şiir, Hikaye grupları)',
    'Batı Edebiyatı (Akımlar)',
  ]),

  ...aytTarih2([
    '20. Yüzyıl Başlarında Dünya',
    'II. Dünya Savaşı',
    'Soğuk Savaş Dönemi',
    'Yumuşama Dönemi ve Sonrası',
    'Küreselleşen Dünya',
  ]),

  ...aytCog2([
    'Ekosistemlerin İşleyişi',
    'Madenler ve Enerji Kaynakları',
    "Türkiye'de Ekonomi",
    "Türkiye'nin İşlevsel Bölgeleri",
    'Küresel Ticaret',
    'Şehirlerin Fonksiyonları',
    'Medeniyetlerin Merkezi Türkiye',
    'Çevre ve Toplum',
  ]),
];
