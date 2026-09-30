import type { ComponentProps } from 'react';
import type { Href } from 'expo-router';
import type { PlatformMode } from '../lib/config';

type Ion = ComponentProps<typeof import('@expo/vector-icons').Ionicons>['name'];

export type MenuOge = {
  href: Href;
  etiket: string;
  /** Kısa etiket (ikon grid) */
  kisa?: string;
  alt: string;
  icon: Ion;
  renk: string;
  sayacKey?: string;
  platform?: PlatformMode[];
  /** Alt tabda zaten var — ana sayfa kısayolunda gösterme */
  tabta?: boolean;
};

export type MenuGrup = {
  baslik: string;
  ogeler: MenuOge[];
};

/** Web öğrenci paneli menüleri (Kontrol Paneli hariç — zaten Ana Sayfa) */
export const OGRENCİ_MENU: MenuGrup[] = [
  {
    baslik: 'ÇALIŞMA',
    ogeler: [
      {
        href: '/(tabs)/sinavlar',
        etiket: 'Sınavlarım',
        kisa: 'Sınavlar',
        alt: 'Aktif denemeler',
        icon: 'document-text-outline',
        renk: '#0EA5E9',
        tabta: true,
      },
      {
        href: '/(tabs)/analiz',
        etiket: 'Analiz & Raporlar',
        kisa: 'Analiz',
        alt: 'Net ve konular',
        icon: 'stats-chart-outline',
        renk: '#10B981',
        tabta: true,
      },
      {
        href: '/takvim',
        etiket: 'Sınav Takvimi',
        kisa: 'Takvim',
        alt: 'Tarihler',
        icon: 'calendar-outline',
        renk: '#EF4444',
      },
      {
        href: '/calisma-plani',
        etiket: 'Çalışma Planım',
        kisa: 'Plan',
        alt: 'Görev takibi',
        icon: 'map-outline',
        renk: '#059669',
      },
    ],
  },
  {
    baslik: 'TOPLULUK',
    ogeler: [
      {
        href: '/duyurular',
        etiket: 'Duyurular',
        kisa: 'Duyuru',
        alt: 'Bildirimler',
        icon: 'notifications-outline',
        renk: '#D97706',
        sayacKey: 'duyurular',
      },
      {
        href: '/destek',
        etiket: 'Destek Talebi',
        kisa: 'Destek',
        alt: 'Yardım merkezi',
        icon: 'help-circle-outline',
        renk: '#0D9488',
        sayacKey: 'destek',
      },
      {
        href: '/arkadaslar',
        etiket: 'Arkadaşlar',
        kisa: 'Arkadaş',
        alt: 'Sosyal ağ',
        icon: 'people-outline',
        renk: '#7C3AED',
        sayacKey: 'arkadaslar',
      },
      {
        href: '/duello',
        etiket: 'Düello',
        kisa: 'Düello',
        alt: 'Rekabet',
        icon: 'flash-outline',
        renk: '#DC2626',
        sayacKey: 'duello',
      },
    ],
  },
  {
    baslik: 'HEDEF',
    ogeler: [
      {
        href: '/universite',
        etiket: 'Üniversite Tercihi',
        kisa: 'Üni.',
        alt: 'Hedef bölümler',
        icon: 'school-outline',
        renk: '#7C3AED',
        platform: ['yks_lgs'],
      },
      {
        href: '/tercih-robotu',
        etiket: 'Tercih Robotu',
        kisa: 'Robot',
        alt: 'Tahmin ve öneri',
        icon: 'color-wand-outline',
        renk: '#C026D3',
        platform: ['yks_lgs'],
      },
    ],
  },
];

export function menuGruplari(platform: PlatformMode): MenuGrup[] {
  return OGRENCİ_MENU.map((g) => ({
    ...g,
    ogeler: g.ogeler.filter((o) => !o.platform || o.platform.includes(platform)),
  })).filter((g) => g.ogeler.length > 0);
}

/** Ana sayfa kısayolları — tabda olanlar hariç; Plan öne alınır */
export function kisayolOgeleri(platform: PlatformMode): MenuOge[] {
  const liste = menuGruplari(platform)
    .flatMap((g) => g.ogeler)
    .filter((o) => !o.tabta);
  const plan = liste.filter((o) => String(o.href).includes('calisma-plani'));
  const diger = liste.filter((o) => !String(o.href).includes('calisma-plani'));
  return [...plan, ...diger];
}
