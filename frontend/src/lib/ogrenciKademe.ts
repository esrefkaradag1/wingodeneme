import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Calendar,
  Users,
  Compass,
  Map,
  Bell,
  Swords,
  CreditCard,
  LifeBuoy,
  GraduationCap,
  Sparkles,
  School,
  ShoppingBag,
} from 'lucide-react';

export type OgretimTuru = 'YKS' | 'LGS' | 'KPSS_LISANS' | 'KPSS_ONLISANS' | 'KPSS_ORTAOGRETIM';

export const KPSS_OGRENCI_SECENEKLERI = [
  { value: 'KPSS_LISANS', etiket: 'KPSS Lisans' },
  { value: 'KPSS_ONLISANS', etiket: 'KPSS Önlisans' },
  { value: 'KPSS_ORTAOGRETIM', etiket: 'KPSS Ortaöğretim' },
] as const;

export function kpssOgretimTuruMu(tur?: string | null): tur is OgretimTuru {
  if (!tur) return false;
  const s = String(tur).trim().toUpperCase();
  return s === 'KPSS_LISANS' || s === 'KPSS_ONLISANS' || s === 'KPSS_ORTAOGRETIM';
}

/** 6–8. sınıf → LGS; 9–12 ve mezun → YKS */
export function siniftanOgretimTuru(sinif?: string | null): OgretimTuru | null {
  if (!sinif) return null;
  const ham = String(sinif).trim().toLowerCase();
  if (!ham) return null;
  if (ham === 'mezun' || ham.includes('mezun')) return 'YKS';
  const sayi = parseInt(ham.replace(/[^\d]/g, ''), 10);
  if (Number.isNaN(sayi)) return null;
  if (sayi >= 6 && sayi <= 8) return 'LGS';
  if (sayi >= 9 && sayi <= 12) return 'YKS';
  return null;
}

export const OGRENCI_SINIF_SECENEKLERI = [
  { value: '6', etiket: '6. Sınıf' },
  { value: '7', etiket: '7. Sınıf' },
  { value: '8', etiket: '8. Sınıf' },
  { value: '9', etiket: '9. Sınıf' },
  { value: '10', etiket: '10. Sınıf' },
  { value: '11', etiket: '11. Sınıf' },
  { value: '12', etiket: '12. Sınıf' },
  { value: 'mezun', etiket: 'Mezun' },
] as const;

/** Eski kayıtlar: ogretimTuru alanı SINIF_6 vb. olabilir */
export function legacySinifNorm(ogretimTuru?: string | null, sinif?: string | null): string | null {
  if (sinif?.trim()) return sinif.trim();
  if (!ogretimTuru) return null;
  const m = String(ogretimTuru).match(/^SINIF_(\d+)$/i);
  if (m) return m[1];
  return null;
}

export function ogretimTuruCoz(
  kullanici?: { ogretimTuru?: string | null } | null,
  profil?: { ogrenciProfil?: { ogretimTuru?: string | null; sinif?: string | null } | null } | null,
): OgretimTuru {
  const hamOgretim = profil?.ogrenciProfil?.ogretimTuru ?? kullanici?.ogretimTuru;
  const sinif = legacySinifNorm(hamOgretim, profil?.ogrenciProfil?.sinif);
  if (kpssOgretimTuruMu(hamOgretim)) return hamOgretim;
  if (kpssOgretimTuruMu(sinif)) return sinif;
  const siniftan = siniftanOgretimTuru(sinif);
  if (siniftan) return siniftan;
  return String(hamOgretim).toUpperCase() === 'LGS' ? 'LGS' : 'YKS';
}

export function kpssMi(tur: OgretimTuru): boolean {
  return kpssOgretimTuruMu(tur);
}

export function sinifEtiketi(sinif?: string | null): string {
  if (!sinif) return '—';
  if (kpssOgretimTuruMu(sinif)) {
    return KPSS_OGRENCI_SECENEKLERI.find((s) => s.value === sinif)?.etiket ?? sinif;
  }
  if (sinif === 'mezun') return 'Mezun';
  return `${sinif}. Sınıf`;
}

export function lgsMi(tur: OgretimTuru): boolean {
  return tur === 'LGS';
}

export type NavRenk =
  | 'indigo'
  | 'amber'
  | 'sky'
  | 'emerald'
  | 'rose'
  | 'yellow'
  | 'teal'
  | 'violet'
  | 'red'
  | 'purple'
  | 'fuchsia'
  | 'green'
  | 'blue';

export interface NavOge {
  href: string;
  ikon: LucideIcon;
  etiket: string;
  yalnizca?: OgretimTuru[];
  renk?: NavRenk;
}

export interface NavGrup {
  baslik: string;
  ogeler: NavOge[];
}

const TUM_NAV_GRUPLAR: NavGrup[] = [
  {
    baslik: 'Genel',
    ogeler: [
      { href: '/dashboard', ikon: LayoutDashboard, etiket: 'Kontrol Paneli', renk: 'indigo' },
    ],
  },
  {
    baslik: 'Çalışma',
    ogeler: [
      { href: '/sinavlar', ikon: BookOpen, etiket: 'Sınavlarım', renk: 'sky' },
      { href: '/analiz', ikon: BarChart3, etiket: 'Analiz & Raporlar', renk: 'emerald' },
      { href: '/takvim', ikon: Calendar, etiket: 'Sınav Takvimi', renk: 'rose' },
      { href: '/study-plan', ikon: Map, etiket: 'Çalışma Planım', renk: 'green' },
    ],
  },
  {
    baslik: 'Topluluk',
    ogeler: [
      { href: '/duyurular', ikon: Bell, etiket: 'Duyurular', renk: 'yellow' },
      { href: '/destek', ikon: LifeBuoy, etiket: 'Destek Talebi', renk: 'teal' },
      { href: '/arkadaslar', ikon: Users, etiket: 'Arkadaşlar', renk: 'violet' },
      { href: '/duello', ikon: Swords, etiket: 'Düello', renk: 'red' },
    ],
  },
  {
    baslik: 'Hedef',
    ogeler: [
      { href: '/universite', ikon: GraduationCap, etiket: 'Üniversite Tercihi', yalnizca: ['YKS'], renk: 'purple' },
      { href: '/tercih-robotu', ikon: Sparkles, etiket: 'Tercih Robotu', yalnizca: ['YKS'], renk: 'fuchsia' },
    ],
  },
  {
    baslik: 'Satın Alma',
    ogeler: [
      { href: '/market', ikon: CreditCard, etiket: 'Paket Al', renk: 'blue' },
      { href: '/market/siparislerim', ikon: ShoppingBag, etiket: 'Siparişlerim', renk: 'amber' },
    ],
  },
];

export function navGruplari(tur: OgretimTuru): NavGrup[] {
  return TUM_NAV_GRUPLAR
    .map((grup) => ({
      ...grup,
      ogeler: grup.ogeler.filter((n) => !n.yalnizca || n.yalnizca.includes(tur)),
    }))
    .filter((grup) => grup.ogeler.length > 0);
}

export function navigasyonOgeleri(tur: OgretimTuru): NavOge[] {
  return navGruplari(tur).flatMap((g) => g.ogeler);
}

/**
 * Tailwind JIT'in renkli sınıfları sökmesi için tüm sınıfları string-literal olarak listele.
 * NAV_RENK_SINIFLARI[ikon-rozeti] aktif olmayan rozet, aktif aynı tonun koyu varyantı.
 */
export const NAV_RENK_SINIFLARI: Record<
  NavRenk,
  { rozet: string; rozetAktif: string; nokta: string }
> = {
  indigo: {
    rozet: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100',
    rozetAktif: 'bg-indigo-600 text-white ring-1 ring-indigo-600/20',
    nokta: 'bg-indigo-500',
  },
  amber: {
    rozet: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    rozetAktif: 'bg-amber-500 text-white ring-1 ring-amber-500/20',
    nokta: 'bg-amber-500',
  },
  sky: {
    rozet: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
    rozetAktif: 'bg-sky-500 text-white ring-1 ring-sky-500/20',
    nokta: 'bg-sky-500',
  },
  emerald: {
    rozet: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    rozetAktif: 'bg-emerald-500 text-white ring-1 ring-emerald-500/20',
    nokta: 'bg-emerald-500',
  },
  rose: {
    rozet: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
    rozetAktif: 'bg-rose-500 text-white ring-1 ring-rose-500/20',
    nokta: 'bg-rose-500',
  },
  yellow: {
    rozet: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100',
    rozetAktif: 'bg-yellow-500 text-white ring-1 ring-yellow-500/20',
    nokta: 'bg-yellow-500',
  },
  teal: {
    rozet: 'bg-teal-50 text-teal-600 ring-1 ring-teal-100',
    rozetAktif: 'bg-teal-500 text-white ring-1 ring-teal-500/20',
    nokta: 'bg-teal-500',
  },
  violet: {
    rozet: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100',
    rozetAktif: 'bg-violet-500 text-white ring-1 ring-violet-500/20',
    nokta: 'bg-violet-500',
  },
  red: {
    rozet: 'bg-red-50 text-red-600 ring-1 ring-red-100',
    rozetAktif: 'bg-red-500 text-white ring-1 ring-red-500/20',
    nokta: 'bg-red-500',
  },
  purple: {
    rozet: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100',
    rozetAktif: 'bg-purple-500 text-white ring-1 ring-purple-500/20',
    nokta: 'bg-purple-500',
  },
  fuchsia: {
    rozet: 'bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-100',
    rozetAktif: 'bg-fuchsia-500 text-white ring-1 ring-fuchsia-500/20',
    nokta: 'bg-fuchsia-500',
  },
  green: {
    rozet: 'bg-green-50 text-green-600 ring-1 ring-green-100',
    rozetAktif: 'bg-green-500 text-white ring-1 ring-green-500/20',
    nokta: 'bg-green-500',
  },
  blue: {
    rozet: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
    rozetAktif: 'bg-blue-500 text-white ring-1 ring-blue-500/20',
    nokta: 'bg-blue-500',
  },
};

export interface HizliLink {
  href: string;
  etiket: string;
  alt: string;
  color: string;
  bg: string;
}

export function hizliLinkler(tur: OgretimTuru): Array<HizliLink & { ikon: LucideIcon }> {
  const ortak = [
    { href: '/sinavlar', etiket: 'Sınavlarım', alt: 'Aktif sınavlar', ikon: BookOpen, color: '#4F46E5', bg: 'rgba(79, 70, 229, 0.1)' },
    { href: '/analiz', etiket: 'Analiz', alt: 'Zayıf konular', ikon: BarChart3, color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.1)' },
    { href: '/study-plan', etiket: 'Çalışma Planı', alt: 'Görev takibi', ikon: Map, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    { href: '/takvim', etiket: 'Takvim', alt: 'Tarihler', ikon: Calendar, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  ];
  if (tur === 'LGS' || kpssMi(tur)) {
    return [...ortak];
  }
  return [
    ...ortak,
    { href: '/universite', etiket: 'Tahmin Motoru', alt: 'Hedef belirle', ikon: GraduationCap, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  ];
}

export const KADEME_TEMA = {
  YKS: {
    accent: 'indigo',
    heroBg: 'bg-indigo-600',
    heroText: 'text-indigo-100',
    badge: 'bg-indigo-600',
    kartBorder: 'border-indigo-100',
    kartBg: 'from-indigo-50/90',
    etiket: 'YKS',
    panelAdi: 'YKS Paneli',
  },
  LGS: {
    accent: 'blue',
    heroBg: 'bg-blue-600',
    heroText: 'text-blue-100',
    badge: 'bg-blue-600',
    kartBorder: 'border-blue-100',
    kartBg: 'from-blue-50/90',
    etiket: 'LGS',
    panelAdi: 'LGS Paneli',
  },
  KPSS: {
    accent: 'teal',
    heroBg: 'bg-teal-600',
    heroText: 'text-teal-100',
    badge: 'bg-teal-600',
    kartBorder: 'border-teal-100',
    kartBg: 'from-teal-50/90',
    etiket: 'KPSS',
    panelAdi: 'KPSS Paneli',
  },
} as const;

export function kademeTemasi(tur: OgretimTuru) {
  if (kpssMi(tur)) return KADEME_TEMA.KPSS;
  return KADEME_TEMA[tur as 'YKS' | 'LGS'];
}

export const LGS_RESMI_TAKIP = {
  baslik: 'LGS kılavuzu & MEB',
  aciklama:
    'LGS başvuru, yerleştirme ve sınav takvimi için resmi kaynak MEB’dir. Güncel duyurular için meb.gov.tr adresini kullanın.',
  kilavuzUrl: 'https://www.meb.gov.tr/',
  kilavuzEtiket: 'MEB resmi sitesi',
  kurum: 'MEB',
  ikon: School,
};

export const YKS_RESMI_TAKIP = {
  baslik: 'YKS kılavuzu & ÖSYM',
  kilavuzUrl: 'https://www.osym.gov.tr/TR,33851/2026-yuksekogretim-kurumlari-sinavi-yks-kilavuzu.html',
  kilavuzEtiket: '2026 YKS kılavuzu',
  kurumUrl: 'https://www.osym.gov.tr/',
  kurum: 'ÖSYM',
  ikon: Compass,
};

export const KPSS_RESMI_TAKIP = {
  baslik: 'KPSS kılavuzu & ÖSYM',
  aciklama:
    'KPSS başvuru, sınav takvimi ve yerleştirme duyuruları için resmi kaynak ÖSYM’dir. Güncel duyurular için osym.gov.tr adresini kullanın.',
  kilavuzUrl: 'https://www.osym.gov.tr/',
  kilavuzEtiket: 'ÖSYM resmi sitesi',
  kurumUrl: 'https://www.osym.gov.tr/',
  kurum: 'ÖSYM',
  ikon: Compass,
};
