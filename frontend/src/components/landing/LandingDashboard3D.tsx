'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';

type Props = {
  src?: string;
  alt?: string;
};

/** Tam genişlik dashboard vitrini — ekrana sığacak şekilde */
export function LandingDashboard3D({
  src = '/landing-dashboard-preview.jpg',
  alt = 'Wingo Deneme öğrenci paneli',
}: Props) {
  const kapsayici = useRef<HTMLDivElement>(null);
  const [azalt, setAzalt] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const spring = { stiffness: 140, damping: 20, mass: 0.35 };
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), spring);
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), spring);
  const shineX = useSpring(useTransform(mx, [-0.5, 0.5], [10, 90]), spring);
  const shineY = useSpring(useTransform(my, [-0.5, 0.5], [10, 90]), spring);
  const sheen = useMotionTemplate`radial-gradient(600px circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.45), transparent 42%)`;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAzalt(mq.matches);
    const fn = () => setAzalt(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (azalt || !kapsayici.current) return;
      const rect = kapsayici.current.getBoundingClientRect();
      mx.set((e.clientX - rect.left) / rect.width - 0.5);
      my.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [azalt, mx, my]
  );

  const onLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  return (
    <div
      ref={kapsayici}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative w-full max-w-[1400px] mx-auto"
      style={{ perspective: 1600 }}
    >
      <div className="absolute -bottom-4 left-[5%] right-[5%] h-14 rounded-[100%] bg-slate-900/10 blur-2xl pointer-events-none" />

      <motion.div
        style={
          azalt
            ? undefined
            : {
                rotateX: rx,
                rotateY: ry,
                transformStyle: 'preserve-3d' as const,
              }
        }
        className="relative will-change-transform"
      >
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white shadow-[0_30px_80px_-20px_rgba(15,47,43,0.28)]">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-100 bg-slate-50/90">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <div className="ml-2 sm:ml-3 flex-1 h-6 rounded-md bg-white border border-slate-200 flex items-center px-3">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">
                app.wingodeneme.com/dashboard
              </span>
            </div>
          </div>

          {/* Geniş ekranda daha yüksek görünüm; tam genişlik */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] lg:aspect-[21/9] max-h-[min(62vh,720px)] bg-slate-100 overflow-hidden">
            <Image
              src={src}
              alt={alt}
              fill
              priority
              sizes="100vw"
              className="object-cover object-top object-left"
            />
            {!azalt && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-50"
                style={{ background: sheen }}
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
