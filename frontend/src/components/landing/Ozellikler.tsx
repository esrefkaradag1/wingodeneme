'use client';

import { motion } from 'framer-motion';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { lucideIkonAl } from '@/lib/lucide-ikon';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const colorMap: Record<string, { icon: string; tint: string; ring: string }> = {
  indigo: { icon: 'text-wingo-700', tint: 'bg-wingo-50', ring: 'group-hover:border-wingo-300' },
  violet: { icon: 'text-teal-700', tint: 'bg-teal-50', ring: 'group-hover:border-teal-300' },
  cyan: { icon: 'text-sky-700', tint: 'bg-sky-50', ring: 'group-hover:border-sky-300' },
  emerald: { icon: 'text-emerald-700', tint: 'bg-emerald-50', ring: 'group-hover:border-emerald-300' },
  orange: { icon: 'text-orange-700', tint: 'bg-orange-50', ring: 'group-hover:border-orange-300' },
  pink: { icon: 'text-rose-700', tint: 'bg-rose-50', ring: 'group-hover:border-rose-300' },
  yellow: { icon: 'text-amber-700', tint: 'bg-amber-50', ring: 'group-hover:border-amber-300' },
  slate: { icon: 'text-slate-700', tint: 'bg-slate-50', ring: 'group-hover:border-slate-300' },
};

export function Ozellikler() {
  const site = useSiteIcerik();
  const o = site.ozellikler;

  return (
    <section
      id="ozellikler"
      className="relative py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-[#F7FAFC] scroll-mt-24 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-12 md:mb-14"
        >
          <span className="font-display inline-flex items-center rounded-full bg-white border border-slate-200 px-3.5 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-wingo-700 mb-4 shadow-sm">
            {o.ustBaslik}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            {o.baslik}
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">{o.aciklama}</p>
          <Link
            href="/kayit"
            className="group inline-flex items-center gap-1.5 mt-5 text-wingo-700 font-bold text-sm hover:gap-2.5 transition-all"
          >
            Tümünü keşfet <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
          {o.liste.map((ozellik, i) => {
            const Ikon = lucideIkonAl(ozellik.ikon);
            const c = colorMap[ozellik.renk] || colorMap.cyan;
            return (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className={`group rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${c.ring}`}
              >
                <div
                  className={`inline-flex w-11 h-11 rounded-xl ${c.tint} items-center justify-center mb-4 ${c.icon}`}
                >
                  <Ikon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-slate-900 font-extrabold text-[15px] mb-2 leading-snug">
                  {ozellik.baslik}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">{ozellik.aciklama}</p>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm"
        >
          {['Ücretsiz başla', 'Kredi kartı gerekmez', 'İstediğin zaman iptal et', '7/24 destek'].map(
            (item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-wingo-600 shrink-0" />
                {item}
              </div>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}
