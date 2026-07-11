'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { Loader2, Sparkles, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { paketApi } from '@/lib/api';
import {
  kategoriHaritasi,
  paketKategoriFromPaket,
  type PaketKategoriKayit,
} from '@/lib/paketKategori';
import { resolveMarketingNavHref } from '@/lib/publicPaketlerHref';
import { PaketSatisKarti, type PaketSatisVeri } from '@/components/landing/PaketSatisKarti';

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

  const paketler: PaketSatisVeri[] = data?.data?.veri || [];
  const kategoriler: PaketKategoriKayit[] = kategorilerData?.data?.veri || [];
  const kategoriHarita = useMemo(() => kategoriHaritasi(kategoriler), [kategoriler]);

  const yksPaketler = useMemo(() => {
    return paketler.filter(
      (p) =>
        !(p.kategori?.toUpperCase().includes('KPSS') || p.ad.toUpperCase().includes('KPSS'))
    );
  }, [paketler]);

  const siraliPaketler = useMemo(() => {
    const sira = new Map(kategoriler.map((k, i) => [k.slug, i]));
    return [...yksPaketler].sort((a, b) => {
      const ka = sira.get(a.kategori || 'GENEL') ?? 999;
      const kb = sira.get(b.kategori || 'GENEL') ?? 999;
      if (ka !== kb) return ka - kb;
      return a.ad.localeCompare(b.ad, 'tr');
    });
  }, [yksPaketler, kategoriler]);

  const tumPaketlerLink = resolveMarketingNavHref(pb.tumPaketlerHref);

  return (
    <section id="paketler" className="relative py-20 md:py-28 bg-[#090F22] scroll-mt-20 overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#2ABBA7]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#7C6BFF]/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="absolute top-0 left-0 right-0">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
          <path d="M0 24C360 48 720 0 1080 32C1260 44 1440 16 1440 16V0H0V24Z" fill="#0A1024" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 md:mb-16"
        >
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#8FE4D8] mb-4">
              {pb.ustBaslik}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-black text-white tracking-tight leading-[1.1]">
              {pb.baslik}
            </h2>
            <p className="text-slate-400 mt-4 text-sm md:text-base leading-relaxed max-w-lg">{pb.aciklama}</p>
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

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#2ABBA7]" />
          </div>
        ) : paketler.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-[28px] border border-white/[0.06] bg-slate-900/50 p-14 text-center backdrop-blur-sm"
          >
            <Star className="w-10 h-10 text-[#2ABBA7] mx-auto mb-4 opacity-50" />
            <p className="text-white font-bold text-lg">{pb.bosPaketMesaj}</p>
            <p className="text-slate-400 text-sm mt-2">{pb.bosPaketAlt}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-7 items-stretch pt-2">
            {siraliPaketler.map((paket, i) => {
              const katInfo = paketKategoriFromPaket(paket, kategoriHarita);
              return (
                <PaketSatisKarti
                  key={paket.id}
                  paket={paket}
                  kategoriAd={katInfo.ad}
                  kategoriSlug={katInfo.slug}
                  index={i}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
          <path d="M0 32C360 8 720 48 1080 16C1260 4 1440 32 1440 32V48H0V32Z" fill="#0F2137" />
        </svg>
      </div>
    </section>
  );
}
