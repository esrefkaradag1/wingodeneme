import type { Metadata } from 'next';
import { marketMetadata } from '@/lib/seo';

export const metadata: Metadata = marketMetadata();

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
