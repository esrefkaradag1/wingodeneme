'use client';

import { useQuery } from '@tanstack/react-query';
import { sinavApi } from '@/lib/api';
import SinavAnalizOzet from '@/components/ogrenci/SinavAnalizOzet';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Lock, 
  ArrowRight, 
  Users, 
  Calendar as CalendarIcon, 
  Trophy,
  Zap,
  Star,
  Hourglass,
  Layout
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { isKpssMode } from '@/lib/platform';

interface Sinav {
  id: string;
  baslik: string;
  aciklama?: string;
  tur: string;
  baslangicZamani: string;
  bitisZamani: string;
  sureDakika: number;
  durum: 'AKTIF' | 'YAKINDA' | 'BITTI';
  soruSayisi: number;
  katilimciSayisi: number;
  katilimId?: string | null;
  katilimDurumu?: string | null;
}

const durumRenkleri = {
  AKTIF: { 
    bg: 'bg-emerald-50 text-emerald-600', 
    border: 'border-emerald-100', 
    ikon: Zap,
    etiket: 'Canlı Yayında'
  },
  YAKINDA: { 
    bg: 'bg-blue-50 text-blue-600', 
    border: 'border-blue-100', 
    ikon: Clock,
    etiket: 'Hazırlanıyor'
  },
  BITTI: { 
    bg: 'bg-slate-50 text-slate-500', 
    border: 'border-slate-100', 
    ikon: Lock,
    etiket: 'Tamamlandı'
  },
};

export default function SinavlarSayfasi() {
  const [tab, setTab] = useState<'SINAVLAR' | 'ANALIZ'>('SINAVLAR');
  const panelKpss = isKpssMode();
  const { data, isLoading } = useQuery({
    queryKey: ['sinavlar', panelKpss ? 'kpss' : 'yks'],
    queryFn: () => sinavApi.liste(),
    refetchInterval: (query) => {
      const sinavlar = (query.state.data as any)?.data?.veri || [];
      return sinavlar.some((s: any) => s.durum === 'AKTIF') ? 60000 : false;
    },
  });

  const sinavlar: Sinav[] = data?.data?.veri || [];
  const aktifler = sinavlar.filter((s) => s.durum === 'AKTIF');
  const yakindakiler = sinavlar.filter((s) => s.durum === 'YAKINDA');
  const bitmisler = sinavlar.filter((s) => s.durum === 'BITTI');

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-white/50 rounded-2xl animate-pulse border border-white" />
        ))}
      </div>
    );
  }

  const SinavKarti = ({ sinav, i }: { sinav: Sinav; i: number }) => {
    const stil = durumRenkleri[sinav.durum];
    const Ikon = stil.ikon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        whileHover={{ y: -2 }}
        className="group"
      >
        <div className="card h-full flex flex-col border-white hover:border-indigo-100 transition-all duration-300">
          {/* Üst Alan */}
          <div className="mb-4 flex items-start justify-between">
            <div className={`w-10 h-10 rounded-xl ${stil.bg} flex items-center justify-center shadow-sm transition-transform group-hover:scale-105`}>
              <Ikon className="w-5 h-5" />
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${stil.bg} border ${stil.border}`}>
              {stil.etiket}
            </div>
          </div>

          {/* İçerik */}
          <div className="flex-1 space-y-2">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">{sinav.tur}</span>
              <h3 className="text-base font-bold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors">
                {sinav.baslik}
              </h3>
            </div>
            
            {sinav.aciklama && (
              <p className="text-xs text-gray-500 font-medium line-clamp-2 leading-relaxed">
                {sinav.aciklama}
              </p>
            )}

            <div className="pt-2 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                 <Hourglass className="w-3.5 h-3.5 text-indigo-400" />
                 {sinav.sureDakika} Dakika
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                 <Layout className="w-3.5 h-3.5 text-indigo-400" />
                 {sinav.soruSayisi} Soru
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                 <Users className="w-3.5 h-3.5 text-indigo-400" />
                 {sinav.katilimciSayisi} Kişi
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                 <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                 {format(new Date(sinav.baslangicZamani), 'd MMM', { locale: tr })}
              </div>
            </div>
          </div>

          {/* Aksiyon Butonu */}
          <div className="mt-6 space-y-2">
            {sinav.durum === 'AKTIF' && sinav.katilimDurumu !== 'TAMAMLANDI' && (
              <Link
                href={`/sinav/${sinav.id}`}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                {sinav.katilimDurumu === 'DEVAM_EDIYOR' ? 'Sınava Devam Et' : 'Sınava Başla'}{' '}
                <Zap className="w-3.5 h-3.5 fill-white" />
              </Link>
            )}

            {sinav.katilimId && sinav.katilimDurumu === 'TAMAMLANDI' && (
              <>
                <Link
                  href={`/sinav/${sinav.id}`}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  Soruları İncele <BookOpen className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/sinavlar/${sinav.katilimId}/sonuc`}
                  className="w-full bg-white border border-gray-100 text-gray-900 hover:bg-gray-50 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  Sonuçları Gör <Trophy className="w-3.5 h-3.5 text-amber-500" />
                </Link>
              </>
            )}

            {sinav.durum === 'BITTI' && !sinav.katilimId && (
              <div className="w-full bg-gray-50 border border-gray-100 text-gray-400 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                Katılım Sağlanmadı <Lock className="w-3.5 h-3.5" />
              </div>
            )}

            {sinav.durum === 'YAKINDA' && (
              <div className="w-full bg-blue-50 border border-blue-100 text-blue-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                Hazırlanıyor <Clock className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Paneli - Daha Flat ve Kompakt */}
      <section className="relative overflow-hidden rounded-2xl bg-indigo-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-2xl font-bold tracking-tight">Sınav Hub</h1>
            <p className="text-indigo-100 mt-2 text-sm font-medium opacity-80 max-w-lg">
              Katıldığın tüm sınavları ve gelecek oturumları buradan yönetebilirsin.
            </p>
          </motion.div>

          <div className="mt-5 inline-flex rounded-2xl bg-white/10 border border-white/15 p-1 gap-1">
            <button
              type="button"
              onClick={() => setTab('SINAVLAR')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                tab === 'SINAVLAR' ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Sınavlar
            </button>
            <button
              type="button"
              onClick={() => setTab('ANALIZ')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                tab === 'ANALIZ' ? 'bg-white text-indigo-700 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Analiz & Plan
            </button>
          </div>

          <div className="flex flex-wrap gap-6 mt-6">
            <div className="flex flex-col">
              <span className="text-indigo-200 text-[9px] font-bold uppercase tracking-wider">Aktif</span>
              <span className="text-xl font-bold">{aktifler.length}</span>
            </div>
            <div className="w-px h-6 bg-white/20 hidden sm:block mt-2" />
            <div className="flex flex-col">
              <span className="text-indigo-200 text-[9px] font-bold uppercase tracking-wider">Biten</span>
              <span className="text-xl font-bold">{bitmisler.filter(s => s.katilimId).length}</span>
            </div>
          </div>
        </div>
      </section>

      {tab === 'ANALIZ' ? (
        <SinavAnalizOzet />
      ) : (
        /* Sınav Listeleri */
        <div className="space-y-8">
          {aktifler.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm" />
                Aktif Sınavlar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {aktifler.map((s, i) => <SinavKarti key={s.id} sinav={s} i={i} />)}
              </div>
            </section>
          )}

          {yakindakiler.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-900 mb-4">Yaklaşan Sınavlar</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {yakindakiler.map((s, i) => <SinavKarti key={s.id} sinav={s} i={i} />)}
              </div>
            </section>
          )}

          {bitmisler.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-500 mb-4">Sınav Geçmişi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-90">
                {bitmisler.map((s, i) => <SinavKarti key={s.id} sinav={s} i={i} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
