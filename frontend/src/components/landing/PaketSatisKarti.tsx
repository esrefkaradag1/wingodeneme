'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ExternalLink,
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
  disUrl?: string | null;
  gorselUrl?: string | null;
};

type PaketSatisKartiProps = {
  paket: PaketSatisVeri;
  kategoriAd: string;
  kategoriSlug?: string;
  index?: number;
  kpssModu?: boolean;
  ucretsizYukleniyor?: boolean;
  onUcretsizAl?: () => void;
};

function kategoriStil(slug?: string): string {
  const s = (slug || '').toUpperCase();
  if (s.includes('KPSS')) return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  if (s.includes('LGS')) return 'bg-sky-50 text-sky-800 border-sky-200';
  if (s.includes('YKS') || s.includes('TYT') || s.includes('AYT'))
    return 'bg-wingo-50 text-wingo-800 border-wingo-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
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
  const wingolinkUrl = (paket.disUrl || '').trim();
  const wingolinkMi = wingolinkUrl.length > 0;
  const detayHref = wingolinkMi
    ? wingolinkUrl
    : kpssModu && paket.id.includes('kpss-')
      ? '/kayit'
      : `/paket/${encodeURIComponent(paket.id)}`;

  const sinavMetni =
    paket.sinavSayisi === 0
      ? 'Sınırsız deneme'
      : paket.sinavSayisi === 1
        ? '1 deneme hakkı'
        : `${paket.sinavSayisi} deneme hakkı`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -10, transition: { type: 'spring', stiffness: 380, damping: 20 } }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-white transition-shadow duration-500 ${
        paket.populer
          ? 'border-wingo-400 shadow-[0_16px_48px_-12px_rgba(13,148,136,0.4)] scale-[1.02] z-10'
          : ucretsiz
            ? 'border-emerald-200 shadow-[0_12px_32px_-16px_rgba(16,185,129,0.25)]'
            : 'border-edu-line shadow-[0_12px_32px_-16px_rgba(15,47,43,0.12)] hover:border-wingo-300 hover:shadow-[0_24px_48px_-16px_rgba(15,47,43,0.18)]'
      }`}
    >
      {/* Shine sweep */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <div className="absolute -inset-y-8 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
      </div>

      {paket.populer ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[1.75rem] z-0"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(13,148,136,0)',
              '0 0 0 4px rgba(13,148,136,0.18)',
              '0 0 0 0 rgba(13,148,136,0)',
            ],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      <div
        className={`relative h-1.5 w-full ${
          paket.populer
            ? 'bg-gradient-to-r from-wingo-500 via-orange-500 to-wingo-500 bg-[length:200%_100%] animate-gradient-x'
            : ucretsiz
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
              : 'bg-gradient-to-r from-transparent via-edu-line to-transparent group-hover:via-wingo-300'
        }`}
      />

      <div className="relative flex flex-1 flex-col p-6 sm:p-7">
        {paket.gorselUrl ? (
          <img
            src={paket.gorselUrl}
            alt=""
            className="mb-5 h-36 w-full rounded-2xl object-cover border border-edu-line"
          />
        ) : null}
        <div className="mb-5 flex items-start justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${kategoriStil(kategoriSlug)}`}
          >
            {kategoriAd}
          </span>
          {paket.populer ? (
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-950 shadow-md shadow-amber-400/30"
            >
              <Star className="h-3 w-3 fill-current" />
              En çok satan
            </motion.span>
          ) : ucretsiz ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
              <Gift className="h-3 w-3" />
              Ücretsiz
            </span>
          ) : null}
        </div>

        <h3 className="font-display mb-2 line-clamp-2 text-xl font-extrabold leading-snug tracking-tight text-edu-ink sm:text-[1.35rem]">
          {paket.ad}
        </h3>
        {paket.aciklama ? (
          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-edu-muted">{paket.aciklama}</p>
        ) : (
          <div className="mb-5" />
        )}

        <div
          className={`mb-5 rounded-2xl border p-4 transition-colors duration-300 ${
            ucretsiz
              ? 'border-emerald-100 bg-emerald-50/80'
              : paket.populer
                ? 'border-wingo-100 bg-wingo-50/80 group-hover:bg-wingo-50'
                : 'border-edu-line bg-edu-bg/80 group-hover:bg-white'
          }`}
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              {ucretsiz ? (
                <p className="font-display text-3xl font-extrabold tracking-tight text-emerald-600">
                  Ücretsiz
                </p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <motion.span
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                      className="font-display text-3xl font-extrabold tracking-tight text-edu-ink"
                    >
                      {fiyatGoster(efektif)}
                      <span className="ml-0.5 text-lg font-bold text-edu-muted">₺</span>
                    </motion.span>
                    {indirimVar ? (
                      <span className="text-sm font-semibold text-edu-muted/70 line-through">
                        {fiyatGoster(paket.fiyat)} ₺
                      </span>
                    ) : null}
                  </div>
                  {denemeBasi != null && denemeBasi > 0 ? (
                    <p className="mt-1 text-[11px] font-semibold text-edu-muted">
                      Deneme başı ~{fiyatGoster(denemeBasi)} ₺
                    </p>
                  ) : null}
                </>
              )}
            </div>
            {indirimVar && indirimYuzde > 0 ? (
              <motion.span
                animate={{ rotate: [0, -3, 3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-extrabold text-rose-600"
              >
                <TrendingDown className="h-3 w-3" />%{indirimYuzde}
              </motion.span>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-edu-line pt-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-wingo-100 text-wingo-700">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-edu-ink">{sinavMetni}</p>
              <p className="text-[10px] text-edu-muted">Anında erişim · detaylı analiz</p>
            </div>
          </div>
        </div>

        <ul className="mb-6 flex-1 space-y-2.5">
          {ozellikler.map((oz, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-edu-ink/80">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  paket.populer ? 'bg-wingo-100 text-wingo-700' : 'bg-edu-mint text-wingo-600'
                }`}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="leading-snug">{oz}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-2.5">
          {wingolinkMi ? (
            <a
              href={wingolinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-edu-cta hover:bg-edu-cta-hover py-3.5 text-sm font-extrabold text-white shadow-md shadow-orange-500/25 transition-all"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
              <span className="relative z-10 flex items-center gap-2">
                Wingolink&apos;te Satın Al
                <ExternalLink className="h-4 w-4" />
              </span>
            </a>
          ) : ucretsiz && onUcretsizAl ? (
            <button
              type="button"
              disabled={ucretsizYukleniyor}
              onClick={onUcretsizAl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-sm font-extrabold text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
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
              className={`group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:-translate-y-0.5 ${
                paket.populer
                  ? 'bg-wingo-600 hover:bg-wingo-700 shadow-wingo-600/30'
                  : ucretsiz
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-edu-cta hover:bg-edu-cta-hover shadow-orange-500/25'
              }`}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
              <span className="relative z-10 flex items-center gap-2">
                {ucretsiz ? 'Ücretsiz Başla' : 'Hemen Satın Al'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
              </span>
            </Link>
          )}

          {!kpssModu && !wingolinkMi ? (
            <Link
              href={`/paket/${encodeURIComponent(paket.id)}`}
              className="flex w-full items-center justify-center gap-1 py-2 text-xs font-bold text-edu-muted transition-colors hover:text-wingo-700"
            >
              Paketi incele
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
          {wingolinkMi ? (
            <p className="text-center text-[11px] text-edu-muted">
              Satın alma Wingolink üzerinde tamamlanır
            </p>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
