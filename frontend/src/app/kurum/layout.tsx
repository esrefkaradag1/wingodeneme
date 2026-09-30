import type { Metadata } from 'next';
import { appNoIndexMetadata } from '@/lib/seo';
import { KurumLayoutIstemci } from './KurumLayoutIstemci';

export const metadata: Metadata = appNoIndexMetadata('Kurum Paneli');

export default function KurumRootLayout({ children }: { children: React.ReactNode }) {
  return <KurumLayoutIstemci>{children}</KurumLayoutIstemci>;
}
