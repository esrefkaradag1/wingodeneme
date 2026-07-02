/**
 * Landing varsayılan içerik (API yoksa / hata). Backend `siteIcerik.varsayilan` ile aynı yapıda tutulmalı.
 */
export const VARSAYILAN_SITE_ICERIK = {
  marka: {
    ad: 'Wingo Deneme',
    kisaLogo: 'W',
    logoUrl: '',
    logoUrlKoyu: '',
    faviconUrl: '/wingolink-icon.png',
    /** Navbar / footer logosu görünen yükseklik (px), ~16–120 */
    logoYukseklikPx: 36,
    /** Maksimum genişlik (px); geniş logolar taşmasın diye */
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
      'Türkiye geneli online deneme sınavı: TYT, AYT, LGS ve YKS denemeleri. Yapay zeka destekli sorular, anında analiz ve ÖSYM tarzı kitapçık.',
    altSatir: 'Wingo · Deneme & Analitik',
    copyrightMarka: 'Wingo Deneme',
    eposta: 'destek@wingodeneme.com',
    telefon: '',
    adres: '',
    /** Footer’da sözleşme / yasal sayfa sütunu */
    sozlesmelerGoster: true,
    sozlesmelerBaslik: 'Sözleşmeler',
    gruplar: [
      {
        baslik: 'Ürün',
        linkler: [
          { href: '/paketler', label: 'Tüm paketler' },
          { href: '#ozellikler', label: 'Özellikler' },
        ],
      },
      {
        baslik: 'Deneme türleri',
        linkler: [
          { href: '/online-deneme', label: 'Online deneme' },
          { href: '/turkiye-geneli-deneme', label: 'Türkiye geneli deneme' },
          { href: '/yks-deneme', label: 'YKS deneme' },
          { href: '/tyt-deneme', label: 'TYT deneme' },
          { href: '/ayt-deneme', label: 'AYT deneme' },
          { href: '/lgs-deneme', label: 'LGS deneme' },
        ],
      },
      {
        baslik: 'Kaynaklar',
        linkler: [
          { href: '/rehber/net-simulasyonu', label: 'Net simülasyonu' },
          { href: '/paketler', label: 'Deneme paketleri' },
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
      'Türkiye geneli online deneme platformu: TYT sınavları, AYT sınavları, LGS sınavları ve YKS denemeleri. ÖSYM/MEB tarzı kitapçık, anında analiz ve sıralama — tek platformda.',
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
        '<p>Wingo Deneme, öğrencilerin YKS ve LGS sınavlarına online deneme ve yapay zeka destekli analizlerle hazırlanmasını sağlayan bir eğitim teknolojisi platformudur.</p><p>Misyonumuz, her öğrenciye adil, ölçülebilir ve erişilebilir bir sınav deneyimi sunmaktır.</p>',
    },
    gizlilik: {
      baslik: 'Gizlilik Sözleşmesi',
      yayinda: true,
      icerikHtml:
        '<p>Bu gizlilik sözleşmesi, Wingo Deneme platformunda toplanan kişisel verilerin işlenmesine ilişkin esasları açıklar.</p><p>Kayıt, sınav ve ödeme süreçlerinde yalnızca hizmetin sunulması için gerekli veriler işlenir; üçüncü taraflarla paylaşım yasal zorunluluklar ve ödeme altyapısı (iyzico) ile sınırlıdır.</p>',
    },
    mesafeliSatis: {
      baslik: 'Mesafeli Satış Sözleşmesi',
      yayinda: true,
      icerikHtml:
        '<p>6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında, dijital içerik ve paket satışlarına ilişkin hak ve yükümlülükler bu sayfada yer alır.</p><p>Satın alınan dijital paketler, ödeme onayı sonrası hesabınıza tanımlanır.</p>',
    },
    teslimatIade: {
      baslik: 'Teslimat ve İade Şartları',
      yayinda: true,
      icerikHtml:
        '<p>Dijital paketlerde teslimat, ödeme onayının ardından anında hesap erişimi ile gerçekleşir.</p><p>Cayma hakkı ve iade koşulları, yürürlükteki mevzuat ve paket türüne göre uygulanır; detaylar için destek ekibimizle iletişime geçebilirsiniz.</p>',
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

export type SiteGenelIcerik = typeof VARSAYILAN_SITE_ICERIK;

/** Admin formunda düzenlenebilir serbest metin yapısı (literal union değil) */
export type SiteGenelIcerikForm = {
  marka: { 
    ad: string; 
    kisaLogo: string;
    logoUrl?: string;
    logoUrlKoyu?: string;
    faviconUrl?: string;
    logoYukseklikPx?: number;
    logoMaxGenislikPx?: number;
  };
  nav: {
    navLinks: { href: string; label: string }[];
    girisMetni: string;
    kayitCta: string;
  };
  footer: {
    footerAciklama: string;
    altSatir: string;
    copyrightMarka: string;
    eposta?: string;
    telefon?: string;
    adres?: string;
    sozlesmelerGoster?: boolean;
    sozlesmelerBaslik?: string;
    gruplar: { baslik: string; linkler: { href: string; label: string }[] }[];
  };
  hero: {
    rozet1: string;
    rozet2: string;
    baslikOnce: string;
    baslikVurgu: string;
    baslikSon: string;
    altMetin: string;
    madde1: string;
    madde2: string;
    birincilCta: string;
    birincilCtaHref: string;
    ikincilCta: string;
    ikincilCtaHref: string;
    kartlar: { ikon: string; baslik: string; aciklama: string; etiket: string }[];
  };
  istatistik: {
    bolumBaslik: string;
    bolumAciklama: string;
    satirlar: { sayi: number; suffix: string; etiket: string; alt: string }[];
  };
  ozellikler: {
    ustBaslik: string;
    baslik: string;
    aciklama: string;
    liste: { ikon: string; baslik: string; aciklama: string; renk: string }[];
  };
  nasil: {
    ustBaslik: string;
    baslik: string;
    aciklama: string;
    adimlar: { sira: string; ikon: string; baslik: string; metin: string }[];
  };
  paketBolum: {
    ustBaslik: string;
    baslik: string;
    aciklama: string;
    tumPaketler: string;
    tumPaketlerHref: string;
    ucretsizDene: string;
    kayitHref: string;
    bosPaketMesaj: string;
    bosPaketAlt: string;
  };
  altCta: {
    baslik: string;
    aciklama: string;
    kayitCta: string;
    girisCta: string;
  };
  yasalSayfalar: {
    hakkimizda: YasalSayfaForm;
    gizlilik: YasalSayfaForm;
    mesafeliSatis: YasalSayfaForm;
    teslimatIade: YasalSayfaForm;
  };
  odemeGostergeleri: {
    visaGoster: boolean;
    mastercardGoster: boolean;
    iyzicoGoster: boolean;
    visaLogoUrl: string;
    mastercardLogoUrl: string;
    iyzicoLogoUrl: string;
  };
};

export type YasalSayfaForm = {
  baslik: string;
  icerikHtml: string;
  yayinda: boolean;
};
