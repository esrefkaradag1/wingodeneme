'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Search, User, Zap, ArrowLeftRight } from 'lucide-react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { motion, AnimatePresence } from 'framer-motion';
import { siteLogoGorunum } from '@/lib/site-marka-logo';
import { resolveMarketingNavHref, navLinkNormalize } from '@/lib/publicPaketlerHref';
import { useAuthStore } from '@/store/auth.store';
import { isKpssMode } from '@/lib/platform';
import { LandingKullaniciMenu } from '@/components/landing/LandingKullaniciMenu';

const navLinkVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function LandingNav() {
  const [mobilMenu, setMobilMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const site = useSiteIcerik();
  const token = useAuthStore((s) => s.token);
  const kullanici = useAuthStore((s) => s.kullanici);
  const oturumAcik = Boolean(mounted && token && kullanici);
  const kpssModu = mounted && isKpssMode();

  const platformDegistir = () => {
    if (typeof window === 'undefined') return;
    const { protocol, hostname, pathname, search } = window.location;

    // Yerel geliştirme ortamı (port bazlı geçiş)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const yeniPort = kpssModu ? '3001' : '3002';
      window.location.href = `${protocol}//${hostname}:${yeniPort}${pathname}${search}`;
      return;
    }

    // Üretim ortamı: YKS → apex (wingodeneme.com), KPSS → kpss.apex (kpss.wingodeneme.com)
    const apex = hostname.replace(/^www\./, '').replace(/^kpss\./, '');
    const yeniHost = kpssModu ? apex : `kpss.${apex}`;
    window.location.href = `${protocol}//${yeniHost}${pathname}${search}`;
  };

  const navLinks = site.nav.navLinks
    .filter(
      (l) => !String(l.href || '').includes('/rehber') && String(l.label || '').toLowerCase() !== 'rehber'
    )
    .map(navLinkNormalize);
  const logoSt = siteLogoGorunum(site.marka);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobilMenu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobilMenu]);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#070C1C]/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_40px_rgba(0,0,0,0.3)]'
          : 'bg-transparent'
      }`}
    >
      {/* Animated bottom line on scroll */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-px transition-all duration-500 ${
          scrolled
            ? 'bg-gradient-to-r from-transparent via-[#2ABBA7]/40 to-transparent'
            : 'bg-transparent'
        }`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[76px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          {site.marka.logoUrl ? (
            <img
              src={site.marka.logoUrl}
              alt={site.marka.ad}
              className={logoSt.className}
              style={logoSt.style}
            />
          ) : (
            <>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C6BFF] to-[#2ABBA7] flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow duration-300">
                <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Zap className="w-5 h-5 text-white relative z-10" />
              </div>
              <span className="text-white font-black text-xl tracking-tight">{site.marka.ad}</span>
            </>
          )}
        </Link>

        {/* Desktop nav pills */}
        <div className="hidden lg:flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-1.5 py-1 backdrop-blur-md">
          {navLinks.map((l) => (
            <Link
              key={l.href + l.label}
              href={resolveMarketingNavHref(l.href, l.label)}
              className="relative px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-all duration-200 hover:bg-white/[0.06]"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right actions */}
        <div className="hidden lg:flex items-center gap-2.5">
          {mounted && (
            <button
              type="button"
              onClick={platformDegistir}
              title={kpssModu ? 'WingoSınav (YKS/LGS) tarafına geç' : 'WingoKPSS tarafına geç'}
              className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all duration-300 ${
                kpssModu
                  ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-400/50'
                  : 'border-teal-400/30 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20 hover:border-teal-400/50'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
              {kpssModu ? 'WingoYKS' : 'WingoKPSS'}
            </button>
          )}
          <button
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
            aria-label="Ara"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
          {oturumAcik ? (
            <LandingKullaniciMenu />
          ) : (
            <>
              <Link
                href="/giris"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                <User className="w-4 h-4" />
                {site.nav.girisMetni}
              </Link>
              <Link
                href="/kayit"
                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C6BFF] via-[#6B5CE7] to-[#2ABBA7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-px transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10">{site.nav.kayitCta}</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="lg:hidden relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:bg-white/[0.06] transition-colors"
          onClick={() => setMobilMenu((v) => !v)}
          aria-label={mobilMenu ? 'Menüyü kapat' : 'Menüyü aç'}
        >
          <AnimatePresence mode="wait">
            {mobilMenu ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobilMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobilMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full left-4 right-4 lg:hidden mt-2 rounded-2xl bg-[#0A1024]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="px-2 py-3 flex flex-col gap-0.5">
                {navLinks.map((l, i) => (
                  <motion.div
                    key={l.href + l.label}
                    variants={navLinkVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                  >
                    <Link
                      href={resolveMarketingNavHref(l.href, l.label)}
                      onClick={() => setMobilMenu(false)}
                      className="block px-4 py-3 rounded-xl text-slate-300 font-semibold hover:bg-white/[0.06] hover:text-white transition-all"
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="h-px bg-white/[0.06] my-2 mx-4" />
                {mounted && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobilMenu(false);
                      platformDegistir();
                    }}
                    className={`mx-2 mb-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold transition-all ${
                      kpssModu
                        ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20'
                        : 'border-teal-400/30 bg-teal-500/10 text-teal-200 hover:bg-teal-500/20'
                    }`}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    {kpssModu ? 'WingoYKS tarafına geç' : 'WingoKPSS tarafına geç'}
                  </button>
                )}
                {oturumAcik ? (
                  <LandingKullaniciMenu mobil onNavigate={() => setMobilMenu(false)} />
                ) : (
                  <>
                    <Link
                      href="/giris"
                      onClick={() => setMobilMenu(false)}
                      className="block mx-2 px-4 py-3 rounded-xl text-slate-300 font-semibold hover:bg-white/[0.06] transition-all"
                    >
                      {site.nav.girisMetni}
                    </Link>
                    <Link
                      href="/kayit"
                      onClick={() => setMobilMenu(false)}
                      className="block mx-2 mt-1 text-center rounded-xl bg-gradient-to-r from-[#7C6BFF] to-[#2ABBA7] py-3.5 font-bold text-white shadow-lg shadow-indigo-500/20"
                    >
                      {site.nav.kayitCta}
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
