import type { Metadata } from 'next';
import { LandingAnaSayfa } from '@/components/landing/LandingAnaSayfa';
import { SeoAnaSayfaEk } from '@/components/seo/SeoAnaSayfaEk';
import { anaSayfaMetadata } from '@/lib/seo';

export const metadata: Metadata = anaSayfaMetadata();

export default function Home() {
  return (
    <>
      <LandingAnaSayfa />
      <SeoAnaSayfaEk />
    </>
  );
}
