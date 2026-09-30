'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Play,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { useKpssLanding } from '@/contexts/LandingThemeContext';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';

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

  const markaAd = kpss ? 'Wingo KPSS' : site.marka.ad;
  const baslikOnce = kpss ? 'Gerçek Bir' : h.baslikOnce;
  const baslikVurgu = kpss ? 'KPSS Deneyimi' : h.baslikVurgu;
  const baslikSon = kpss ? 'Yaşayın' : h.baslikSon;
  const altMetin = kpss
    ? 'ÖSYM tarzı GY-GK denemeleri, uzman içerik ve AI performans analizi ile memurluk yolculuğunu netleştirin.'
    : h.altMetin;
  const madde1 = kpss ? 'Gerçek süreli KPSS denemeleri' : h.madde1;
  const madde2 = kpss ? 'Konuya özel AI içerik' : h.madde2;

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

      <div className="relative z-10 pt-[72px]">
        <ContainerScroll
          titleComponent={
            <div className="px-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 shadow-sm mb-6">
                <div className="flex -space-x-2">
                  {(kpss
                    ? ['from-indigo-500 to-indigo-700', 'from-amber-400 to-amber-600', 'from-sky-400 to-sky-600']
                    : ['from-wingo-500 to-wingo-700', 'from-sky-400 to-sky-600', 'from-orange-400 to-orange-600']
                  ).map((c, i) => (
                    <span
                      key={i}
                      className={`h-7 w-7 rounded-full bg-gradient-to-br ${c} border-2 border-white text-[10px] font-bold text-white flex items-center justify-center`}
                    >
                      {(kpss ? ['G', 'K', 'A'] : ['A', 'M', 'Y'])[i]}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pr-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    4.97/5 · {kpss ? 'aday memnuniyeti' : 'öğrenci memnuniyeti'}
                  </span>
                </div>
              </div>

              <p className="font-display text-wingo-700 font-extrabold text-xs tracking-[0.2em] uppercase mb-3">
                {markaAd}
              </p>

              <h1 className="font-display text-3xl sm:text-5xl md:text-[3.5rem] font-extrabold text-slate-900 leading-[1.08] tracking-tight mb-4">
                {baslikOnce}{' '}
                <span className="text-wingo-600">{baslikVurgu}</span>
                {baslikSon ? <> {baslikSon}</> : null}
              </h1>

              <p className="mx-auto max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed mb-5">
                {altMetin}
              </p>

              <ul className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-7 text-sm font-medium text-slate-700">
                {[madde1, madde2].filter(Boolean).map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-wingo-600 shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>

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
          <div className="relative h-full w-full">
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
            {kpss ? (
              // Masaüstü orijinal PNG birebir; yeniden encode / downscale yok
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/landing-dashboard-preview-kpss.png"
                alt="Wingo KPSS aday paneli"
                decoding="async"
                fetchPriority="high"
                className="mx-auto block w-full h-auto object-contain object-top pt-10"
                draggable={false}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/landing-dashboard-preview.png"
                alt="Wingo Deneme öğrenci paneli"
                decoding="async"
                fetchPriority="high"
                className="mx-auto block w-full h-auto object-contain object-top pt-10"
                draggable={false}
              />
            )}
          </div>
        </ContainerScroll>

        <div className="relative z-20 mx-auto mt-6 mb-12 max-w-3xl px-4 md:mt-8 md:mb-16">
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
