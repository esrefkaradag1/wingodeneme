import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'YKS Net Simülasyonu — TYT ve AYT Net Hesaplama',
  description:
    'TYT ve AYT net simülasyonu ile puan tahmini yapın. YKS deneme sonrası net hesaplama aracı, ücretsiz online.',
  path: '/rehber/net-simulasyonu',
  keywords: ['net simülasyonu', 'tyt net hesaplama', 'yks puan hesaplama', 'ayt net'],
});

export default function NetSimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
