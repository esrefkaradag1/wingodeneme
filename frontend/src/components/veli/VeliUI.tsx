'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

/* ── Veli paneli tasarım sistemi (violet / slate) ── */

export const VELI_NAV_RENK = {
  violet: { rozet: 'bg-violet-50 text-violet-600 ring-violet-100', rozetAktif: 'bg-violet-600 text-white ring-violet-600/20', nokta: 'bg-violet-500' },
  emerald: { rozet: 'bg-emerald-50 text-emerald-600 ring-emerald-100', rozetAktif: 'bg-emerald-600 text-white ring-emerald-600/20', nokta: 'bg-emerald-500' },
  indigo: { rozet: 'bg-indigo-50 text-indigo-600 ring-indigo-100', rozetAktif: 'bg-indigo-600 text-white ring-indigo-600/20', nokta: 'bg-indigo-500' },
  sky: { rozet: 'bg-sky-50 text-sky-600 ring-sky-100', rozetAktif: 'bg-sky-500 text-white ring-sky-500/20', nokta: 'bg-sky-500' },
  green: { rozet: 'bg-green-50 text-green-600 ring-green-100', rozetAktif: 'bg-green-600 text-white ring-green-600/20', nokta: 'bg-green-500' },
  rose: { rozet: 'bg-rose-50 text-rose-600 ring-rose-100', rozetAktif: 'bg-rose-500 text-white ring-rose-500/20', nokta: 'bg-rose-500' },
  amber: { rozet: 'bg-amber-50 text-amber-700 ring-amber-100', rozetAktif: 'bg-amber-500 text-white ring-amber-500/20', nokta: 'bg-amber-500' },
  teal: { rozet: 'bg-teal-50 text-teal-600 ring-teal-100', rozetAktif: 'bg-teal-500 text-white ring-teal-500/20', nokta: 'bg-teal-500' },
} as const;

export type VeliNavRenk = keyof typeof VELI_NAV_RENK;

export function VeliSayfa({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>{children}</div>;
}

export function VeliHero({
  baslik,
  aciklama,
  rozet,
  alt,
}: {
  baslik: string;
  aciklama?: string;
  rozet?: string;
  alt?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-700 via-violet-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-violet-900/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)] pointer-events-none" />
      <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          {rozet ? (
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-100 mb-3">
              {rozet}
            </span>
          ) : null}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{baslik}</h1>
          {aciklama ? <p className="mt-2 text-sm text-violet-100/90 max-w-xl leading-relaxed">{aciklama}</p> : null}
        </div>
        {alt ? <div className="shrink-0">{alt}</div> : null}
      </div>
    </section>
  );
}

export function VeliOgrenciBaslikBand({
  ogrenciAd,
  altBaslik,
  meta,
}: {
  ogrenciAd: string;
  altBaslik: string;
  meta?: string;
}) {
  return (
    <VeliHero
      baslik={altBaslik}
      aciklama={meta}
      rozet={`${ogrenciAd} · izleme modu`}
    />
  );
}

export function VeliStatKart({
  ikon: Ikon,
  etiket,
  deger,
  ton = 'violet',
}: {
  ikon: LucideIcon;
  etiket: string;
  deger: React.ReactNode;
  ton?: 'violet' | 'emerald' | 'amber' | 'sky' | 'rose' | 'slate';
}) {
  const tonlar = {
    violet: 'from-violet-500/10 to-violet-600/5 border-violet-100 text-violet-600',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-100 text-emerald-600',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-100 text-amber-600',
    sky: 'from-sky-500/10 to-sky-600/5 border-sky-100 text-sky-600',
    rose: 'from-rose-500/10 to-rose-600/5 border-rose-100 text-rose-600',
    slate: 'from-slate-500/10 to-slate-600/5 border-slate-100 text-slate-600',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 sm:p-5 ${tonlar[ton]}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/80 shadow-sm flex items-center justify-center">
          <Ikon className="w-4.5 h-4.5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{etiket}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{deger}</p>
    </div>
  );
}

export function VeliPanel({
  children,
  className = '',
  padding = true,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`rounded-2xl border border-gray-100/80 bg-white shadow-sm shadow-gray-200/40 ring-1 ring-black/[0.02] ${
        padding ? 'p-5 sm:p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function VeliPanelBaslik({
  baslik,
  aciklama,
  ikon: Ikon,
  aksiyon,
}: {
  baslik: string;
  aciklama?: string;
  ikon?: LucideIcon;
  aksiyon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        {Ikon ? (
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 ring-1 ring-violet-100">
            <Ikon className="w-5 h-5" />
          </div>
        ) : null}
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">{baslik}</h2>
          {aciklama ? <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{aciklama}</p> : null}
        </div>
      </div>
      {aksiyon ? <div className="shrink-0">{aksiyon}</div> : null}
    </div>
  );
}

export function VeliButon({
  children,
  href,
  onClick,
  type = 'button',
  disabled,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'outline';
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-600/20 active:scale-[0.98]',
    ghost: 'text-violet-700 hover:bg-violet-50',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-violet-200',
  };
  const cls = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function VeliInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/15 outline-none disabled:opacity-50 ${props.className ?? ''}`}
    />
  );
}

export function VeliYukleniyor({ mesaj = 'Yükleniyor…' }: { mesaj?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-500">{mesaj}</p>
    </div>
  );
}

export function VeliBosDurum({
  ikon: Ikon,
  baslik,
  aciklama,
  aksiyon,
}: {
  ikon: LucideIcon;
  baslik: string;
  aciklama?: string;
  aksiyon?: React.ReactNode;
}) {
  return (
    <VeliPanel className="text-center py-14 px-6 border-dashed border-violet-200/60 bg-gradient-to-b from-violet-50/30 to-white">
      <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-500 flex items-center justify-center mx-auto mb-4">
        <Ikon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">{baslik}</h3>
      {aciklama ? <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">{aciklama}</p> : null}
      {aksiyon ? <div className="mt-5">{aksiyon}</div> : null}
    </VeliPanel>
  );
}

export function VeliHizliLink({
  href,
  etiket,
  ikon: Ikon,
  renk,
}: {
  href: string;
  etiket: string;
  ikon: LucideIcon;
  renk: VeliNavRenk;
}) {
  const r = VELI_NAV_RENK[renk];
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-violet-100 transition-all duration-200"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 mb-3 transition-transform group-hover:scale-105 ${r.rozet}`}>
        <Ikon className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">{etiket}</p>
    </Link>
  );
}

export function VeliTablo({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function VeliTabloBaslik({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="bg-gray-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
        {children}
      </tr>
    </thead>
  );
}

export function VeliBadge({
  children,
  ton = 'violet',
}: {
  children: React.ReactNode;
  ton?: 'violet' | 'emerald' | 'amber' | 'sky' | 'rose' | 'gray';
}) {
  const tonlar = {
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    gray: 'bg-gray-100 text-gray-600 ring-gray-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${tonlar[ton]}`}>
      {children}
    </span>
  );
}
