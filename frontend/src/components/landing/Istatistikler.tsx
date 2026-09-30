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
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setVal(Math.min(increment * step, target));
      if (step >= steps) {
        clearInterval(timer);
        setVal(target);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {Math.floor(val).toLocaleString('tr-TR')}
      {suffix}
    </span>
  );
}

const accents = [
  'text-wingo-700',
  'text-amber-600',
  'text-orange-600',
  'text-teal-700',
];

export function Istatistikler() {
  const site = useSiteIcerik();
  const stats = site.istatistik.satirlar;

  return (
    <section className="relative py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden border-y border-edu-line">
      <motion.div
        animate={{ opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-48 bg-wingo-400/10 blur-[80px] pointer-events-none rounded-full"
      />
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="font-display inline-flex items-center text-xs font-extrabold uppercase tracking-[0.18em] text-wingo-700 mb-3">
            {site.istatistik.bolumBaslik}
          </span>
          <p className="text-edu-muted text-sm max-w-md mx-auto">{site.istatistik.bolumAciklama}</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
              className="text-center"
            >
              <div className={`font-display text-4xl md:text-5xl font-extrabold tabular-nums mb-2 tracking-tight ${accents[i % accents.length]}`}>
                <AnimatedNumber target={Number(s.sayi) || 0} suffix={s.suffix} />
              </div>
              <div className="text-edu-ink font-bold text-sm mb-1">{s.etiket}</div>
              <div className="text-edu-muted text-xs leading-snug hidden sm:block">{s.alt}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
