'use client';

import { SiteIcerikProvider } from '@/contexts/SiteIcerikContext';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

/** Landing ile aynı üst/alt şerit: paket detay, market vb. genel pazarlama sayfaları */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <SiteIcerikProvider>
      <div className="min-h-screen bg-[#050816] text-white selection:bg-indigo-500/40 flex flex-col">
        <div
          className="fixed inset-0 pointer-events-none bg-gradient-to-b from-indigo-950/40 via-transparent to-slate-950/80 z-0"
          aria-hidden
        />
        <LandingNav />
        <div className="relative z-10 flex-1 flex flex-col w-full min-w-0 pt-16 md:pt-[4.25rem]">
          {children}
        </div>
        <LandingFooter />
      </div>
    </SiteIcerikProvider>
  );
}
