'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { Check, Loader2, Star, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { paketApi } from '@/lib/api';
import {
  kategoriHaritasi,
  paketKategoriFromPaket,
  type PaketKategoriKayit,
} from '@/lib/paketKategori';
import { resolveMarketingNavHref } from '@/lib/publicPaketlerHref';

interface Paket {
  id: string;
  ad: string;
  aciklama: string | null;
  kategori?: string;
  fiyat: number;
  indirimliFiyat: number | null;
  sinavSayisi: number;
  ozellikler: string[];
  aktif: boolean;
  populer: boolean;
}

export function Paketler() {
  const site = useSiteIcerik();
  const pb = site.paketBolum;

  const { data, isLoading } = useQuery({
    queryKey: ['landing-aktif-paketler'],
    queryFn: () => api.get('/paketler/aktif'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: kategorilerData } = useQuery({
    queryKey: ['landing-paket-kategorileri'],
    queryFn: () => paketApi.kategoriler(),
    staleTime: 5 * 60 * 1000,
  });

  const paketler: Paket[] = data?.data?.veri || [];
  const kategoriler: PaketKategoriKayit[] = kategorilerData?.data?.veri || [];
  const kategoriHarita = useMemo(() => kategoriHaritasi(kategoriler), [kategoriler]);

  const siraliPaketler = useMemo(() => {
    const sira = new Map(kategoriler.map((k, i) => [k.slug, i]));
    return [...paketler].sort((a, b) => {
      const ka = sira.get(a.kategori || 'GENEL') ?? 999;
      const kb = sira.get(b.kategori || 'GENEL') ?? 999;
      if (ka !== kb) return ka - kb;
      return a.ad.localeCompare(b.ad, 'tr');
    });
  }, [paketler, kategoriler]);

  const tumPaketlerLink = resolveMarketingNavHref(pb.tumPaketlerHref);

  const paketKarti = (paket: Paket, i: number) => {
    const katInfo = paketKategoriFromPaket(paket, kategoriHarita);
    return (
    <motion.div
      key={paket.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
      className={`relative h-full flex flex-col rounded-2xl border p-7 transition-all duration-300 overflow-hidden group
        ${paket.populer
          ? 'bg-gradient-to-b from-[#0F2137] via-[#132844] to-[#0F2137] border-[#2ABBA7]/30 shadow-[0_4px_32px_rgba(42,187,167,0.08)]'
          : 'bg-slate-900/50 border-white/[0.07] hover:border-white/[0.14]'
        }`}
    >
      {paket.populer && (
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#2ABBA7]/6 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className={`absolute top-0 left-0 right-0 h-1 ${
        paket.populer
          ? 'bg-gradient-to-r from-[#2ABBA7] via-[#2ABBA7] to-[#8FE4D8]'
          : 'bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-[#2ABBA7]/30 transition-all duration-500'
      }`} />

      {paket.populer && (
        <div className="absolute top-0 right-6">
          <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-b-xl bg-gradient-to-r from-[#2ABBA7] to-[#1fa897] text-white text-[10px] font-black shadow-lg">
            <Star className="w-3 h-3 fill-current" /> Popular
          </span>
        </div>
      )}

      <div className="relative">
        <div className="mb-5 mt-1">
          <span className={`inline-block mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${katInfo.renk}`}>
            {katInfo.ad}
          </span>
          <h3 className="text-lg font-black mb-2 text-white">{paket.ad}</h3>
          {paket.aciklama && (
            <p className={`text-xs leading-relaxed line-clamp-2 ${paket.populer ? 'text-slate-300/80' : 'text-slate-400'}`}>
              {paket.aciklama}
            </p>
          )}
        </div>

        <div className={`mb-5 pb-5 border-b border-dashed ${paket.populer ? 'border-white/[0.08]' : 'border-white/[0.06]'}`}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {paket.indirimliFiyat ?? paket.fiyat}TL
            </span>
            {paket.indirimliFiyat && (
              <span className="text-xs line-through text-slate-500">{paket.fiyat}TL</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#2ABBA7]">
            <Zap className="w-3.5 h-3.5" />
            {paket.sinavSayisi === 0 ? 'Sinirsiz sinav' : `${paket.sinavSayisi} sinav hakki`}
          </div>
        </div>

        <ul className="space-y-2.5 mb-6 flex-1">
          {(Array.isArray(paket.ozellikler) ? paket.ozellikler : []).slice(0, 5).map((oz, idx) => (
            <li key={idx} className="grid grid-cols-[1rem_1fr] gap-x-2.5 items-start text-xs">
              <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                paket.populer ? 'bg-[#2ABBA7]/15' : 'bg-white/[0.04]'
              }`}>
                <Check className={`w-2.5 h-2.5 ${paket.populer ? 'text-[#2ABBA7]' : 'text-slate-500'}`} />
              </div>
              <span className="text-slate-300 text-justify leading-relaxed hyphens-auto [text-align-last:left]">
                {oz}
              </span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-3 mt-auto">
          <Link
            href={`/paket/${encodeURIComponent(paket.id)}`}
            className={`inline-flex items-center justify-center rounded-xl py-3 font-black text-xs transition-all duration-300 ${
              paket.populer
                ? 'bg-gradient-to-r from-[#2ABBA7] to-[#1fa897] text-white hover:brightness-110 shadow-lg shadow-teal-600/25 hover:-translate-y-px'
                : 'bg-[#2ABBA7] text-white hover:bg-[#1fa897] hover:-translate-y-px'
            }`}
          >
            Satın Al
          </Link>
          <Link
            href={`/paket/${encodeURIComponent(paket.id)}`}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-3 font-bold text-xs transition-all duration-300 group/btn ${
              paket.populer
                ? 'border border-white/15 text-slate-200 hover:bg-white/[0.06]'
                : 'border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            Detay <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
    );
  };

  return (
    <section id="paketler" className="relative py-20 md:py-28 bg-[#090F22] scroll-mt-20 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#2ABBA7]/4 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#F7C948]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Wave top */}
      <div className="absolute top-0 left-0 right-0">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
          <path d="M0 24C360 48 720 0 1080 32C1260 44 1440 16 1440 16V0H0V24Z" fill="#0A1024" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14"
        >
          <div className="max-w-lg">
            <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#8FE4D8] mb-4">
              {pb.ustBaslik}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {pb.baslik}
            </h2>
            <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-md">{pb.aciklama}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={tumPaketlerLink}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-bold hover:bg-white/[0.08] hover:border-white/15 transition-all duration-200"
            >
              {pb.tumPaketler}
            </Link>
            <Link
              href={pb.kayitHref}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C6BFF] to-[#2ABBA7] text-white text-xs font-black hover:brightness-110 transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-px"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {pb.ucretsizDene}
            </Link>
          </div>
        </motion.div>

        {/* Packages */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#2ABBA7]" />
          </div>
        ) : paketler.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-14 text-center backdrop-blur-sm"
          >
            <Star className="w-10 h-10 text-[#2ABBA7] mx-auto mb-4 opacity-50" />
            <p className="text-white font-bold text-lg">{pb.bosPaketMesaj}</p>
            <p className="text-slate-400 text-sm mt-2">{pb.bosPaketAlt}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
            {siraliPaketler.map((paket, i) => paketKarti(paket, i))}
          </div>
        )}
      </div>

      {/* Wave bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
          <path d="M0 32C360 8 720 48 1080 16C1260 4 1440 32 1440 32V48H0V32Z" fill="#0F2137" />
        </svg>
      </div>
    </section>
  );
}
