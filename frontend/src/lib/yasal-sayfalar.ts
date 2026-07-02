/** Yasal sayfa slug → site içeriği anahtarı */
export const YASAL_SAYFA_SLUGS = {
  hakkimizda: 'hakkimizda',
  'gizlilik-politikasi': 'gizlilik',
  'mesafeli-satis-sozlesmesi': 'mesafeliSatis',
  'teslimat-ve-iade': 'teslimatIade',
} as const;

export type YasalSayfaSlug = keyof typeof YASAL_SAYFA_SLUGS;

export type YasalSayfaAnahtar = (typeof YASAL_SAYFA_SLUGS)[YasalSayfaSlug];

export const YASAL_SAYFA_ETIKET: Record<YasalSayfaAnahtar, string> = {
  hakkimizda: 'Hakkımızda',
  gizlilik: 'Gizlilik Sözleşmesi',
  mesafeliSatis: 'Mesafeli Satış Sözleşmesi',
  teslimatIade: 'Teslimat ve İade Şartları',
};

export const YASAL_SAYFA_YOLLAR: Record<YasalSayfaAnahtar, string> = {
  hakkimizda: '/hakkimizda',
  gizlilik: '/gizlilik-politikasi',
  mesafeliSatis: '/mesafeli-satis-sozlesmesi',
  teslimatIade: '/teslimat-ve-iade',
};

export function slugGecerli(slug: string): slug is YasalSayfaSlug {
  return slug in YASAL_SAYFA_SLUGS;
}

export function slugdanAnahtar(slug: YasalSayfaSlug): YasalSayfaAnahtar {
  return YASAL_SAYFA_SLUGS[slug];
}

/** iyzico web sitesi kriterleri — admin checklist */
export const IYZICO_WEB_KRITERLERI = [
  { id: 'hakkimizda', etiket: 'Hakkımızda Sayfası', anahtar: 'hakkimizda' as YasalSayfaAnahtar, tur: 'sayfa' as const },
  { id: 'ssl', etiket: 'SSL Sertifikası', tur: 'ssl' as const },
  { id: 'teslimatIade', etiket: 'Teslimat ve İade Şartları', anahtar: 'teslimatIade' as YasalSayfaAnahtar, tur: 'sayfa' as const },
  { id: 'gizlilik', etiket: 'Gizlilik Sözleşmesi', anahtar: 'gizlilik' as YasalSayfaAnahtar, tur: 'sayfa' as const },
  { id: 'mesafeliSatis', etiket: 'Mesafeli Satış Sözleşmesi', anahtar: 'mesafeliSatis' as YasalSayfaAnahtar, tur: 'sayfa' as const },
  { id: 'kartLogolari', etiket: 'Visa ve MasterCard Logoları', tur: 'kart' as const },
  { id: 'iyzicoLogo', etiket: 'iyzico ile Öde Logosu', tur: 'iyzico' as const },
] as const;
