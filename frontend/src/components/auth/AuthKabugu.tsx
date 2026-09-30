'use client';

import type { ReactNode } from 'react';
import AnaSiteyeDonButonu from '@/components/auth/AnaSiteyeDonButonu';

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
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-3 sm:p-5 text-edu-ink bg-edu-bg">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 12% 10%, rgba(13, 148, 136, 0.12) 0, transparent 32%), radial-gradient(circle at 90% 8%, rgba(234, 88, 12, 0.08) 0, transparent 28%), radial-gradient(circle at 50% 100%, rgba(13, 148, 136, 0.06) 0, transparent 40%)',
        }}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full blur-[100px] ${
          kpss ? 'bg-emerald-300/30' : 'bg-wingo-300/35'
        }`}
      />
      <div
        className={`pointer-events-none absolute -right-20 bottom-1/4 h-80 w-80 rounded-full blur-[110px] ${
          kpss ? 'bg-sky-300/25' : 'bg-orange-200/40'
        }`}
      />

      <AnaSiteyeDonButonu />

      <div
        className={`relative w-full animate-[authFadeUp_0.65s_ease-out] ${
          genisForm ? 'max-w-6xl' : 'max-w-5xl'
        }`}
      >
        <div className="rounded-[28px] border border-edu-line bg-white shadow-[0_24px_80px_-24px_rgba(15,47,43,0.18)]">
          <div className="grid overflow-hidden rounded-[27px] lg:grid-cols-2 min-h-[min(640px,calc(100vh-2.5rem))]">
            {/* Sol — marka / görsel */}
            <div className="relative hidden lg:flex flex-col justify-between p-8 xl:p-10 border-r border-edu-line bg-gradient-to-br from-edu-mint via-white to-orange-50/60">
              <div
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full blur-3xl ${
                  kpss ? 'bg-emerald-200/50' : 'bg-wingo-200/55'
                }`}
              />
              <div
                className={`absolute right-8 bottom-24 h-40 w-40 rounded-full blur-3xl ${
                  kpss ? 'bg-sky-200/40' : 'bg-orange-200/50'
                }`}
              />

              <div className="relative z-10 flex items-center gap-3">
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-md ${
                    kpss
                      ? 'bg-gradient-to-br from-emerald-500 to-sky-500 shadow-emerald-500/20'
                      : 'bg-gradient-to-br from-wingo-600 to-wingo-500 shadow-wingo-600/20'
                  }`}
                >
                  <span className="text-lg font-black text-white">{markaHarf}</span>
                </div>
                <span className="font-display text-lg font-extrabold tracking-tight text-edu-ink">
                  {markaAd}
                </span>
              </div>

              <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-10">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-2 select-none">
                  <span className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-none tracking-tighter text-wingo-700/10">
                    {solFiligranSol}
                  </span>
                  <span className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-none tracking-tighter text-orange-600/10">
                    {solFiligranSag}
                  </span>
                </div>
                <div
                  className={`relative h-36 w-36 rounded-full ${
                    kpss
                      ? 'bg-gradient-to-br from-emerald-300 via-teal-400 to-sky-500 shadow-[0_20px_50px_rgba(16,185,129,0.28)]'
                      : 'bg-gradient-to-br from-wingo-400 via-wingo-500 to-orange-400 shadow-[0_20px_50px_rgba(13,148,136,0.28)]'
                  }`}
                >
                  <div className="absolute inset-3 rounded-full bg-white/25 backdrop-blur-sm" />
                  <div className="absolute -right-2 top-6 h-10 w-10 rounded-full bg-white/40 blur-[1px]" />
                  <div className="absolute bottom-4 left-4 h-6 w-6 rounded-full bg-white/50" />
                </div>
              </div>

              <div className="relative z-10 max-w-sm">
                <h2 className="font-display text-2xl font-bold tracking-tight text-edu-ink xl:text-[1.65rem]">
                  {solBaslik}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-edu-muted">{solAlt}</p>
              </div>
            </div>

            {/* Sağ — form */}
            <div className="relative flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 xl:px-12 bg-white">
              <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    kpss
                      ? 'bg-gradient-to-br from-emerald-500 to-sky-500'
                      : 'bg-gradient-to-br from-wingo-600 to-wingo-500'
                  }`}
                >
                  <span className="font-black text-white">{markaHarf}</span>
                </div>
                <span className="font-display text-lg font-extrabold text-edu-ink">{markaAd}</span>
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
    ? 'focus:border-emerald-400 focus:ring-emerald-300'
    : 'focus:border-wingo-400 focus:ring-wingo-300';
  return [
    'w-full rounded-xl border bg-slate-50 px-4 py-3.5 text-sm text-edu-ink',
    'placeholder:text-slate-400 outline-none transition-all',
    'focus:ring-2 focus:bg-white',
    hatali ? 'border-red-400' : `border-edu-line ${focus}`,
  ].join(' ');
}

export function authBirincilButon(kpss: boolean) {
  return [
    'group w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all',
    'flex items-center justify-center gap-2 disabled:opacity-65',
    kpss
      ? 'bg-gradient-to-r from-emerald-500 to-sky-500 shadow-emerald-500/25 hover:brightness-110'
      : 'bg-gradient-to-r from-wingo-600 to-wingo-500 shadow-wingo-600/25 hover:brightness-110',
  ].join(' ');
}
