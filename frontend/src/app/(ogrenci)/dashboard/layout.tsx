import type { Metadata } from 'next';
import { appNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = appNoIndexMetadata('Öğrenci Paneli');

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
