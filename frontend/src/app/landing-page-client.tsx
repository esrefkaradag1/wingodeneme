'use client';

import nextDynamic from 'next/dynamic';

/** Sunucu tarafında framer-motion / landing ağacı bazen undefined bileşen üretiyor; yalnızca istemcide yükle */
const LandingAnaSayfaLazy = nextDynamic(
  () => import('@/components/landing/LandingAnaSayfa').then((m) => ({ default: m.LandingAnaSayfa })),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-white" aria-hidden />,
  }
);

export default function LandingPageClient() {
  return <LandingAnaSayfaLazy />;
}
