'use client';

import { motion } from 'framer-motion';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { lucideIkonAl } from '@/lib/lucide-ikon';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const stepColors = [
  {
    num: 'bg-wingo-600',
    badge: 'bg-wingo-50 text-wingo-700 border-wingo-100',
    iconBg: 'bg-wingo-50',
    iconText: 'text-wingo-700',
    accent: 'from-wingo-500 to-wingo-400',
  },
  {
    num: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-100',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-700',
    accent: 'from-amber-400 to-orange-400',
  },
  {
    num: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-800 border-orange-100',
    iconBg: 'bg-orange-50',
    iconText: 'text-orange-700',
    accent: 'from-orange-500 to-orange-400',
  },
];

export function LandingNasil() {
  const site = useSiteIcerik();
  const n = site.nasil;

  return (
    <section
      id="nasil"
      className="relative py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white scroll-mt-24 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12 md:mb-16"
        >
          <span className="font-display inline-flex items-center rounded-full bg-wingo-50 border border-wingo-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-wingo-700 mb-4">
            {n.ustBaslik}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            {n.baslik}
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">{n.aciklama}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6 relative">
          <div className="hidden md:block absolute top-[3.25rem] left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-wingo-200 via-amber-200 to-orange-200" />

          {n.adimlar.map((adim, i) => {
            const Icon = lucideIkonAl(adim.ikon);
            const c = stepColors[i % stepColors.length];

            return (
              <motion.article
                key={adim.sira}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-3xl border border-slate-200 bg-slate-50/60 p-6 md:p-7 hover:bg-white hover:shadow-lg hover:border-slate-300 transition-all duration-300"
              >
                <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r ${c.accent} opacity-80`} />

                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`relative z-10 inline-flex w-11 h-11 rounded-full ${c.num} shadow-md items-center justify-center font-display font-extrabold text-lg text-white`}
                  >
                    {i + 1}
                  </div>
                  <div className={`inline-flex w-11 h-11 rounded-2xl ${c.iconBg} items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${c.iconText}`} />
                  </div>
                  <span className={`ml-auto text-[10px] font-extrabold uppercase tracking-wider rounded-full border px-2.5 py-1 ${c.badge}`}>
                    Adım {i + 1}
                  </span>
                </div>

                <h3 className="font-display text-slate-900 font-extrabold text-xl mb-2.5">
                  {adim.baslik}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">{adim.metin}</p>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="text-center mt-12"
        >
          <Link
            href="/kayit"
            className="group inline-flex items-center gap-2 rounded-full bg-wingo-600 hover:bg-wingo-700 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-wingo-600/20 transition-all"
          >
            Hemen başla
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
