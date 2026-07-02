'use client';

import { motion } from 'framer-motion';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { lucideIkonAl } from '@/lib/lucide-ikon';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const colorMap: Record<string, { bg: string; icon: string; border: string; glow: string }> = {
  indigo:  { bg: 'from-indigo-500/15 to-indigo-500/5', icon: 'text-indigo-300', border: 'border-indigo-400/20', glow: 'group-hover:shadow-indigo-500/8' },
  violet:  { bg: 'from-violet-500/15 to-violet-500/5', icon: 'text-violet-300', border: 'border-violet-400/20', glow: 'group-hover:shadow-violet-500/8' },
  cyan:    { bg: 'from-cyan-500/15 to-cyan-500/5', icon: 'text-cyan-300', border: 'border-cyan-400/20', glow: 'group-hover:shadow-cyan-500/8' },
  emerald: { bg: 'from-emerald-500/15 to-emerald-500/5', icon: 'text-emerald-300', border: 'border-emerald-400/20', glow: 'group-hover:shadow-emerald-500/8' },
  orange:  { bg: 'from-orange-500/15 to-orange-500/5', icon: 'text-orange-300', border: 'border-orange-400/20', glow: 'group-hover:shadow-orange-500/8' },
  pink:    { bg: 'from-pink-500/15 to-pink-500/5', icon: 'text-pink-300', border: 'border-pink-400/20', glow: 'group-hover:shadow-pink-500/8' },
  yellow:  { bg: 'from-amber-500/15 to-amber-500/5', icon: 'text-amber-300', border: 'border-amber-400/20', glow: 'group-hover:shadow-amber-500/8' },
  slate:   { bg: 'from-slate-400/15 to-slate-400/5', icon: 'text-slate-300', border: 'border-slate-300/20', glow: 'group-hover:shadow-slate-500/5' },
};

export function Ozellikler() {
  const site = useSiteIcerik();
  const o = site.ozellikler;

  return (
    <section id="ozellikler" className="relative py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-[#090F22] scroll-mt-20 overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#7C6BFF]/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 md:mb-14"
        >
          <div className="max-w-lg">
            <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#8FE4D8] mb-4">
              {o.ustBaslik}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {o.baslik}
            </h2>
          </div>
          <div className="lg:max-w-sm">
            <p className="text-slate-400 text-sm leading-relaxed">{o.aciklama}</p>
            <Link
              href="/kayit"
              className="group inline-flex items-center gap-1.5 mt-4 text-[#8FE4D8] font-bold text-xs hover:gap-2.5 transition-all hover:text-[#2ABBA7]"
            >
              Tumunu kesfet <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
          {o.liste.map((ozellik, i) => {
            const Ikon = lucideIkonAl(ozellik.ikon);
            const c = colorMap[ozellik.renk] || colorMap.cyan;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -5, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                className={`group relative min-h-[200px] rounded-2xl border ${c.border} p-6 cursor-default overflow-hidden transition-all duration-300 backdrop-blur-sm
                  bg-gradient-to-b ${c.bg}
                  hover:border-white/[0.18] hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)] ${c.glow}`}
              >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Icon */}
                <div className={`inline-flex w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] items-center justify-center mb-5 ${c.icon} group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <Ikon className="w-5.5 h-5.5" />
                </div>

                <h3 className="text-white font-black text-base mb-2.5 leading-snug">{ozellik.baslik}</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed line-clamp-3">{ozellik.aciklama}</p>

                {/* Bottom accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent ${c.icon} opacity-0 group-hover:opacity-40 transition-opacity duration-300`} />
              </motion.div>
            );
          })}
        </div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-400 py-5 px-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]"
        >
          {['Ucretsiz basla', 'Kredi karti gerekmez', 'Istedigin zaman iptal et', '7/24 destek'].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-[#2ABBA7]/15 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 text-[#2ABBA7]" />
              </div>
              {item}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
