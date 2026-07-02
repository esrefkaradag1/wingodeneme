'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { Zap, Mail, Phone, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { siteLogoGorunum } from '@/lib/site-marka-logo';
import { OdemeGuvenRozetleri } from '@/components/landing/OdemeGuvenRozetleri';
import { footerLinkGruplari } from '@/lib/footer-sozlesmeler';
import { resolveMarketingNavHref } from '@/lib/publicPaketlerHref';

export function LandingFooter() {
  const site = useSiteIcerik();
  const { footerAciklama, copyrightMarka, eposta, telefon, adres } = site.footer;
  const gruplar = useMemo(() => footerLinkGruplari(site), [site]);
  const logoSt = siteLogoGorunum(site.marka);

  const iletisimSatirlari = [
    {
      icon: Mail,
      label: (eposta ?? '').trim(),
      href: (eposta ?? '').trim() ? `mailto:${(eposta ?? '').trim()}` : '',
    },
    {
      icon: Phone,
      label: (telefon ?? '').trim(),
      href: (telefon ?? '').trim() ? `tel:${(telefon ?? '').replace(/[\s()-]/g, '')}` : '',
    },
  ].filter((x) => x.label);

  return (
    <footer className="relative bg-[#0F2137] text-white overflow-hidden">
      {/* Wave top */}
      <div className="absolute top-0 left-0 right-0 -translate-y-px">
        <svg viewBox="0 0 1440 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
          <path d="M0 0C360 70 720 0 1080 50C1260 75 1440 30 1440 30V70H0V0Z" fill="#0F2137" />
        </svg>
      </div>

      {/* Background orbs */}
      <div className="absolute top-1/3 right-0 w-64 h-64 bg-[#2ABBA7]/4 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#7C6BFF]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 pb-14 border-b border-white/[0.06]">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
              {site.marka.logoUrl ? (
                <img
                  src={site.marka.logoUrl}
                  alt={site.marka.ad}
                  className={`${logoSt.className} brightness-0 invert`}
                  style={logoSt.style}
                />
              ) : (
                <>
                  <div className="w-11 h-11 bg-gradient-to-br from-[#2ABBA7] to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/25 group-hover:shadow-teal-600/40 transition-shadow duration-300">
                    <Zap className="w-5.5 h-5.5 text-white" />
                  </div>
                  <span className="text-white font-black text-xl">{site.marka.ad}</span>
                </>
              )}
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-7">
              {footerAciklama}
            </p>
            {/* Contact */}
            <div className="space-y-3.5">
              {iletisimSatirlari.map((c, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-3 text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-[#2ABBA7]/25 group-hover:bg-[#2ABBA7]/5 transition-all duration-300">
                    <c.icon className="w-4 h-4" />
                  </div>
                  {c.href ? (
                    <a href={c.href} className="hover:underline">
                      {c.label}
                    </a>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </motion.div>
              ))}
              {(adres ?? '').trim() ? (
                <div className="flex items-start gap-3 text-sm text-slate-400">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="whitespace-pre-line leading-relaxed">{(adres ?? '').trim()}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Link groups */}
          {gruplar.map((grup) => (
            <div key={grup.baslik}>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-7">
                {grup.baslik}
              </h3>
              <ul className="space-y-4">
                {grup.linkler.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={resolveMarketingNavHref(l.href, l.label)}
                      className="text-sm text-slate-400 hover:text-[#2ABBA7] transition-colors duration-200 flex items-center gap-2.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-[#2ABBA7]/30 group-hover:bg-[#2ABBA7] group-hover:scale-150 transition-all duration-200 shrink-0" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col items-center gap-5">
          <OdemeGuvenRozetleri koyu />

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-slate-500">
              Copyright &copy; {new Date().getFullYear()}{' '}
              <span className="text-slate-400 font-semibold">{copyrightMarka}</span>
              {' '}— Tum Haklarimiz Saklidir. | Tasarim ve Kodlama
            </p>
            <a
              href="https://lim10soft.com.tr/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity duration-300"
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
    </footer>
  );
}
