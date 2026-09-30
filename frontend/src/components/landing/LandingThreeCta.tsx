'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { useKpssLanding } from '@/contexts/LandingThemeContext';

/** Aydınlık, net satış CTA */
export function LandingThreeCta() {
  const site = useSiteIcerik();
  const kpss = useKpssLanding();

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-20 bg-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-edu-line bg-gradient-to-br from-edu-mint via-white to-sky-50 px-8 py-12 md:px-14 md:py-14 text-center shadow-[0_20px_60px_-24px_rgba(13,148,136,0.25)] [box-shadow:0_20px_60px_-24px_color-mix(in_srgb,var(--wingo-600)_28%,transparent)]">
        <p className="font-display text-xs font-extrabold uppercase tracking-[0.18em] text-wingo-700 mb-3">
          Hemen başla
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          {kpss ? 'KPSS hazırlığına bugün başlayın' : site.altCta.baslik}
        </h2>
        <p className="text-slate-600 text-base max-w-xl mx-auto leading-relaxed mb-8">
          {kpss
            ? 'Ücretsiz dene, paketi seç, GY-GK analizini hemen gör. Memurluk hedefi için net bir yol.'
            : site.altCta.aciklama}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="#paketler"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-edu-cta hover:bg-edu-cta-hover px-8 py-3.5 text-sm font-bold text-white shadow-md w-full sm:w-auto"
            style={{ boxShadow: '0 10px 24px -8px color-mix(in srgb, var(--edu-cta) 40%, transparent)' }}
          >
            Paketleri incele
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/kayit"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-bold text-slate-800 hover:border-wingo-400 w-full sm:w-auto"
          >
            {site.altCta.kayitCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
