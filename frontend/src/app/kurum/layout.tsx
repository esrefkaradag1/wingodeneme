import type { Metadata } from 'next';
import { appNoIndexMetadata } from '@/lib/seo';
import { PanelKabugu } from '@/components/layout/PanelKabugu';

export const metadata: Metadata = appNoIndexMetadata('Kurum Paneli');

export default function KurumRootLayout({ children }: { children: React.ReactNode }) {
  return <PanelKabugu kapsam="KURUM">{children}</PanelKabugu>;
}
