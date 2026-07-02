import type { Metadata } from 'next';
import { rehberHubMetadata } from '@/lib/seo';

export const metadata: Metadata = rehberHubMetadata();

export default function RehberLayout({ children }: { children: React.ReactNode }) {
  return children;
}
