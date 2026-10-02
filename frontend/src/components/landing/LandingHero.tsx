'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Play,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { useKpssLanding } from '@/contexts/LandingThemeContext';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { LandingSlider, useLandingSlaytlari } from '@/components/landing/LandingSlider';

const HIZLI_ERISIM_YKS = [
  { href: '#paketler', label: 'TYT paketleri', ikon: BookOpen },
  { href: '#paketler', label: 'AYT paketleri', ikon: Zap },
  { href: '#paketler', label: 'LGS paketleri', ikon: BarChart3 },
  { href: '/kayit', label: 'Ücretsiz dene', ikon: ShieldCheck },
];

const HIZLI_ERISIM_KPSS = [
  { href: '#paketler', label: 'GY paketleri', ikon: BookOpen },
  { href: '#paketler', label: 'GK paketleri', ikon: Briefcase },
  { href: '#paketler', label: 'KPSS Lisans', ikon: BarChart3 },
  { href: '/kayit', label: 'Ücretsiz dene', ikon: ShieldCheck },
];

/** Aceternity ContainerScroll + Wingo içerik / dashboard */
export function LandingHero() {
  const site = useSiteIcerik();
  const kpss = useKpssLanding();
  const h = site.hero;
  const hizliErisim = kpss ? HIZLI_ERISIM_KPSS : HIZLI_ERISIM_YKS;

  const baslikOnce = kpss ? 'Gerçek Bir' : h.baslikOnce;
  const baslikVurgu = kpss ? 'KPSS Deneyimi' : h.baslikVurgu;
  const baslikSon = kpss ? 'Yaşayın' : h.baslikSon;
  const altMetin = kpss
    ? 'ÖSYM tarzı GY-GK denemeleri ve AI performans analizi tek platformda.'
    : 'ÖSYM/MEB tarzı kitapçık, uzman sorular ve yapay zeka analizi tek platformda.';
  const sliderVar = useLandingSlaytlari().length > 0;

  return (
    <section className="relative overflow-hidden bg-[#F4FBFF]" style={{ background: 'var(--landing-hero-mid)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -10%, #FFFFFF 0%, transparent 55%),
              radial-gradient(ellipse 40% 30% at 15% 40%, var(--landing-hero-a), transparent 60%),
              radial-gradient(ellipse 45% 35% at 85% 30%, var(--landing-hero-b), transparent 55%),
              linear-gradient(180deg, var(--landing-hero-base) 0%, var(--landing-hero-mid) 45%, #FFFFFF 100%)
            `,
          }}
        />
      </div>

      <div className="relative z-10 pt-32">
        <ContainerScroll
          titleComponent={
            <div className="px-4">
              <h1 className="font-display text-3xl sm:text-5xl md:text-[3.25rem] font-extrabold text-slate-900 leading-[1.08] tracking-tight mb-3">
                {baslikOnce}{' '}
                <span className="text-wingo-600">{baslikVurgu}</span>
                {baslikSon ? <> {baslikSon}</> : null}
              </h1>

              <p className="mx-auto max-w-3xl text-balance text-base text-slate-600 leading-snug mb-5">
                {altMetin}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-2">
                <Link
                  href="#paketler"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-edu-cta hover:bg-edu-cta-hover px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[0_10px_28px_-8px_var(--edu-cta)] transition-all hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  Paketleri gör & satın al
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={h.birincilCtaHref || '/kayit'}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 hover:border-wingo-400 hover:text-wingo-700 transition-all w-full sm:w-auto shadow-sm"
                >
                  <Play className="h-3.5 w-3.5 fill-wingo-600 text-wingo-600" />
                  {h.birincilCta || 'Ücretsiz başla'}
                </Link>
              </div>
            </div>
          }
        >
          <div className="relative h-full w-full bg-white">
            {sliderVar ? null : (
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2.5 bg-white/95 border-b border-slate-100 backdrop-blur-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <div className="ml-2 flex-1 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center px-3">
                  <span className="text-[10px] font-semibold text-slate-500 truncate">
                    {kpss ? 'app.wingodeneme.com/kpss/dashboard' : 'app.wingodeneme.com/dashboard'}
                  </span>
                </div>
              </div>
            )}
            <LandingSlider
              fallbackSrc={kpss ? '/landing-dashboard-preview-kpss.png' : '/landing-dashboard-preview.png'}
              fallbackAlt={kpss ? 'Wingo KPSS aday paneli' : 'Wingo Deneme öğrenci paneli'}
            />
          </div>
        </ContainerScroll>

        <div className="relative z-20 mx-auto mt-5 mb-6 max-w-3xl px-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {hizliErisim.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-3 text-left shadow-sm hover:border-wingo-400 hover:shadow-md transition-all"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wingo-50 text-wingo-700 group-hover:bg-wingo-100">
                  <item.ikon className="h-4 w-4" />
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
