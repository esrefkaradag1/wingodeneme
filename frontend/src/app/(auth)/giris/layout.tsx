import type { Metadata } from 'next';
import { girisMetadata } from '@/lib/seo';

export const metadata: Metadata = girisMetadata();

export default function GirisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
