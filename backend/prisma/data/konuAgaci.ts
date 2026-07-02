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
