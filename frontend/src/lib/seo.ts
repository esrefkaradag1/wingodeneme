import type { Metadata } from 'next';

export const SITE_NAME = 'Wingo Deneme';
export const SITE_TAGLINE = 'Online Deneme Sınavı Platformu';

const DEFAULT_SITE_URL = 'https://www.wingodeneme.com';

export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).trim();
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl()}${p}`;
}

/** Tüm hedef anahtar kelimeler — metadata ve içerik üretiminde kullanılır */
export const GLOBAL_KEYWORDS = [
  'online deneme',
  'online deneme sınavı',
  'türkiye geneli deneme',
  'türkiye geneli online deneme',
  'yks deneme',
  'yks online deneme',
  'tyt deneme',
  'tyt sınavları',
  'tyt online deneme',
  'ayt deneme',
  'ayt sınavları',
  'ayt online deneme',
  'lgs deneme',
  'lgs sınavları',
  'lgs online deneme',
  'deneme sınavı',
  'deneme sınavı çöz',
  'ücretsiz online deneme',
  'deneme analizi',
  'sınav hazırlık',
  'ösym deneme',
  'meb lgs deneme',
  'yapay zeka soru bankası',
  'wingo deneme',
] as const;

export type SeoPageConfig = {
  path: string;
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  lead: string;
  bullets: string[];
  faqs: { soru: string; cevap: string }[];
};

export const SEO_LANDING: Record<string, SeoPageConfig> = {
  'online-deneme': {
    path: '/online-deneme',
    title: 'Online Deneme Sınavı — Ücretsiz TYT, AYT ve LGS Denemeleri',
    description:
      'Wingo Deneme ile online deneme sınavına katılın. Gerçek süreli TYT, AYT ve LGS denemeleri, anında analiz ve Türkiye geneli sıralama. Hemen ücretsiz kayıt olun.',
    keywords: ['online deneme', 'online deneme sınavı', 'ücretsiz online deneme', 'deneme sınavı online'],
    h1: 'Online Deneme Sınavı Platformu',
    lead: 'Evden çıkmadan gerçek sınav ortamında online deneme çözün. Süre tutma, optik form ve detaylı konu analizi tek panelde.',
    bullets: [
      'Gerçek süreli online deneme deneyimi',
      'TYT, AYT ve LGS kitapçık görünümü',
      'Anında net, puan ve konu bazlı rapor',
      'Yapay zeka destekli soru üretimi',
    ],
    faqs: [
      {
        soru: 'Online deneme nasıl çözülür?',
        cevap: 'Wingo Deneme hesabı açın, marketten veya atanan paketten denemeyi seçin, süre başladığında soruları çözüp bitirin; sonuçlar otomatik hesaplanır.',
      },
      {
        soru: 'Online deneme ücretsiz mi?',
        cevap: 'Kayıt ücretsizdir; paketlere göre deneme sayısı değişir. Ücretsiz deneme fırsatları kampanyalarla sunulabilir.',
      },
    ],
  },
  'turkiye-geneli-deneme': {
    path: '/turkiye-geneli-deneme',
    title: 'Türkiye Geneli Deneme — Online Sıralama ve Karşılaştırma',
    description:
      'Türkiye geneli online deneme sınavları ile binlerce öğrenci arasında net ve puan sıralamanızı görün. YKS ve LGS denemelerinde ülke çapında kendinizi ölçün.',
    keywords: ['türkiye geneli deneme', 'türkiye geneli online deneme', 'genel sıralama deneme', 'ülke geneli deneme'],
    h1: 'Türkiye Geneli Online Deneme',
    lead: 'Deneme sonuçlarınızı Türkiye genelindeki diğer öğrencilerle kıyaslayın. İl, net ve puan dağılımıyla gerçek rekabet ortamını hissedin.',
    bullets: [
      'Türkiye geneli net ve puan sıralaması',
      'İl bazlı karşılaştırma grafikleri',
      'Deneme sonrası detaylı analiz raporu',
      'TYT, AYT ve LGS oturumları',
    ],
    faqs: [
      {
        soru: 'Türkiye geneli deneme sıralaması nasıl hesaplanır?',
        cevap: 'Aynı denemeye katılan tüm öğrencilerin netleri toplanır; sizin netiniz bu havuz içinde yüzdelik ve sıra olarak gösterilir.',
      },
    ],
  },
  'yks-deneme': {
    path: '/yks-deneme',
    title: 'YKS Deneme — TYT ve AYT Online Deneme Sınavları',
    description:
      'YKS hazırlık için online YKS denemeleri: TYT 120 soru, AYT 160 soru, ÖSYM tarzı kitapçık ve konu analizi. Türkiye geneli YKS deneme platformu.',
    keywords: ['yks deneme', 'yks online deneme', 'yks deneme sınavı', 'üniversite sınavı denemesi'],
    h1: 'YKS Online Deneme Sınavları',
    lead: 'Üniversite sınavına hazırlananlar için TYT ve AYT oturumlarını gerçek süre ve dağılımla online çözün.',
    bullets: [
      'TYT ve AYT ayrı oturumlar',
      'ÖSYM uyumlu kitapçık önizlemesi',
      'Türkiye geneli YKS sıralaması',
      'Konu ve ders bazlı gelişim takibi',
    ],
    faqs: [
      {
        soru: 'YKS denemesi kaç sorudan oluşur?',
        cevap: 'TYT oturumu 120, AYT oturumu 160 soruluk yaygın dağılıma uygun şekilde yapılandırılabilir.',
      },
    ],
  },
  'tyt-deneme': {
    path: '/tyt-deneme',
    title: 'TYT Deneme — Online TYT Sınavları ve Net Analizi',
    description:
      'TYT sınavları için online deneme: Türkçe, Matematik, Fen ve Sosyal testleri. 120 soruluk TYT denemesi, süre tutma ve anında analiz.',
    keywords: ['tyt deneme', 'tyt sınavları', 'tyt online deneme', 'tyt deneme sınavı', 'temel yeterlilik testi'],
    h1: 'TYT Online Deneme Sınavı',
    lead: 'Temel Yeterlilik Testi formatında online TYT denemeleri ile her testi ayrı numaralandırılmış kitapçık düzeninde çözün.',
    bullets: [
      '120 soruluk TYT şablonu',
      'Test bazlı 1–N soru numaralandırma',
      'İki sütunlu ÖSYM tarzı kitapçık',
      'TYT net ve puan simülasyonu',
    ],
    faqs: [
      {
        soru: 'TYT denemesi hangi dersleri kapsar?',
        cevap: 'Türkçe, Sosyal Bilimler, Temel Matematik ve Fen Bilimleri testlerini kapsayan standart TYT yapısı.',
      },
    ],
  },
  'ayt-deneme': {
    path: '/ayt-deneme',
    title: 'AYT Deneme — Online AYT Sınavları | YKS 2. Oturum',
    description:
      'AYT deneme sınavları online: Alan testleri, 160 soru dağılımı, TYT+AYT birleşik denemeler. AYT sınavları için detaylı analiz ve sıralama.',
    keywords: ['ayt deneme', 'ayt sınavları', 'ayt online deneme', 'yks 2. oturum deneme', 'alan denemesi'],
    h1: 'AYT Online Deneme Sınavı',
    lead: 'Alanınıza göre AYT testlerini gerçek süreyle çözün; TYT soru havuzu ile birleşik denemeler de desteklenir.',
    bullets: [
      '160 soruluk AYT şablonu',
      'AYT + TYT birleşik deneme desteği',
      'Edebiyat, Matematik, Fen alan testleri',
      'AYT net ve sıralama raporu',
    ],
    faqs: [
      {
        soru: 'AYT denemesi ile TYT denemesi birlikte yapılır mı?',
        cevap: 'Evet, AYT+TYT birleşik deneme türü ile iki oturum tek pakette planlanabilir.',
      },
    ],
  },
  'lgs-deneme': {
    path: '/lgs-deneme',
    title: 'LGS Deneme — Online LGS Sınavları | Sözel ve Sayısal',
    description:
      'LGS sınavları için online deneme: 90 soru, sözel ve sayısal oturum, MEB/ÖSYM tarzı mavi kitapçık. LGS deneme analizi ve Türkiye geneli sıralama.',
    keywords: ['lgs deneme', 'lgs sınavları', 'lgs online deneme', 'liseye geçiş denemesi', 'lgs deneme sınavı'],
    h1: 'LGS Online Deneme Sınavı',
    lead: 'Liseye Geçiş Sınavı formatında sözel ve sayısal oturumları online çözün; iki sütunlu kitapçık ve oturum arası mola desteği.',
    bullets: [
      '90 soruluk LGS şablonu',
      'Sözel + sayısal ayrı oturum',
      'Mavi tema LGS kitapçık görünümü',
      'LGS Türkiye geneli sıralama',
    ],
    faqs: [
      {
        soru: 'LGS denemesi kaç sorudur?',
        cevap: 'Yaygın LGS dağılımında toplam 90 soru; sözel ve sayısal bölümler ayrı oturumlarda uygulanır.',
      },
    ],
  },
};

export const PUBLIC_SITEMAP_PATHS: Array<{
  path: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/online-deneme', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/turkiye-geneli-deneme', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/yks-deneme', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/tyt-deneme', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/ayt-deneme', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/lgs-deneme', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/paketler', changeFrequency: 'daily', priority: 0.9 },
  { path: '/iletisim', changeFrequency: 'monthly', priority: 0.75 },
  { path: '/kayit', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/giris', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/kayit/veli', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/kayit/ogretmen', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/rehber', changeFrequency: 'weekly', priority: 0.85 },
  { path: '/rehber/net-simulasyonu', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/rehber/mezun-icin-yks-calisma-programi', changeFrequency: 'monthly', priority: 0.75 },
  { path: '/rehber/12-sinif-icin-yks-calisma-programi', changeFrequency: 'monthly', priority: 0.75 },
  { path: '/rehber/sayisal-yks-calisma-programi', changeFrequency: 'monthly', priority: 0.75 },
  { path: '/rehber/esit-agirlik-yks-calisma-programi', changeFrequency: 'monthly', priority: 0.75 },
];

const REHBER_SLUG_META: Record<string, { title: string; description: string }> = {
  'mezun-icin-yks-calisma-programi': {
    title: 'Mezunlar İçin YKS Çalışma Programı',
    description: 'Mezun öğrenciler için haftalık YKS çalışma programı, deneme rutini ve verimli zaman yönetimi önerileri.',
  },
  '12-sinif-icin-yks-calisma-programi': {
    title: '12. Sınıf YKS Çalışma Programı',
    description: '12. sınıf öğrencileri için okul ve YKS dengesini koruyan çalışma planı ve deneme takvimi.',
  },
  'sayisal-yks-calisma-programi': {
    title: 'Sayısal (MF) YKS Çalışma Programı',
    description: 'Sayısal alan öğrencileri için matematik ve fen odaklı YKS hazırlık programı.',
  },
  'esit-agirlik-yks-calisma-programi': {
    title: 'Eşit Ağırlık (TM) YKS Çalışma Programı',
    description: 'Eşit ağırlık öğrencileri için matematik ve edebiyat dengeli YKS çalışma planı.',
  },
};

type MetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noindex?: boolean;
};

export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  noindex = false,
}: MetadataInput): Metadata {
  const url = absoluteUrl(path);
  const allKeywords = [...new Set([...GLOBAL_KEYWORDS.slice(0, 12), ...keywords])];

  return {
    title,
    description,
    keywords: allKeywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'tr_TR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  };
}

export function anaSayfaMetadata(): Metadata {
  return buildMetadata({
    title: 'Online Deneme Sınavı — TYT, AYT, LGS | Türkiye Geneli Deneme',
    description:
      'Wingo Deneme: Türkiye geneli online deneme platformu. TYT sınavları, AYT sınavları, LGS sınavları ve YKS denemeleri. Gerçek süreli sınav, anında analiz, ücretsiz kayıt.',
    path: '/',
    keywords: [...GLOBAL_KEYWORDS],
  });
}

export function landingMetadata(key: keyof typeof SEO_LANDING): Metadata {
  const p = SEO_LANDING[key];
  return buildMetadata({
    title: p.title,
    description: p.description,
    path: p.path,
    keywords: p.keywords,
  });
}

export function rehberHubMetadata(): Metadata {
  return buildMetadata({
    title: 'YKS ve LGS Rehber — Çalışma Programları ve Net Simülasyonu',
    description:
      'YKS ve LGS hazırlık rehberleri, çalışma programları, net simülasyonu ve sınav stratejileri. TYT, AYT ve LGS için ücretsiz kaynaklar.',
    path: '/rehber',
    keywords: ['yks rehber', 'lgs rehber', 'çalışma programı', 'net hesaplama'],
  });
}

export function rehberSlugMetadata(slug: string): Metadata {
  const m = REHBER_SLUG_META[slug];
  if (!m) {
    return buildMetadata({
      title: 'Rehber İçerik',
      description: 'Wingo Deneme sınav hazırlık rehberi.',
      path: `/rehber/${slug}`,
    });
  }
  return buildMetadata({
    title: m.title,
    description: m.description,
    path: `/rehber/${slug}`,
  });
}

export function marketMetadata(): Metadata {
  return buildMetadata({
    title: 'Deneme Paketleri — YKS ve LGS Online Deneme Market',
    description:
      'TYT, AYT ve LGS online deneme paketlerini inceleyin. Türkiye geneli sıralamalı denemeler, anında sonuç ve detaylı analiz.',
    path: '/market',
    keywords: ['deneme paketi', 'yks deneme paketi', 'lgs deneme paketi', 'online deneme satın al'],
  });
}

export function kayitMetadata(): Metadata {
  return buildMetadata({
    title: 'Ücretsiz Kayıt — Online Deneme Sınavına Başla',
    description:
      'Wingo Deneme ücretsiz kayıt ile TYT, AYT ve LGS online denemelerine hemen başlayın. Türkiye geneli sıralama ve analiz.',
    path: '/kayit',
    keywords: ['ücretsiz deneme kayıt', 'online deneme üye ol'],
  });
}

export function girisMetadata(): Metadata {
  return buildMetadata({
    title: 'Giriş Yap',
    description: 'Wingo Deneme hesabınıza giriş yapın; online deneme ve analiz panelinize erişin.',
    path: '/giris',
    noindex: true,
  });
}

export function appNoIndexMetadata(title: string): Metadata {
  return buildMetadata({
    title,
    description: 'Wingo Deneme öğrenci paneli.',
    path: '/dashboard',
    noindex: true,
  });
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: siteUrl(),
    logo: absoluteUrl('/logo.png'),
    description:
      'Türkiye geneli online deneme sınavı platformu. TYT, AYT, LGS ve YKS denemeleri, anında analiz ve sıralama.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TR',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Turkey',
    },
    sameAs: ['https://twitter.com/wingodeneme', 'https://instagram.com/wingodeneme'],
  };
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl(),
    description: 'Online deneme sınavı — TYT, AYT, LGS, YKS',
    inLanguage: 'tr-TR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl()}/market?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function faqJsonLd(faqs: { soru: string; cevap: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.soru,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.cevap,
      },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
