import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'İletişim',
  description:
    'Wingo Deneme ile iletişime geçin. E-posta, telefon ve destek kanallarımız üzerinden bize ulaşabilirsiniz.',
  path: '/iletisim',
  keywords: ['iletişim', 'destek', 'wingo deneme iletişim'],
});

export default function IletisimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
