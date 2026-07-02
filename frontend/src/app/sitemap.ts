import type { MetadataRoute } from 'next';
import { PUBLIC_SITEMAP_PATHS, siteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return PUBLIC_SITEMAP_PATHS.map((entry) => ({
    url: `${base}${entry.path === '/' ? '' : entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
