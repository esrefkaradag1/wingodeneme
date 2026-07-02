import type { Metadata } from 'next';
import { kayitMetadata } from '@/lib/seo';

export const metadata: Metadata = kayitMetadata();

export default function KayitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
