'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle, Star, Users, BookOpen, Award, TrendingUp } from 'lucide-react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { lucideIkonAl } from '@/lib/lucide-ikon';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function LandingHero() {
  const site = useSiteIcerik();
  const h = site.hero;

  return (
    <section className="relative overflow-hidden pt-[100px] pb-0 bg-[#070C1C]">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 right-[-80px] w-[600px] h-[600px] rounded-full bg-[#7C6BFF]/20 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-40 left-[-100px] w-[500px] h-[500px] rounded-full bg-[#2ABBA7]/15 blur-[120px]"
        />
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#F7C948]/5 blur-[100px]"
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left content */}
          <div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.10] px-4 py-1.5 text-xs font-bold text-[#8FE4D8] mb-6 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ABBA7] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2ABBA7]" />
              </span>
              {h.rozet1}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.1}
              className="text-4xl sm:text-5xl md:text-[3.4rem] font-black text-white leading-[1.04] tracking-tight mb-5"
            >
              {h.baslikOnce}{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#8FE4D8] via-[#2ABBA7] to-[#8FE4D8] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-flow">
                  {h.baslikVurgu}
                </span>
                <svg className="absolute -bottom-1 left-0 w-full" height="7" viewBox="0 0 200 7" fill="none" preserveAspectRatio="none">
                  <path d="M1 5C40 1 80 6 120 3C160 0 200 5 200 5" stroke="#F7C948" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>
                </svg>
              </span>
              {h.baslikSon && <> {h.baslikSon}</>}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.2}
              className="text-slate-400 text-[16px] leading-relaxed mb-8 max-w-xl"
            >
              {h.altMetin}
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.25}
              className="flex flex-col gap-2.5 mb-8"
            >
              {[h.madde1, h.madde2].filter(Boolean).map((m, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                  <div className="w-5 h-5 rounded-full bg-[#2ABBA7]/15 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-[#2ABBA7]" />
                  </div>
                  {m}
                </div>
              ))}
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.3}
              className="flex flex-col sm:flex-row items-start gap-3"
            >
              <Link
                href={h.birincilCtaHref}
                className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C6BFF] to-[#2ABBA7] px-7 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.08] to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10">{h.birincilCta}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform relative z-10" />
              </Link>
              {h.ikincilCta?.trim() && h.ikincilCtaHref?.trim() && !h.ikincilCtaHref.includes('/rehber') ? (
              <Link
                href={h.ikincilCtaHref}
                className="group inline-flex items-center gap-2.5 px-5 py-4 rounded-xl border border-white/[0.10] bg-white/[0.02] text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 w-full sm:w-auto"
              >
                <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shrink-0 group-hover:bg-white/[0.10] group-hover:shadow-md transition-all duration-300">
                  <Play className="w-3.5 h-3.5 text-[#2ABBA7] ml-0.5" />
                </div>
                {h.ikincilCta}
              </Link>
              ) : null}
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.4}
              className="mt-8 flex items-center gap-5 pt-6 border-t border-white/[0.06]"
            >
              <div className="flex -space-x-2">
                {[
                  'bg-gradient-to-br from-indigo-400 to-indigo-500',
                  'bg-gradient-to-br from-teal-400 to-teal-500',
                  'bg-gradient-to-br from-orange-400 to-orange-500',
                  'bg-gradient-to-br from-pink-400 to-pink-500',
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${c} border-2 border-[#080D1F] flex items-center justify-center text-white text-[11px] font-bold shadow-lg`}
                  >
                    {['A', 'M', 'K', 'Y'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#F7C948] text-[#F7C948]" />
                  ))}
                </div>
                <p className="text-xs font-medium text-slate-400">
                  <span className="text-white font-black">12,000+</span> ogrenci katildi
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right: Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            {/* Orb behind card */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7C6BFF]/10 via-transparent to-[#2ABBA7]/10 rounded-3xl blur-2xl" />

            <div className="relative rounded-3xl bg-gradient-to-br from-[#0f1734] via-[#131d42] to-[#0f1734] p-6 shadow-2xl overflow-hidden border border-white/[0.08] backdrop-blur-sm">
              {/* Inner glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#7C6BFF]/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#2ABBA7]/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative space-y-4">
                {/* Header row */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2ABBA7]/20 to-[#2ABBA7]/5 border border-[#2ABBA7]/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-[#2ABBA7]" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Bugunku Calisma</p>
                    <p className="text-slate-400 text-xs">Matematik — Turev</p>
                  </div>
                  <div className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                    Aktif
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                    <span>Ilerleme</span>
                    <span className="text-[#2ABBA7] font-bold">68%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.04]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '68%' }}
                      transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-[#7C6BFF] to-[#2ABBA7] relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                    </motion.div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { icon: BookOpen, val: '45', label: 'Soru' },
                    { icon: TrendingUp, val: '92%', label: 'Dogru' },
                    { icon: Users, val: '1.2k', label: 'Rakip' },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/[0.06] hover:bg-white/[0.07] transition-colors"
                    >
                      <p className="text-white font-black text-lg leading-none">{s.val}</p>
                      <p className="text-slate-500 text-[9px] font-semibold uppercase tracking-wide mt-1">{s.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Feature rows */}
                {h.kartlar.slice(0, 2).map((k, i) => {
                  const Icon = lucideIkonAl(k.ikon);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                      className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2ABBA7]/20 to-[#2ABBA7]/5 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#2ABBA7]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-bold text-xs truncate">{k.baslik}</p>
                        <p className="text-slate-500 text-[10px] truncate">{k.aciklama.slice(0, 45)}…</p>
                      </div>
                      <div className="ml-auto text-[9px] font-bold text-[#2ABBA7] bg-[#2ABBA7]/10 px-2 py-0.5 rounded-full shrink-0">
                        {k.etiket}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Floating badge top-left */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-5 -left-5 bg-[#0f1734] rounded-2xl shadow-xl p-3.5 flex items-center gap-3 border border-white/[0.10] backdrop-blur-xl hidden sm:flex"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F7C948]/15 flex items-center justify-center">
                <Award className="w-4.5 h-4.5 text-[#F7C948]" />
              </div>
              <div>
                <p className="text-white font-black text-sm">Net: 85.40</p>
                <p className="text-slate-400 text-[10px]">Son Deneme</p>
              </div>
            </motion.div>

            {/* Floating badge bottom-right */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              className="absolute -bottom-5 -right-5 bg-[#0f1734] rounded-2xl shadow-xl p-3.5 border border-white/[0.10] backdrop-blur-xl hidden sm:block"
            >
              <div className="flex items-center gap-0.5 mb-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-[#F7C948] text-[#F7C948]" />
                ))}
              </div>
              <p className="text-white font-black text-sm">4.9 / 5</p>
              <p className="text-slate-400 text-[10px]">Memnuniyet</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Wave bottom */}
      <div className="relative z-10 -mb-px">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none">
          <path d="M0 0C240 60 480 48 720 28C960 8 1200 8 1440 30V60H0V0Z" fill="#0B1127" />
        </svg>
      </div>
    </section>
  );
}
