import type { Metadata } from 'next';
import { appNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = appNoIndexMetadata('Profilim');

export default function ProfilLayout({ children }: { children: React.ReactNode }) {
  return children;
}
