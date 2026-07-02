/**
 * Landing / site metinleri — varsayılan değerler.
 * Admin panelinden güncellenen içerik DB ile birleştirilir.
 */
export const SITE_ICERIK_TEK_ID = 'tek';

export const VARSAYILAN_SITE_ICERIK = {
  marka: {
    ad: 'Wingo Deneme',
    kisaLogo: 'W',
    faviconUrl: '/wingolink-icon.png',
    logoYukseklikPx: 36,
    logoMaxGenislikPx: 220,
  },
  nav: {
    navLinks: [
      { href: '/paketler', label: 'Paketler' },
      { href: '#ozellikler', label: 'Özellikler' },
      { href: '#nasil', label: 'Nasıl çalışır?' },
      { href: '/iletisim', label: 'İletişim' },
    ],
    girisMetni: 'Giriş',
    kayitCta: 'Ücretsiz dene',
  },
  footer: {
    footerAciklama:
      'Wingo Deneme ile sınav hazırlık sürecinizi dijitalleştirin. Yapay zeka destekli sorular, analiz ve kitapçık deneyimi.',
    altSatir: 'Wingo · Deneme & Analitik',
    copyrightMarka: 'Wingo Deneme',
    eposta: 'destek@wingodeneme.com',
    telefon: '',
    adres: '',
    sozlesmelerGoster: true,
    sozlesmelerBaslik: 'Sözleşmeler',
    gruplar: [
      {
        baslik: 'Ürün',
        linkler: [
          { href: '#paketler', label: 'Paketler' },
          { href: '/paketler', label: 'Tüm paketler' },
          { href: '#ozellikler', label: 'Özellikler' },
        ],
      },
      {
        baslik: 'Kaynaklar',
        linkler: [
          { href: '/rehber/net-simulasyonu', label: 'Net simülasyonu' },
          { href: '/analiz', label: 'Analiz' },
        ],
      },
      {
        baslik: 'Hesap',
        linkler: [
          { href: '/giris', label: 'Giriş' },
          { href: '/kayit', label: 'Kayıt ol' },
          { href: '/kayit/veli', label: 'Veli kaydı' },
          { href: '/iletisim', label: 'İletişim' },
        ],
      },
      {
        baslik: 'Sözleşmeler',
        linkler: [
          { href: '/hakkimizda', label: 'Hakkımızda' },
          { href: '/gizlilik-politikasi', label: 'Gizlilik Sözleşmesi' },
          { href: '/mesafeli-satis-sozlesmesi', label: 'Mesafeli Satış Sözleşmesi' },
          { href: '/teslimat-ve-iade', label: 'Teslimat ve İade' },
        ],
      },
    ],
  },
  hero: {
    rozet1: 'Yapay zeka destekli dil eğitimi',
    rozet2: 'TYT · AYT · LGS',
    baslikOnce: 'Sınavlara ',
    baslikVurgu: 'zekice',
    baslikSon: ' hazırlan',
    altMetin:
      'ÖSYM/MEB tarzı kitapçık arayüzü, yapay zeka ile soru üretimi ve performans analitiği, optik okuma ve kişisel çalışma planı — tek platformda bir araya geliyor.',
    madde1: 'Gerçek süreli sınav deneyimi',
    madde2: 'Konuya özel AI içerik',
    birincilCta: 'Ücretsiz başla',
    birincilCtaHref: '/kayit',
    ikincilCta: '',
    ikincilCtaHref: '',
    kartlar: [
      {
        ikon: 'Brain',
        baslik: 'AI soru üretimi',
        aciklama:
          'Konuya göre çoktan seçmeli sorular; şık benzerliği ve STEM kontrolleriyle kalite güvencesi.',
        etiket: 'GPT-4o / Claude',
      },
      {
        ikon: 'Trophy',
        baslik: 'Net & sıralama analitiği',
        aciklama:
          'Konu bazlı performans, yüzdelik dilim ve gelişim eğrileri — nerede eksik olduğunu net gör.',
        etiket: 'Gerçek zamanlı',
      },
      {
        ikon: 'Users',
        baslik: 'Düello & sosyal',
        aciklama:
          'Arkadaşınla mini sınav düellosu, motivasyon ve grup sınavlarıyla düzenli pratik.',
        etiket: 'Çok oyunculu',
      },
    ],
  },
  istatistik: {
    bolumBaslik: 'Rakamlarla Wingo Deneme',
    bolumAciklama: 'Öğrenci hacmi ve sınav tamamlanma verileri — tek bakışta ölçek.',
    satirlar: [
      {
        sayi: 50000,
        suffix: '+',
        etiket: 'Aktif öğrenci',
        alt: 'Platform üzerinde pratik yapan kullanıcı',
      },
      {
        sayi: 1200,
        suffix: '+',
        etiket: 'Tamamlanan sınav',
        alt: 'Deneme ve canlı oturumlar',
      },
      { sayi: 95, suffix: '%', etiket: 'Memnuniyet', alt: 'Geri bildirim ortalaması' },
      {
        sayi: 3,
        suffix: '×',
        etiket: 'Net artış hedefi',
        alt: 'Yoğun kullanımda tipik artış',
      },
    ],
  },
  ozellikler: {
    ustBaslik: 'Platform',
    baslik: 'Başarı için gereken her şey',
    aciklama:
      'Kitapçıktan optik okumaya, AI soru üretiminden üniversite tahminine kadar — hazırlık sürecini uçtan uca kapsayan özellikler.',
    liste: [
      {
        ikon: 'BookOpen',
        baslik: 'ÖSYM/MEB Kitapçık Arayüzü',
        aciklama: 'İki sayfalı, tek sayfalı ve soru-soru modu. Zoom ve tablet yazı desteği.',
        renk: 'indigo',
      },
      {
        ikon: 'Camera',
        baslik: 'Optik Form Okuma',
        aciklama: 'A4 cevap kâğıdını fotoğrafla — AI otomatik okur ve işler.',
        renk: 'violet',
      },
      {
        ikon: 'BarChart3',
        baslik: 'Akıllı Analitik',
        aciklama: 'Konu bazlı performans, yüzdelik, ulusal sıralama, trend analizi.',
        renk: 'cyan',
      },
      {
        ikon: 'Map',
        baslik: 'Kişisel Çalışma Planı',
        aciklama: 'AI zayıf konularını tespit eder, haftalık çalışma takvimi oluşturur.',
        renk: 'emerald',
      },
      {
        ikon: 'Swords',
        baslik: 'Düello & Rekabet',
        aciklama: 'Arkadaşlarınla mini sınav düellosu. Liderlik tablosu.',
        renk: 'orange',
      },
      {
        ikon: 'GraduationCap',
        baslik: 'Üniversite Tahmini',
        aciklama: 'Geçmiş yıl verileriyle hedef üniversite yerleşim olasılığı.',
        renk: 'pink',
      },
      {
        ikon: 'Bell',
        baslik: 'Akıllı Bildirimler',
        aciklama: 'Sınav hatırlatmaları, e-posta ve push bildirimleri.',
        renk: 'yellow',
      },
      {
        ikon: 'Shield',
        baslik: 'Veli Takip Paneli',
        aciklama: 'Veliler öğrencinin performansını ve sınav sonuçlarını takip eder.',
        renk: 'slate',
      },
    ],
  },
  nasil: {
    ustBaslik: 'Nasıl çalışır?',
    baslik: 'Üç adımda sınav rutinine başla',
    aciklama:
      'Karmaşık kurulum yok: tarayıcıdan giriş yap, denemelerine ve analitiklerine anında ulaş.',
    adimlar: [
      {
        sira: '01',
        ikon: 'UserPlus',
        baslik: 'Hesap oluştur',
        metin: 'E-posta ile kayıt ol; öğrenci veya veli rolünü seç, profilini tamamla.',
      },
      {
        sira: '02',
        ikon: 'LineChart',
        baslik: 'Plan ve pratik',
        metin: 'Grubuna atanmış sınavlara gir, AI ile soru üret veya konu analitiklerini incele.',
      },
      {
        sira: '03',
        ikon: 'ClipboardCheck',
        baslik: 'Ölç ve geliş',
        metin: 'Netini, yüzdelik dilimini ve konu bazlı eksiklerini tek ekranda takip et.',
      },
    ],
  },
  paketBolum: {
    ustBaslik: 'Paketler',
    baslik: 'İhtiyacına uygun paket',
    aciklama:
      'Sınav kotası ve özellikler paket bazında tanımlanır; yönetim panelinden güncellenen içerikler burada anında listelenir. Önce incele, sonra güvenle satın al.',
    tumPaketler: 'Tüm Paketler',
    tumPaketlerHref: '/paketler',
    ucretsizDene: 'Ücretsiz Dene',
    kayitHref: '/kayit',
    bosPaketMesaj: 'Şu an aktif bir paket yok.',
    bosPaketAlt: 'Admin panelinden paket ekleyince burada otomatik görünecek.',
  },
  altCta: {
    baslik: 'Hazır mısın?',
    aciklama: 'Dakikalar içinde hesap oluştur; denemelere ve analitik panona hemen eriş.',
    kayitCta: 'Ücretsiz kayıt ol',
    girisCta: 'Zaten hesabım var',
  },
  yasalSayfalar: {
    hakkimizda: {
      baslik: 'Hakkımızda',
      yayinda: true,
      icerikHtml:
        '<p>Wingo Deneme, öğrencilerin YKS ve LGS sınavlarına online deneme ve yapay zeka destekli analizlerle hazırlanmasını sağlayan bir eğitim teknolojisi platformudur.</p>',
    },
    gizlilik: {
      baslik: 'Gizlilik Sözleşmesi',
      yayinda: true,
      icerikHtml:
        '<p>Bu gizlilik sözleşmesi, Wingo Deneme platformunda toplanan kişisel verilerin işlenmesine ilişkin esasları açıklar.</p>',
    },
    mesafeliSatis: {
      baslik: 'Mesafeli Satış Sözleşmesi',
      yayinda: true,
      icerikHtml:
        '<p>6502 sayılı Kanun kapsamında dijital paket satışlarına ilişkin hak ve yükümlülükler bu sayfada yer alır.</p>',
    },
    teslimatIade: {
      baslik: 'Teslimat ve İade Şartları',
      yayinda: true,
      icerikHtml:
        '<p>Dijital paketlerde teslimat, ödeme onayının ardından anında hesap erişimi ile gerçekleşir.</p>',
    },
  },
  odemeGostergeleri: {
    visaGoster: true,
    mastercardGoster: true,
    iyzicoGoster: true,
    visaLogoUrl: 'https://wingolink.com.tr/visa.png',
    mastercardLogoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg',
    iyzicoLogoUrl: 'https://static.iyzipay.com/footer-logo.png',
  },
} as const;

export type SiteGenelIcerikTip = typeof VARSAYILAN_SITE_ICERIK;
