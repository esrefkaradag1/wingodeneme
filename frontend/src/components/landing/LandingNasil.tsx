'use client';

import { motion } from 'framer-motion';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { lucideIkonAl } from '@/lib/lucide-ikon';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const stepColors = [
  { gradient: 'from-[#2ABBA7] to-[#1fa897]', glow: 'shadow-[#2ABBA7]/25', iconBg: 'bg-[#2ABBA7]/10', iconText: 'text-[#2ABBA7]' },
  { gradient: 'from-[#F7C948] to-[#e6b830]', glow: 'shadow-[#F7C948]/25', iconBg: 'bg-[#F7C948]/10', iconText: 'text-[#F7C948]' },
  { gradient: 'from-[#7B5EA7] to-[#6a4f96]', glow: 'shadow-[#7B5EA7]/25', iconBg: 'bg-[#7B5EA7]/10', iconText: 'text-[#7B5EA7]' },
];

export function LandingNasil() {
  const site = useSiteIcerik();
  const n = site.nasil;

  return (
    <section id="nasil" className="relative py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-[#0A1024] scroll-mt-20 overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#2ABBA7]/4 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#F7C948]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-xl mx-auto mb-14"
        >
          <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#8FE4D8] mb-5">
            {n.ustBaslik}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-4">
            {n.baslik}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {n.aciklama}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-[#2ABBA7]/30 via-[#F7C948]/20 to-[#7B5EA7]/30" />

          {n.adimlar.map((adim, i) => {
            const Icon = lucideIkonAl(adim.ikon);
            const c = stepColors[i % stepColors.length];

            return (
              <motion.div
                key={adim.sira}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                className="relative group"
              >
                <div className="relative bg-slate-900/60 rounded-2xl border border-white/[0.07] p-7 backdrop-blur-sm hover:border-white/[0.14] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
                  {/* Gradient top accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  {/* Step number + icon */}
                  <div className="flex items-center gap-4 mb-5">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: -4 }}
                      className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} ${c.glow} shadow-lg items-center justify-center font-black text-base text-white`}
                    >
                      {i + 1}
                    </motion.div>
                    <div className={`inline-flex w-12 h-12 rounded-xl ${c.iconBg} items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${c.iconText}`} />
                    </div>
                  </div>

                  <h3 className="text-white font-black text-lg mb-2.5">{adim.baslik}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{adim.metin}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10"
        >
          <Link
            href="/kayit"
            className="group inline-flex items-center gap-2 text-[#8FE4D8] font-bold text-sm hover:gap-3 transition-all hover:text-[#2ABBA7]"
          >
            Hemen basla
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
