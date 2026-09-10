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

type Props = {
  /** KPSS temasında biraz daha teal ağırlıklı arka plan */
  kpssModu?: boolean;
};

export function LandingBizimleCalisin({ kpssModu = false }: Props) {
  return (
    <section
      id="bizimle-calisin"
      className={`relative scroll-mt-20 overflow-hidden px-4 py-20 sm:px-6 md:py-28 lg:px-8 ${
        kpssModu ? 'bg-[#041210]' : 'bg-[#070C1C]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -left-20 top-1/4 h-80 w-80 rounded-full blur-[120px] ${
            kpssModu ? 'bg-[#2ABBA7]/12' : 'bg-[#7C6BFF]/12'
          }`}
        />
        <div className="absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#2ABBA7]/10 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2ABBA7]/25 bg-[#2ABBA7]/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#8FE4D8]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Soru yazarı
            </span>

            <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-[2.65rem]">
              Alanınızda uzmanlık{' '}
              <span className="bg-gradient-to-r from-[#8FE4D8] via-[#2ABBA7] to-[#8FE4D8] bg-clip-text text-transparent">
                kazanca
              </span>{' '}
              dönüşsün
            </h2>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400 md:text-[15px]">
              Kendi ürettiğiniz soruları tekli veya toplu ithal edin; geometri ve fizikteki
              şekilli sorularınızı da sisteme taşıyın. Acil sınav ihtiyaçlarında hız kazanın.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/bizimle-calisin"
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#2ABBA7] to-[#1fa897] px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-teal-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-teal-600/40 sm:w-auto"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative z-10">Başvuru yap</span>
                <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{
                    duration: 0.45,
                    delay: 0.08 + i * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{
                    y: -3,
                    transition: { type: 'spring', stiffness: 400, damping: 28 },
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm transition-colors duration-300 hover:border-[#2ABBA7]/30 hover:bg-white/[0.05]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2ABBA7]/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#2ABBA7]/25 bg-[#2ABBA7]/15 text-[#2ABBA7] transition-transform duration-300 group-hover:scale-105">
                    <a.ikon className="h-5 w-5" />
                  </div>
                  <div className="relative min-w-0">
                    <p className="text-sm font-bold text-white">{a.baslik}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-[13px]">
                      {a.metin}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
