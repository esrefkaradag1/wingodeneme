import type { Metadata } from 'next';
import { appNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = appNoIndexMetadata('Sınavlarım');

export default function SinavlarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
