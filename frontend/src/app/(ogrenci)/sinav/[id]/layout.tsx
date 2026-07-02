import type { Metadata } from 'next';
import { appNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = appNoIndexMetadata('Online Sınav');

export default function SinavLayout({ children }: { children: React.ReactNode }) {
  return children;
}
