'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Menu, X, Zap, ArrowLeftRight } from 'lucide-react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { AnimatePresence, motion } from 'framer-motion';
import { siteLogoGorunum } from '@/lib/site-marka-logo';
import {
  resolveMarketingNavHref,
  navLinkNormalize,
  isMarketingNavActive,
} from '@/lib/publicPaketlerHref';
import { useAuthStore } from '@/store/auth.store';
import { isKpssMode } from '@/lib/platform';
import { LandingKullaniciMenu } from '@/components/landing/LandingKullaniciMenu';

const AKTIF =
  'shrink-0 whitespace-nowrap rounded-full px-2.5 lg:px-3.5 py-1.5 text-[13px] lg:text-sm font-semibold text-wingo-700 bg-wingo-50';
const PASIF =
  'shrink-0 whitespace-nowrap rounded-full px-2.5 lg:px-3.5 py-1.5 text-[13px] lg:text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors';
const MOBIL_AKTIF = 'rounded-2xl px-4 py-3 font-semibold text-wingo-700 bg-wingo-50';
const MOBIL_PASIF = 'rounded-2xl px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50';

/** Yüzen kapsül navbar — SaaSly / ThreeUI landing uyumlu */
export function LandingNav() {
  const pathname = usePathname();
  const [mobilMenu, setMobilMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const site = useSiteIcerik();
  const token = useAuthStore((s) => s.token);
  const kullanici = useAuthStore((s) => s.kullanici);
  const oturumAcik = Boolean(mounted && token && kullanici);
  const kpssModu = mounted && isKpssMode();

  const platformDegistir = () => {
    if (typeof window === 'undefined') return;
    const { protocol, hostname, pathname: p, search } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      window.location.href = `${protocol}//${hostname}:${kpssModu ? '3001' : '3002'}${p}${search}`;
      return;
    }
    const apex = hostname.replace(/^www\./, '').replace(/^kpss\./, '');
    window.location.href = `${protocol}//${kpssModu ? apex : `kpss.${apex}`}${p}${search}`;
  };

  const navLinks = useMemo(() => {
    const base = site.nav.navLinks
      .filter(
        (l) =>
          !String(l.href || '').includes('/rehber') &&
          String(l.label || '').toLowerCase() !== 'rehber'
      )
      .map(navLinkNormalize);

    const hasOgretmen = base.some((l) => {
      const lab = String(l.label || '').toLocaleLowerCase('tr-TR');
      const href = String(l.href || '');
      return lab.includes('öğretmen') || lab.includes('ogretmen') || href.includes('bizimle-calisin');
    });

    if (hasOgretmen) return base;
    return [...base, { href: '/#bizimle-calisin', label: 'Öğretmen başvurusu' }];
  }, [site.nav.navLinks]);

  const anaSayfaAktif = pathname === '/';

  const logoSt = siteLogoGorunum({
    ...site.marka,
    logoYukseklikPx: Math.max(site.marka.logoYukseklikPx ?? 36, 34),
    logoMaxGenislikPx: Math.min(site.marka.logoMaxGenislikPx ?? 160, 160),
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = mobilMenu ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobilMenu]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 lg:px-6 pt-4 sm:pt-5 pointer-events-none">
      <div className="mx-auto max-w-[1440px] pointer-events-auto">
        <div className="flex h-[58px] sm:h-[62px] items-center justify-between gap-3 lg:gap-5 rounded-full border border-white/90 bg-white/90 px-3 sm:px-5 lg:px-7 shadow-[0_10px_40px_rgba(15,47,43,0.10)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2 shrink-0 pl-1 max-w-[140px] lg:max-w-[180px]">
            {site.marka.logoUrl ? (
              <img src={site.marka.logoUrl} alt={site.marka.ad} className={logoSt.className} style={logoSt.style} />
            ) : (
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-wingo-600 text-white">
                  <Zap className="h-4 w-4" />
                </span>
                <span className="font-display text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                  {site.marka.ad}
                </span>
              </>
            )}
          </Link>

          <nav className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-1.5 min-w-0" aria-label="Ana menü">
            <Link
              href="/"
              className={anaSayfaAktif ? AKTIF : PASIF}
              aria-current={anaSayfaAktif ? 'page' : undefined}
            >
              Ana Sayfa
            </Link>
            {navLinks.map((l) => {
              const href = resolveMarketingNavHref(l.href, l.label);
              const aktif = isMarketingNavActive(pathname, l.href, l.label);
              return (
                <Link
                  key={l.href + l.label}
                  href={href}
                  className={aktif ? AKTIF : PASIF}
                  aria-current={aktif ? 'page' : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
            {mounted && (
              <div
                className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 p-0.5"
                role="group"
                aria-label="Platform seçimi"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (kpssModu) platformDegistir();
                  }}
                  className={
                    !kpssModu
                      ? 'rounded-full bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-wingo-700 shadow-sm'
                      : 'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-400 hover:text-slate-600'
                  }
                  aria-pressed={!kpssModu}
                  title="Yks-Lgs platformu"
                >
                  Yks-Lgs
                </button>
                <ArrowLeftRight className="mx-0.5 h-3 w-3 shrink-0 text-slate-300" aria-hidden />
                <button
                  type="button"
                  onClick={() => {
                    if (!kpssModu) platformDegistir();
                  }}
                  className={
                    kpssModu
                      ? 'rounded-full bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-wingo-700 shadow-sm'
                      : 'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-400 hover:text-slate-600'
                  }
                  aria-pressed={kpssModu}
                  title="Kpss platformu"
                >
                  Kpss
                </button>
              </div>
            )}
            {oturumAcik ? (
              <LandingKullaniciMenu />
            ) : (
              <>
                <Link href="/giris" className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold text-slate-700">
                  {site.nav.girisMetni}
                </Link>
                <Link
                  href="/kayit"
                  className="shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
                >
                  {site.nav.kayitCta}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full text-slate-800 hover:bg-slate-100"
            onClick={() => setMobilMenu((v) => !v)}
            aria-label={mobilMenu ? 'Menüyü kapat' : 'Menüyü aç'}
          >
            {mobilMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobilMenu && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2 overflow-hidden rounded-3xl border border-white bg-white shadow-xl lg:hidden"
            >
              <div className="flex flex-col gap-0.5 p-3">
                <Link
                  href="/"
                  onClick={() => setMobilMenu(false)}
                  className={anaSayfaAktif ? MOBIL_AKTIF : MOBIL_PASIF}
                  aria-current={anaSayfaAktif ? 'page' : undefined}
                >
                  Ana Sayfa
                </Link>
                {navLinks.map((l) => {
                  const href = resolveMarketingNavHref(l.href, l.label);
                  const aktif = isMarketingNavActive(pathname, l.href, l.label);
                  return (
                    <Link
                      key={l.href + l.label}
                      href={href}
                      onClick={() => setMobilMenu(false)}
                      className={aktif ? MOBIL_AKTIF : MOBIL_PASIF}
                      aria-current={aktif ? 'page' : undefined}
                    >
                      {l.label}
                    </Link>
                  );
                })}
                <div className="h-px bg-slate-100 my-1" />
                {mounted && (
                  <div className="px-1 py-1">
                    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Platform
                    </p>
                    <div
                      className="mx-1 inline-flex w-[calc(100%-0.5rem)] items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-1"
                      role="group"
                      aria-label="Platform seçimi"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (kpssModu) platformDegistir();
                        }}
                        className={
                          !kpssModu
                            ? 'flex-1 rounded-xl bg-white py-2.5 text-sm font-bold text-wingo-700 shadow-sm'
                            : 'flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-400'
                        }
                        aria-pressed={!kpssModu}
                      >
                        Yks-Lgs
                      </button>
                      <ArrowLeftRight className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
                      <button
                        type="button"
                        onClick={() => {
                          if (!kpssModu) platformDegistir();
                          setMobilMenu(false);
                        }}
                        className={
                          kpssModu
                            ? 'flex-1 rounded-xl bg-white py-2.5 text-sm font-bold text-wingo-700 shadow-sm'
                            : 'flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-400'
                        }
                        aria-pressed={kpssModu}
                      >
                        Kpss
                      </button>
                    </div>
                  </div>
                )}
                <div className="h-px bg-slate-100 my-1" />
                {oturumAcik ? (
                  <LandingKullaniciMenu mobil onNavigate={() => setMobilMenu(false)} />
                ) : (
                  <>
                    <Link href="/giris" onClick={() => setMobilMenu(false)} className="rounded-2xl px-4 py-3 font-semibold text-slate-700">
                      {site.nav.girisMetni}
                    </Link>
                    <Link href="/kayit" onClick={() => setMobilMenu(false)} className="rounded-full bg-slate-900 py-3.5 text-center font-bold text-white">
                      {site.nav.kayitCta}
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
