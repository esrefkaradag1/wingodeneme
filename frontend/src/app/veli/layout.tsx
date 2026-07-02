import type { Metadata } from 'next';
import { appNoIndexMetadata } from '@/lib/seo';
import { VeliLayout } from '@/components/layout/VeliLayout';

export const metadata: Metadata = appNoIndexMetadata('Veli Paneli');

export default function VeliRootLayout({ children }: { children: React.ReactNode }) {
  return <VeliLayout>{children}</VeliLayout>;
}
