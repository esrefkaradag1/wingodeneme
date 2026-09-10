'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';

const AuthThreeBackground = dynamic(() => import('@/components/auth/AuthThreeBackground'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 bg-[#070713]" />,
});

export type AuthMod = 'kpss' | 'yks_lgs';

type AuthKabuguProps = {
  mode: AuthMod;
  markaAd: string;
  markaHarf: string;
  solBaslik: string;
  solAlt: string;
  solFiligranSol?: string;
  solFiligranSag?: string;
  children: ReactNode;
  /** Form paneli genişliği — kayıt gibi uzun formlar için true */
  genisForm?: boolean;
};

export default function AuthKabugu({
  mode,
  markaAd,
  markaHarf,
  solBaslik,
  solAlt,
  solFiligranSol = 'Deneme',
  solFiligranSag = 'Analiz',
  children,
  genisForm = false,
}: AuthKabuguProps) {
  const kpss = mode === 'kpss';

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-3 sm:p-5 text-white">
      <AuthThreeBackground mode={mode} />
      <div className="pointer-events-none absolute inset-0 -z-[5] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(7,7,19,0.7)_100%)]" />
      <div
        className={`pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full blur-[100px] ${
          kpss ? 'bg-emerald-500/20' : 'bg-[#7C6BFF]/25'
        }`}
      />
      <div
        className={`pointer-events-none absolute -right-20 bottom-1/4 h-80 w-80 rounded-full blur-[110px] ${
          kpss ? 'bg-sky-500/15' : 'bg-[#2ABBA7]/20'
        }`}
      />

      <AnaSiteyeDonButonu />

      <div
        className={`relative w-full animate-[authFadeUp_0.65s_ease-out] ${
          genisForm ? 'max-w-6xl' : 'max-w-5xl'
        }`}
      >
        <div className="rounded-[28px] p-[1px] bg-gradient-to-br from-white/30 via-white/10 to-white/[0.04] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.65)]">
          <div className="grid overflow-hidden rounded-[27px] bg-[#0a0a14]/75 backdrop-blur-2xl lg:grid-cols-2 min-h-[min(640px,calc(100vh-2.5rem))]">
            {/* Sol — marka / görsel */}
            <div className="relative hidden lg:flex flex-col justify-between p-8 xl:p-10 border-r border-white/[0.06]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
              <div
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full blur-3xl ${
                  kpss ? 'bg-emerald-400/25' : 'bg-[#7C6BFF]/30'
                }`}
              />
              <div
                className={`absolute right-8 bottom-24 h-40 w-40 rounded-full blur-3xl ${
                  kpss ? 'bg-sky-400/20' : 'bg-[#2ABBA7]/25'
                }`}
              />

              <div className="relative z-10 flex items-center gap-3">
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg ${
                    kpss
                      ? 'bg-gradient-to-br from-emerald-400 to-sky-500 shadow-emerald-500/30'
                      : 'bg-gradient-to-br from-[#7C6BFF] to-[#2ABBA7] shadow-indigo-500/30'
                  }`}
                >
                  <span className="text-lg font-black text-white">{markaHarf}</span>
                  <span className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
                </div>
                <span className="text-lg font-extrabold tracking-tight text-white">{markaAd}</span>
              </div>

              <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-10">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-2 select-none">
                  <span className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-none tracking-tighter text-white/[0.07]">
                    {solFiligranSol}
                  </span>
                  <span className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-none tracking-tighter text-white/[0.07]">
                    {solFiligranSag}
                  </span>
                </div>
                <div
                  className={`relative h-36 w-36 rounded-full ${
                    kpss
                      ? 'bg-gradient-to-br from-emerald-300/80 via-teal-400 to-sky-500 shadow-[0_0_60px_rgba(16,185,129,0.45)]'
                      : 'bg-gradient-to-br from-[#a78bfa] via-[#7C6BFF] to-[#2ABBA7] shadow-[0_0_60px_rgba(124,107,255,0.45)]'
                  }`}
                >
                  <div className="absolute inset-3 rounded-full bg-white/10 backdrop-blur-sm" />
                  <div className="absolute -right-2 top-6 h-10 w-10 rounded-full bg-white/20 blur-[1px]" />
                  <div className="absolute bottom-4 left-4 h-6 w-6 rounded-full bg-white/25" />
                </div>
              </div>

              <div className="relative z-10 max-w-sm">
                <h2 className="text-2xl font-bold tracking-tight text-white xl:text-[1.65rem]">{solBaslik}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{solAlt}</p>
              </div>
            </div>

            {/* Sağ — form */}
            <div className="relative flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 xl:px-12">
              {/* Mobil logo */}
              <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    kpss
                      ? 'bg-gradient-to-br from-emerald-400 to-sky-500'
                      : 'bg-gradient-to-br from-[#7C6BFF] to-[#2ABBA7]'
                  }`}
                >
                  <span className="font-black text-white">{markaHarf}</span>
                </div>
                <span className="text-lg font-extrabold">{markaAd}</span>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes authFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/** Ortak input sınıfları — auth formları */
export function authInputSinifi(kpss: boolean, hatali?: boolean) {
  const focus = kpss
    ? 'focus:border-emerald-400/50 focus:ring-emerald-400/30'
    : 'focus:border-[#7C6BFF]/50 focus:ring-[#7C6BFF]/30';
  return [
    'w-full rounded-xl border bg-[#0c0c18]/80 px-4 py-3.5 text-sm text-white',
    'placeholder:text-white/30 outline-none transition-all',
    'focus:ring-2 focus:bg-[#10101c]',
    hatali ? 'border-red-400/50' : `border-white/12 ${focus}`,
  ].join(' ');
}

export function authBirincilButon(kpss: boolean) {
  return [
    'group w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all',
    'flex items-center justify-center gap-2 disabled:opacity-65',
    kpss
      ? 'bg-gradient-to-r from-emerald-500 to-sky-500 shadow-emerald-500/25 hover:brightness-110 hover:shadow-emerald-500/40'
      : 'bg-gradient-to-r from-[#7C6BFF] via-[#6B5CE7] to-[#2ABBA7] shadow-indigo-500/30 hover:brightness-110 hover:shadow-indigo-500/45',
  ].join(' ');
}
