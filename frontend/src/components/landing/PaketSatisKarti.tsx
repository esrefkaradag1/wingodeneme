'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Gift,
  Sparkles,
  Star,
  TrendingDown,
  Zap,
  Loader2,
} from 'lucide-react';
import { fiyatGoster } from '@/lib/para';

export type PaketSatisVeri = {
  id: string;
  ad: string;
  aciklama: string | null;
  kategori?: string;
  fiyat: number;
  indirimliFiyat: number | null;
  sinavSayisi: number;
  ozellikler: string[];
  populer: boolean;
};

type PaketSatisKartiProps = {
  paket: PaketSatisVeri;
  kategoriAd: string;
  kategoriSlug?: string;
  index?: number;
  /** KPSS landing: tek buton, farklı href kuralı */
  kpssModu?: boolean;
  ucretsizYukleniyor?: boolean;
  onUcretsizAl?: () => void;
};

function kategoriKoyuStil(slug?: string): string {
  const s = (slug || '').toUpperCase();
  if (s.includes('KPSS')) return 'bg-teal-500/15 text-teal-200 border-teal-400/35';
  if (s.includes('LGS')) return 'bg-sky-500/15 text-sky-200 border-sky-400/35';
  if (s.includes('YKS') || s.includes('TYT') || s.includes('AYT'))
    return 'bg-violet-500/15 text-violet-200 border-violet-400/35';
  return 'bg-white/[0.08] text-slate-200 border-white/15';
}

function paketFiyat(paket: PaketSatisVeri) {
  const efektif =
    paket.indirimliFiyat != null && paket.indirimliFiyat > 0 ? paket.indirimliFiyat : paket.fiyat;
  const ucretsiz = efektif <= 0;
  const indirimVar =
    !ucretsiz &&
    paket.indirimliFiyat != null &&
    paket.indirimliFiyat > 0 &&
    paket.indirimliFiyat < paket.fiyat;
  const indirimYuzde = indirimVar
    ? Math.round(((paket.fiyat - paket.indirimliFiyat!) / paket.fiyat) * 100)
    : 0;
  const denemeBasi =
    !ucretsiz && paket.sinavSayisi > 0 ? efektif / paket.sinavSayisi : null;

  return { efektif, ucretsiz, indirimVar, indirimYuzde, denemeBasi };
}

export function PaketSatisKarti({
  paket,
  kategoriAd,
  kategoriSlug,
  index = 0,
  kpssModu = false,
  ucretsizYukleniyor = false,
  onUcretsizAl,
}: PaketSatisKartiProps) {
  const { efektif, ucretsiz, indirimVar, indirimYuzde, denemeBasi } = paketFiyat(paket);
  const ozellikler = (Array.isArray(paket.ozellikler) ? paket.ozellikler : []).slice(0, 4);
  const detayHref = kpssModu && paket.id.includes('kpss-') ? '/kayit' : `/paket/${encodeURIComponent(paket.id)}`;

  const sinavMetni =
    paket.sinavSayisi === 0
      ? 'Sınırsız deneme'
      : paket.sinavSayisi === 1
        ? '1 deneme hakkı'
        : `${paket.sinavSayisi} deneme hakkı`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8, transition: { type: 'spring', stiffness: 380, damping: 22 } }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[28px] border transition-shadow duration-500 ${
        paket.populer
          ? 'border-[#2ABBA7]/45 shadow-[0_0_0_1px_rgba(42,187,167,0.15),0_24px_60px_-12px_rgba(42,187,167,0.25)] scale-[1.02] z-10'
          : ucretsiz
            ? 'border-emerald-500/25 shadow-[0_20px_50px_-20px_rgba(16,185,129,0.2)]'
            : 'border-white/[0.08] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.5)] hover:border-white/20 hover:shadow-[0_28px_60px_-20px_rgba(0,0,0,0.55)]'
      }`}
    >
      {/* Arka plan katmanları */}
      <div
        className={`absolute inset-0 ${
          paket.populer
            ? 'bg-gradient-to-br from-[#0c2840] via-[#0f2238] to-[#081828]'
            : ucretsiz
              ? 'bg-gradient-to-br from-[#061a14] via-[#0a1628] to-[#061018]'
              : 'bg-gradient-to-br from-[#0c1428] via-[#0a1020] to-[#070c18]'
        }`}
      />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#2ABBA7]/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-indigo-600/10 blur-3xl" />

      {/* Üst şerit */}
      <div
        className={`relative h-1 w-full ${
          paket.populer
            ? 'bg-gradient-to-r from-[#2ABBA7] via-[#7C6BFF] to-[#2ABBA7]'
            : ucretsiz
              ? 'bg-gradient-to-r from-emerald-500/80 via-teal-400/60 to-emerald-500/80'
              : 'bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-[#2ABBA7]/40'
        }`}
      />

      <div className="relative flex flex-1 flex-col p-6 sm:p-7">
        {/* Rozetler */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${kategoriKoyuStil(kategoriSlug)}`}
          >
            {kategoriAd}
          </span>
          {paket.populer ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F7C948] to-[#f59e0b] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#1a1200] shadow-lg shadow-amber-500/20">
              <Star className="h-3 w-3 fill-current" />
              Popüler
            </span>
          ) : ucretsiz ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
              <Gift className="h-3 w-3" />
              Ücretsiz
            </span>
          ) : null}
        </div>

        {/* Başlık */}
        <h3 className="mb-2 line-clamp-2 text-xl font-black leading-snug tracking-tight text-white sm:text-[1.35rem]">
          {paket.ad}
        </h3>
        {paket.aciklama ? (
          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-slate-400">{paket.aciklama}</p>
        ) : (
          <div className="mb-5" />
        )}

        {/* Fiyat kutusu */}
        <div
          className={`mb-5 rounded-2xl border p-4 ${
            ucretsiz
              ? 'border-emerald-500/20 bg-emerald-500/[0.07]'
              : paket.populer
                ? 'border-[#2ABBA7]/25 bg-[#2ABBA7]/[0.06]'
                : 'border-white/[0.08] bg-white/[0.03]'
          }`}
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              {ucretsiz ? (
                <p className="text-3xl font-black tracking-tight text-emerald-400">Ücretsiz</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight text-white">
                      {fiyatGoster(efektif)}
                      <span className="ml-0.5 text-lg font-bold text-slate-400">₺</span>
                    </span>
                    {indirimVar ? (
                      <span className="text-sm font-semibold text-slate-500 line-through">
                        {fiyatGoster(paket.fiyat)} ₺
                      </span>
                    ) : null}
                  </div>
                  {denemeBasi != null && denemeBasi > 0 ? (
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                      Deneme başı ~{fiyatGoster(denemeBasi)} ₺
                    </p>
                  ) : null}
                </>
              )}
            </div>
            {indirimVar && indirimYuzde > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-1 text-[11px] font-black text-rose-300">
                <TrendingDown className="h-3 w-3" />%{indirimYuzde}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2ABBA7]/15 text-[#2ABBA7]">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-white">{sinavMetni}</p>
              <p className="text-[10px] text-slate-500">Anında erişim · detaylı analiz</p>
            </div>
          </div>
        </div>

        {/* Özellikler */}
        <ul className="mb-6 flex-1 space-y-2.5">
          {ozellikler.map((oz, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  paket.populer ? 'bg-[#2ABBA7]/20 text-[#2ABBA7]' : 'bg-white/[0.06] text-slate-400'
                }`}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="leading-snug">{oz}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto space-y-2.5">
          {ucretsiz && onUcretsizAl ? (
            <button
              type="button"
              disabled={ucretsizYukleniyor}
              onClick={onUcretsizAl}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition-all hover:brightness-110 disabled:opacity-60"
            >
              {ucretsizYukleniyor ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Hemen Ücretsiz Al
            </button>
          ) : (
            <Link
              href={detayHref}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-px hover:brightness-110 ${
                paket.populer
                  ? 'bg-gradient-to-r from-[#2ABBA7] via-[#25a894] to-[#7C6BFF] shadow-[#2ABBA7]/30'
                  : ucretsiz
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-600/25'
                    : 'bg-gradient-to-r from-[#2ABBA7] to-[#1fa897] shadow-teal-700/20'
              }`}
            >
              {ucretsiz ? 'Ücretsiz Başla' : 'Satın Al'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}

          {!kpssModu ? (
            <Link
              href={`/paket/${encodeURIComponent(paket.id)}`}
              className="flex w-full items-center justify-center gap-1 py-2 text-xs font-bold text-slate-500 transition-colors hover:text-[#2ABBA7]"
            >
              Paketi incele
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
