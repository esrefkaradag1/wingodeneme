'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const steps = 60;
    const stepTime = duration / steps;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, target);
      setVal(current);
      if (step >= steps) {
        clearInterval(timer);
        setVal(target);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{Math.floor(val).toLocaleString('tr-TR')}{suffix}</span>;
}

const cardStyles = [
  { accent: 'from-[#2ABBA7]/20 to-[#2ABBA7]/5', border: 'border-[#2ABBA7]/20', text: 'text-[#8FE4D8]', glow: 'shadow-[0_0_30px_rgba(42,187,167,0.08)]' },
  { accent: 'from-[#F7C948]/20 to-[#F7C948]/5', border: 'border-[#F7C948]/20', text: 'text-[#FFE08A]', glow: 'shadow-[0_0_30px_rgba(247,201,72,0.08)]' },
  { accent: 'from-[#FF6B6B]/20 to-[#FF6B6B]/5', border: 'border-[#FF6B6B]/20', text: 'text-[#FF9AA2]', glow: 'shadow-[0_0_30px_rgba(255,107,107,0.08)]' },
  { accent: 'from-[#7C6BFF]/20 to-[#7C6BFF]/5', border: 'border-[#7C6BFF]/20', text: 'text-[#B8A4FF]', glow: 'shadow-[0_0_30px_rgba(124,107,255,0.08)]' },
];

export function Istatistikler() {
  const site = useSiteIcerik();
  const stats = site.istatistik.satirlar;

  return (
    <section className="relative py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-[#0B1127] overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#2ABBA7]/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#2ABBA7] mb-4">
            {site.istatistik.bolumBaslik}
          </span>
          <p className="text-slate-400 text-sm max-w-md mx-auto">{site.istatistik.bolumAciklama}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const style = cardStyles[i % cardStyles.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                className={`relative rounded-2xl border ${style.border} bg-gradient-to-b ${style.accent} p-6 cursor-default overflow-hidden backdrop-blur-md ${style.glow} hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-shadow duration-300 group`}
              >
                {/* Subtle top accent line */}
                <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-current to-transparent ${style.text} opacity-30`} />

                <div className={`text-4xl font-black tabular-nums mb-2 tracking-tight ${style.text}`}>
                  <AnimatedNumber target={Number(s.sayi) || 0} suffix={s.suffix} />
                </div>
                <div className="text-slate-100 font-bold text-sm mb-1">{s.etiket}</div>
                <div className="text-slate-400 text-xs leading-snug hidden sm:block">{s.alt}</div>

                {/* Hover indicator */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent ${style.text} opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
