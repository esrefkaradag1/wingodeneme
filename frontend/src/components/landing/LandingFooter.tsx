'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { Zap, Mail, Phone, MapPin } from 'lucide-react';
import { siteLogoGorunum } from '@/lib/site-marka-logo';
import { OdemeGuvenRozetleri } from '@/components/landing/OdemeGuvenRozetleri';
import { footerLinkGruplari } from '@/lib/footer-sozlesmeler';
import { resolveMarketingNavHref } from '@/lib/publicPaketlerHref';
import {
  FooterBackgroundGradient,
  TextHoverEffect,
} from '@/components/ui/hover-footer';
import { useKpssLanding } from '@/contexts/LandingThemeContext';

export function LandingFooter() {
  const site = useSiteIcerik();
  const kpss = useKpssLanding();
  const { footerAciklama, copyrightMarka, eposta, telefon, adres } = site.footer;
  const gruplar = useMemo(() => footerLinkGruplari(site), [site]);
  const logoSt = siteLogoGorunum(site.marka);

  const hoverText = kpss ? 'WINGOKPSS' : 'WINGODENEME';
  const accent = 'var(--landing-brand-stroke, #14B8A6)';

  const contactInfo = [
    {
      icon: Mail,
      text: (eposta ?? '').trim(),
      href: (eposta ?? '').trim() ? `mailto:${(eposta ?? '').trim()}` : '',
    },
    {
      icon: Phone,
      text: (telefon ?? '').trim(),
      href: (telefon ?? '').trim()
        ? `tel:${(telefon ?? '').replace(/[\s()-]/g, '')}`
        : '',
    },
  ].filter((x) => x.text);

  return (
    <div className="bg-white px-3 sm:px-6 pb-6 pt-2">
      <footer className="relative h-fit rounded-3xl overflow-hidden bg-surface-darkest text-white/70 border border-white/5 shadow-[0_24px_80px_-24px_rgba(15,47,43,0.45)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 pt-12 sm:pt-14 pb-6 z-40 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12">
            {/* Brand + contact */}
            <div className="lg:col-span-4 flex flex-col space-y-5">
              <Link href="/" className="inline-flex items-center gap-2.5 group w-fit">
                {site.marka.logoUrl ? (
                  <img
                    src={site.marka.logoUrl}
                    alt={site.marka.ad}
                    className={`${logoSt.className} brightness-0 invert`}
                    style={logoSt.style}
                  />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wingo-500 to-wingo-700 flex items-center justify-center shadow-lg shadow-wingo-600/25">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-display text-white text-2xl font-extrabold tracking-tight">
                      {site.marka.ad}
                    </span>
                  </>
                )}
              </Link>
              <p className="text-sm leading-relaxed text-white/55 max-w-sm">{footerAciklama}</p>

              <ul className="space-y-3.5 pt-1">
                {contactInfo.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <item.icon size={18} className="shrink-0 mt-0.5" style={{ color: accent }} />
                    {item.href ? (
                      <a href={item.href} className="hover:text-[#2DD4BF] transition-colors break-all">
                        {item.text}
                      </a>
                    ) : (
                      <span>{item.text}</span>
                    )}
                  </li>
                ))}
                {(adres ?? '').trim() ? (
                  <li className="flex items-start gap-3 text-sm">
                    <MapPin size={18} className="shrink-0 mt-0.5" style={{ color: accent }} />
                    <span className="whitespace-pre-line leading-relaxed text-white/55">
                      {(adres ?? '').trim()}
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>

            {/* Link groups */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
              {gruplar.map((section) => (
                <div key={section.baslik}>
                  <h4 className="font-display text-white text-sm font-extrabold uppercase tracking-wider mb-5">
                    {section.baslik}
                  </h4>
                  <ul className="space-y-3">
                    {section.linkler.map((link) => (
                      <li key={link.href + link.label}>
                        <Link
                          href={resolveMarketingNavHref(link.href, link.label)}
                          className="text-sm text-white/55 hover:text-[#2DD4BF] transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-t border-white/10 my-2" />

          <div className="flex flex-col items-center gap-5 py-8 relative z-40">
            <OdemeGuvenRozetleri koyu />

            <div className="flex flex-col items-center gap-3 text-center relative z-40">
              <p className="text-sm text-white/40">
                &copy; {new Date().getFullYear()}{' '}
                <span className="text-white/60 font-semibold">
                  {kpss ? 'Wingo KPSS' : copyrightMarka}
                </span>
                {' '}— Tüm Haklarımız Saklıdır. | Tasarım ve Kodlama
              </p>
              <a
                href="https://lim10soft.com.tr/"
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-40 opacity-70 hover:opacity-100 transition-opacity duration-300"
              >
                <img
                  src="https://lim10soft.com.tr/assets/imgs/lim10soft/lim10soft-footer-logo-white.png"
                  alt="Lim10 Soft"
                  className="h-7 w-auto"
                />
              </a>
            </div>
          </div>
        </div>

        {/* Büyük marka yazısı — kenardan kenara, lim10soft altında */}
        <div className="lg:flex hidden h-[18rem] xl:h-[22rem] relative z-0 pointer-events-none w-full px-0 mt-1 mb-0 overflow-hidden">
          <TextHoverEffect text={hoverText} fullBleed className="z-0 w-full h-full" />
        </div>

        <FooterBackgroundGradient />
      </footer>
    </div>
  );
}
