import type { Metadata } from 'next';
import { appNoIndexMetadata } from '@/lib/seo';
import { PanelKabugu } from '@/components/layout/PanelKabugu';

export const metadata: Metadata = appNoIndexMetadata('Koç Paneli');

export default function KocRootLayout({ children }: { children: React.ReactNode }) {
  return <PanelKabugu kapsam="KOC">{children}</PanelKabugu>;
}
