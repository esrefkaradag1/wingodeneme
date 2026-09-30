'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  FileUp,
  GraduationCap,
  Shapes,
  Wallet,
} from 'lucide-react';
import { useKpssLanding } from '@/contexts/LandingThemeContext';

const AVANTAJLAR = [
  {
    ikon: Wallet,
    baslik: 'Soru başına ödeme',
    metin: 'Ücret talebinizi siz belirlersiniz; onaylanan her soru için ödeme alırsınız.',
  },
  {
    ikon: GraduationCap,
    baslik: 'Kendi branşınız',
    metin: 'Yalnızca uzman olduğunuz kademe ve branşlarda soru hazırlarsınız.',
  },
  {
    ikon: FileUp,
    baslik: 'Tekli veya toplu ithal',
    metin: 'Panelden kendi ürettiğiniz soruları tek tek veya toplu olarak sisteme aktarabilirsiniz.',
  },
  {
    ikon: Shapes,
    baslik: 'Şekil içeren sorular',
    metin: 'Geometri, fizik gibi branşlarda hazır şekil/görsellerinizi soruyla birlikte ekleyebilirsiniz.',
  },
];

/** @deprecated kpssModu prop — LandingThemeContext kullanın */
type Props = {
  kpssModu?: boolean;
};

export function LandingBizimleCalisin({ kpssModu: kpssProp }: Props = {}) {
  const kpssTheme = useKpssLanding();
  const kpss = kpssProp ?? kpssTheme;

  return (
    <section
      id="bizimle-calisin"
      className="relative scroll-mt-24 overflow-hidden px-4 py-20 sm:px-6 md:py-28 lg:px-8 bg-[#F7FAFC]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-wingo-300/15 blur-[100px]" />
        <div
          className="absolute -right-16 bottom-0 h-80 w-80 rounded-full blur-[110px]"
          style={{ backgroundColor: 'color-mix(in srgb, var(--edu-cta) 12%, transparent)' }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 sm:p-10 lg:p-12 shadow-[0_20px_60px_-28px_rgba(15,47,43,0.18)]">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-5"
            >
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-wingo-100 bg-wingo-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-wingo-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                {kpss ? 'KPSS soru yazarı' : 'Soru yazarı'}
              </span>

              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Alanınızda uzmanlık <span className="text-wingo-600">kazanca</span> dönüşsün
              </h2>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 md:text-[15px]">
                {kpss
                  ? 'GY-GK ve alan bilgisi sorularınızı tekli veya toplu ithal edin. Acil KPSS ihtiyaçlarında hız kazanın.'
                  : 'Kendi ürettiğiniz soruları tekli veya toplu ithal edin; geometri ve fizikteki şekilli sorularınızı da sisteme taşıyın. Acil sınav ihtiyaçlarında hız kazanın.'}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/bizimle-calisin"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-edu-cta hover:bg-edu-cta-hover px-7 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:-translate-y-0.5 sm:w-auto"
                  style={{
                    boxShadow: '0 10px 24px -8px color-mix(in srgb, var(--edu-cta) 40%, transparent)',
                  }}
                >
                  Başvuru yap
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="text-center text-xs text-slate-500 sm:text-left">
                  Ücretsiz · Birkaç dakikada tamamlanır
                </p>
              </div>
            </motion.div>

            <div className="lg:col-span-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {AVANTAJLAR.map((a, i) => (
                  <motion.div
                    key={a.baslik}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{
                      duration: 0.4,
                      delay: 0.06 + i * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:border-wingo-200"
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-wingo-700 shadow-sm">
                      <a.ikon className="h-5 w-5" />
                    </div>
                    <p className="font-display mb-1.5 text-sm font-extrabold text-slate-900">
                      {a.baslik}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600 sm:text-[13px]">{a.metin}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
