import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Deneme Paketleri',
  description:
    'YKS, LGS ve KPSS online deneme paketleri. Paketleri inceleyin, sınav takviminden deneme seçerek satın alın.',
  path: '/paketler',
  keywords: ['deneme paketi', 'online deneme paketi', 'yks deneme paketi', 'lgs deneme paketi'],
});

export default function PaketlerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
