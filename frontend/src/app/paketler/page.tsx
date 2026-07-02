'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Sparkles, Star, Zap } from 'lucide-react';
import { api, paketApi } from '@/lib/api';
import { MarketingShell } from '@/components/layout/MarketingShell';
import {
  kategoriHaritasi,
  paketKategoriFromPaket,
  paketKategoriRenk,
  type PaketKategoriKayit,
} from '@/lib/paketKategori';

interface Paket {
  id: string;
  ad: string;
  aciklama: string | null;
  kategori?: string;
  fiyat: number;
  indirimliFiyat: number | null;
  sinavSayisi: number;
  ozellikler: string[];
  populer: boolean;
}

export default function PaketlerSayfasi() {
  const [kategoriFiltre, setKategoriFiltre] = useState<string | 'TUMU'>('TUMU');

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

  const filtreliPaketler = useMemo(() => {
    if (kategoriFiltre === 'TUMU') return paketler;
    return paketler.filter((p) => (p.kategori || 'GENEL') === kategoriFiltre);
  }, [paketler, kategoriFiltre]);

  const siraliPaketler = useMemo(() => {
    const sira = new Map(kategoriler.map((k, i) => [k.slug, i]));
    return [...filtreliPaketler].sort((a, b) => {
      const ka = sira.get(a.kategori || 'GENEL') ?? 999;
      const kb = sira.get(b.kategori || 'GENEL') ?? 999;
      if (ka !== kb) return ka - kb;
      return a.ad.localeCompare(b.ad, 'tr');
    });
  }, [filtreliPaketler, kategoriler]);

  const kategoriSayilari = useMemo(() => {
    const say: Record<string, number> = {};
    for (const p of paketler) {
      const k = p.kategori || 'GENEL';
      say[k] = (say[k] || 0) + 1;
    }
    return say;
  }, [paketler]);

  return (
    <MarketingShell>
      <div className="px-4 sm:px-6 lg:px-8 pb-16 md:pb-20 flex-1">
        <div className="max-w-7xl mx-auto pt-6 md:pt-10">
          <div className="mb-10 md:mb-14">
            <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#8FE4D8] mb-4">
              Paketler
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Tüm deneme paketleri
            </h1>
            <p className="text-slate-400 mt-4 max-w-2xl text-sm md:text-base leading-relaxed">
              Paketleri inceleyin, sınav takviminden istediğiniz denemeleri seçerek satın alın veya
              toplu paket fiyatından yararlanın.
            </p>
            <Link
              href="/kayit"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C6BFF] to-[#2ABBA7] text-white text-xs font-black hover:brightness-110 transition-all shadow-lg shadow-indigo-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ücretsiz dene
            </Link>
          </div>

          {kategoriler.filter((k) => (kategoriSayilari[k.slug] || 0) > 0).length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <button
                type="button"
                onClick={() => setKategoriFiltre('TUMU')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                  kategoriFiltre === 'TUMU'
                    ? 'bg-[#2ABBA7] text-white border-[#2ABBA7]'
                    : 'bg-white/[0.04] text-slate-300 border-white/10 hover:border-white/20'
                }`}
              >
                Tümü ({paketler.length})
              </button>
              {kategoriler
                .filter((k) => (kategoriSayilari[k.slug] || 0) > 0)
                .map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKategoriFiltre(k.slug)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                      kategoriFiltre === k.slug
                        ? 'bg-[#2ABBA7] text-white border-[#2ABBA7]'
                        : `${paketKategoriRenk(k.slug, kategoriHarita)} hover:opacity-90`
                    }`}
                  >
                    {k.ad} ({kategoriSayilari[k.slug]})
                  </button>
                ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-[#2ABBA7]" />
            </div>
          ) : paketler.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-14 text-center">
              <Star className="w-10 h-10 text-[#2ABBA7] mx-auto mb-4 opacity-50" />
              <p className="text-white font-bold text-lg">Şu an aktif bir paket yok.</p>
              <p className="text-slate-400 text-sm mt-2">Yakında yeni paketler eklenecek.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              {siraliPaketler.map((paket, i) => {
                const katInfo = paketKategoriFromPaket(paket, kategoriHarita);
                return (
                  <motion.div
                    key={paket.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className={`relative h-full flex flex-col rounded-2xl border p-7 overflow-hidden ${
                      paket.populer
                        ? 'bg-gradient-to-b from-[#0F2137] via-[#132844] to-[#0F2137] border-[#2ABBA7]/30'
                        : 'bg-slate-900/50 border-white/[0.07]'
                    }`}
                  >
                    {paket.populer && (
                      <div className="absolute top-0 right-6">
                        <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-b-xl bg-gradient-to-r from-[#2ABBA7] to-[#1fa897] text-white text-[10px] font-black">
                          <Star className="w-3 h-3 fill-current" /> Popüler
                        </span>
                      </div>
                    )}
                    <span
                      className={`inline-block mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${katInfo.renk}`}
                    >
                      {katInfo.ad}
                    </span>
                    <h2 className="text-lg font-black text-white mb-2">{paket.ad}</h2>
                    {paket.aciklama && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">{paket.aciklama}</p>
                    )}
                    <div className="mb-5 pb-5 border-b border-dashed border-white/[0.06]">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">
                          {(paket.indirimliFiyat ?? paket.fiyat).toLocaleString('tr-TR')} ₺
                        </span>
                        {paket.indirimliFiyat && (
                          <span className="text-xs line-through text-slate-500">
                            {paket.fiyat.toLocaleString('tr-TR')} ₺
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#2ABBA7]">
                        <Zap className="w-3.5 h-3.5" />
                        {paket.sinavSayisi === 0
                          ? 'Sınırsız sınav'
                          : `${paket.sinavSayisi} sınav hakkı`}
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {(Array.isArray(paket.ozellikler) ? paket.ozellikler : [])
                        .slice(0, 4)
                        .map((oz, idx) => (
                          <li key={idx} className="grid grid-cols-[0.875rem_1fr] gap-x-2.5 items-start text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-[#2ABBA7] shrink-0 mt-0.5" />
                            <span className="text-justify leading-relaxed hyphens-auto [text-align-last:left]">
                              {oz}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <Link
                        href={`/paket/${encodeURIComponent(paket.id)}`}
                        className="inline-flex items-center justify-center rounded-xl py-3 font-black text-xs bg-[#2ABBA7] text-white hover:bg-[#1fa897] transition-colors"
                      >
                        Denemeleri seç
                      </Link>
                      <Link
                        href={`/paket/${encodeURIComponent(paket.id)}`}
                        className="inline-flex items-center justify-center gap-1 rounded-xl py-3 font-bold text-xs border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
                      >
                        Detay <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MarketingShell>
  );
}
