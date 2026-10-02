'use client';

import { SiteIcerikProvider } from '@/contexts/SiteIcerikContext';
import { LandingThemeProvider } from '@/contexts/LandingThemeContext';
import type { SiteGenelIcerik } from '@/lib/site-icerik-defaults';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSatisSerit } from '@/components/landing/LandingSatisSerit';
import { Ozellikler } from '@/components/landing/Ozellikler';
import { Istatistikler } from '@/components/landing/Istatistikler';
import { Paketler } from '@/components/landing/Paketler';
import { LandingNasil } from '@/components/landing/LandingNasil';
import { LandingBizimleCalisin } from '@/components/landing/LandingBizimleCalisin';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingThreeCta } from '@/components/landing/LandingThreeCta';

function LandingIcerikKpss() {
  return (
    <main className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-body">
      <LandingNav />
      <LandingHero />
      <div className="relative z-20 bg-white pt-2 sm:pt-4">
        <LandingSatisSerit />
        <Paketler />
        <Ozellikler />
        <LandingNasil />
        <Istatistikler />
        <LandingBizimleCalisin />
        <LandingThreeCta />
        <LandingFooter />
      </div>
    </main>
  );
}

/** KPSS ana sayfa — YKS ile aynı layout; indigo + amber tema */
export function LandingAnaSayfaKpss({ initialIcerik }: { initialIcerik?: SiteGenelIcerik }) {
  return (
    <SiteIcerikProvider initialIcerik={initialIcerik}>
      <LandingThemeProvider theme="kpss">
        <LandingIcerikKpss />
      </LandingThemeProvider>
    </SiteIcerikProvider>
  );
}
