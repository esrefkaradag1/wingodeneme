import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description:
      'Türkiye geneli online deneme: TYT, AYT, LGS ve YKS denemeleri.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070C1C',
    theme_color: '#2563eb',
    lang: 'tr',
    orientation: 'portrait',
    categories: ['education'],
  };
}
