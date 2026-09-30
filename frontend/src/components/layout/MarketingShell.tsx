'use client';

import { SiteIcerikProvider } from '@/contexts/SiteIcerikContext';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

/** Landing ile aynı üst/alt şerit: paket detay, market vb. genel pazarlama sayfaları */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <SiteIcerikProvider>
      <div className="min-h-screen bg-edu-bg text-edu-ink selection:bg-wingo-200/60 flex flex-col font-body">
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(circle at 8% 0%, rgba(13, 148, 136, 0.07) 0, transparent 28%), radial-gradient(circle at 96% 4%, rgba(234, 88, 12, 0.05) 0, transparent 26%)',
          }}
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
