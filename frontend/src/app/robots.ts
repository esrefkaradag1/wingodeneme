import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/panel/',
          '/admin/',
          '/api/',
          '/dashboard',
          '/sinav/',
          '/analiz',
          '/arkadaslar',
          '/duello',
          '/destek',
          '/study-plan',
          '/takvim',
          '/tercih-robotu',
          '/universite',
          '/duyurular',
          '/veli/',
          '/market/odeme-',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
