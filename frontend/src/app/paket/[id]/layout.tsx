import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Deneme Paketi Detayı',
  description:
    'YKS ve LGS online deneme paketi: sınav sayısı, fiyat ve özellikler. Hemen satın alın, Türkiye geneli denemelere katılın.',
  path: '/paketler',
  keywords: ['deneme paketi', 'online deneme paketi'],
});

export default function PaketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
