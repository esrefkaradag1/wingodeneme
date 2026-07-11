'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { SiteIcerikProvider, useSiteIcerik } from '@/contexts/SiteIcerikContext';
import type { SiteGenelIcerik } from '@/lib/site-icerik-defaults';
import { LandingHero } from '@/components/landing/LandingHero';
import { Ozellikler } from '@/components/landing/Ozellikler';
import { Istatistikler } from '@/components/landing/Istatistikler';
import { Paketler } from '@/components/landing/Paketler';
import { LandingNasil } from '@/components/landing/LandingNasil';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';

function LandingIcerik() {
  const site = useSiteIcerik();

  return (
    <main className="min-h-screen bg-[#080D1F] text-slate-100 overflow-x-hidden">
      <LandingNav />
      <LandingHero />
      <Istatistikler />
      <LandingNasil />
      <Ozellikler />
      <Paketler />

      {/* Final CTA */}
      <section className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-[#090F22] overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-[#7C6BFF]/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#2ABBA7]/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Card background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0F2137] via-[#162d4a] to-[#0F2137]" />

            {/* Animated orbs */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-20 -right-20 w-80 h-80 bg-[#2ABBA7]/12 rounded-full blur-[80px] pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#7C6BFF]/10 rounded-full blur-[80px] pointer-events-none"
            />

            {/* Dot pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            <div className="relative px-8 py-14 md:py-20 text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.12] px-5 py-2 text-xs font-black uppercase tracking-widest text-[#2ABBA7] mb-6 backdrop-blur-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F7C948]" />
                Ucretsiz basla
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-5"
              >
                {site.altCta.baslik}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed mb-10"
              >
                {site.altCta.aciklama}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  href="/kayit"
                  className="group relative inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#2ABBA7] to-[#1fa897] px-8 py-4 font-black text-sm text-white shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10">{site.altCta.kayitCta}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform relative z-10" />
                </Link>
                <Link
                  href="/giris"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-8 py-4 font-bold text-sm text-white hover:bg-white/[0.07] hover:border-white/25 transition-all duration-300 w-full sm:w-auto backdrop-blur-sm"
                >
                  <Zap className="w-4 h-4 text-[#F7C948]" />
                  {site.altCta.girisCta}
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}

export function LandingAnaSayfa({ initialIcerik }: { initialIcerik?: SiteGenelIcerik }) {
  return (
    <SiteIcerikProvider initialIcerik={initialIcerik}>
      <LandingIcerik />
    </SiteIcerikProvider>
  );
}
