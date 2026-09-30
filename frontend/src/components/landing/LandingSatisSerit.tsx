'use client';

import { motion } from 'framer-motion';
import { Flame, ShieldCheck, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useKpssLanding } from '@/contexts/LandingThemeContext';

const SATIRLAR_YKS = [
  { ikon: Flame, metin: 'Bu hafta 840+ paket satıldı' },
  { ikon: TrendingUp, metin: 'Popüler: TYT Tam Paket' },
  { ikon: ShieldCheck, metin: 'Anında erişim · güvenli ödeme' },
  { ikon: Sparkles, metin: 'Ücretsiz deneme ile başla' },
  { ikon: Zap, metin: 'Detaylı net & sıralama analizi' },
];

const SATIRLAR_KPSS = [
  { ikon: Flame, metin: 'Bu hafta 320+ KPSS paketi satıldı' },
  { ikon: TrendingUp, metin: 'Popüler: Yıllık KPSS Paketi' },
  { ikon: ShieldCheck, metin: 'Anında erişim · güvenli ödeme' },
  { ikon: Sparkles, metin: 'Ücretsiz deneme ile başla' },
  { ikon: Zap, metin: 'GY-GK kazanım analizi' },
];

export function LandingSatisSerit() {
  const kpss = useKpssLanding();
  const satirlar = kpss ? SATIRLAR_KPSS : SATIRLAR_YKS;
  const dongu = [...satirlar, ...satirlar];

  return (
    <div className="relative border-y border-edu-line bg-white overflow-hidden py-1">
      <div className="absolute inset-y-0 left-0 w-16 sm:w-24 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 sm:w-24 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />

      <motion.div
        className="flex w-max gap-10 py-3.5"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {dongu.map((item, i) => {
          const Ikon = item.ikon;
          return (
            <div
              key={`${item.metin}-${i}`}
              className="flex items-center gap-2.5 whitespace-nowrap text-sm font-semibold text-edu-ink/80"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-wingo-50 text-wingo-700">
                <Ikon className="h-3.5 w-3.5" />
              </span>
              {item.metin}
              <span className="text-edu-line mx-2">•</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
