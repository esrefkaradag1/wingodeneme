'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { universiteApi, analizApi } from '@/lib/api';
import { 
  GraduationCap, 
  Search, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sparkles, 
  ArrowUpRight,
  Target,
  Zap,
  ChevronRight,
  CircleDot
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { motion, AnimatePresence } from 'framer-motion';

const ihtimalRenkleri: Record<string, { bg: string; text: string; light: string }> = {
  ÇOK_YÜKSEK: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' },
  YÜKSEK: { bg: 'bg-emerald-400', text: 'text-emerald-600', light: 'bg-emerald-50/50' },
  ORTA: { bg: 'bg-amber-400', text: 'text-amber-600', light: 'bg-amber-50' },
  DÜŞÜK: { bg: 'bg-orange-400', text: 'text-orange-600', light: 'bg-orange-50' },
  ÇOK_DÜŞÜK: { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50' },
  BELİRSİZ: { bg: 'bg-slate-400', text: 'text-slate-600', light: 'bg-slate-50' },
};

export default function UniversiteSayfasi() {
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaSonuclari, setAramaSonuclari] = useState<any[]>([]);
  const qc = useQueryClient();

  const { data: hedeflerData } = useQuery({
    queryKey: ['hedeflerim'],
    queryFn: () => universiteApi.hedeflerim(),
  });

  const { data: analizData } = useQuery({
    queryKey: ['analiz'],
    queryFn: () => analizApi.benim(),
  });

  const hedefler = hedeflerData?.data?.veri || [];
  const sonSiralama = analizData?.data?.veri?.enIyiSiralama;
  const sonNet = analizData?.data?.veri?.ortalamaNet;

  const { data: tahminData } = useQuery({
    queryKey: ['tahmin', sonNet, sonSiralama],
    queryFn: () => universiteApi.tahmin(sonNet || 0, sonSiralama || 0),
    enabled: !!hedefler.length,
  });

  const tahminler = tahminData?.data?.veri || [];
  const tahminMap = new Map<string, { ihtimal: string; yuzde: number }>(
    tahminler.map((t: any) => [t.bolumId || '', t])
  );

  const hedefEkleMutation = useMutation({
    mutationFn: (bolumId: string) => universiteApi.hedefEkle(bolumId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hedeflerim'] });
      toast.basarili('Hedef eklendi!');
    },
  });

  const aramaYap = async (q: string) => {
    setAramaMetni(q);
    if (q.length < 2) { setAramaSonuclari([]); return; }
    const yanit = await universiteApi.ara(q);
    setAramaSonuclari(yanit.data.veri || []);
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header - Increased font sizes */}
      <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
              <Zap className="w-4 h-4" /> Akıllı Tahmin Sistemi
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Üniversite Tahmin Motoru</h1>
            <p className="text-indigo-50 mt-3 text-base font-medium opacity-90 max-w-xl leading-relaxed">
              Mevcut deneme performansın ve akademik hedeflerinle hangi üniversitelere girebileceğini keşfet.
            </p>
          </motion.div>
          
          <Link
            href="/tercih-robotu"
            className="px-8 py-4 rounded-2xl bg-white text-indigo-700 font-bold text-sm hover:bg-gray-50 transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            Tercih Robotu <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Sol Kolon: Arama */}
        <div className="lg:col-span-6 space-y-8">
           <div className="card !p-8 shadow-md">
              <h2 className="text-base font-bold text-gray-900 mb-8 flex items-center gap-3">
                 <Search className="w-5 h-5 text-indigo-500" /> Üniversite & Bölüm Filtrele
              </h2>
              <div className="relative mb-8">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input
                   type="text"
                   value={aramaMetni}
                   onChange={(e) => aramaYap(e.target.value)}
                   placeholder="Hayalindeki üniversite veya bölümü yaz..."
                   className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 transition-all font-bold text-sm text-gray-700 outline-none shadow-sm"
                 />
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {aramaSonuclari.map((uni, idx) => (
                  <motion.div 
                    key={uni.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 rounded-2xl border border-gray-100 bg-white hover:bg-indigo-50/30 hover:border-indigo-100 transition-all group shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
                      <div>
                        <p className="font-bold text-sm text-gray-900 leading-tight">{uni.kisaAd || uni.ad}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{uni.sehir} • {uni.tur}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {uni.bolumler?.slice(0, 5).map((bolum: any) => (
                        <div key={bolum.id} className="flex items-center justify-between py-2 group/item">
                          <div className="min-w-0 pr-6">
                            <p className="text-sm font-bold text-gray-700 truncate">{bolum.bolumAdi}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-tight">{bolum.sinavTuru} • {bolum.minSiralama?.toLocaleString('tr-TR')} Sıralama</p>
                          </div>
                          <button
                            onClick={() => hedefEkleMutation.mutate(bolum.id)}
                            disabled={hedefEkleMutation.isPending}
                            className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all transform active:scale-90 shadow-sm"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
                {aramaMetni.length >= 2 && aramaSonuclari.length === 0 && (
                  <div className="text-center py-16">
                     <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Sonuç Bulunamadı</p>
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* Sağ Kolon: Tahminler */}
        <div className="lg:col-span-6 space-y-8">
           <div className="card !p-8 shadow-2xl border-white bg-white/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-10">
                 <h2 className="text-base font-bold text-gray-900 flex items-center gap-3">
                    <Target className="w-6 h-6 text-emerald-500" /> Tahmini Sonuçlarım
                 </h2>
                 {sonSiralama && (
                   <div className="text-right">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                        Sıralaman: #{sonSiralama.toLocaleString('tr-TR')}
                      </span>
                   </div>
                 )}
              </div>

              {hedefler.length === 0 ? (
                <div className="text-center py-24 bg-gray-50/50 rounded-3xl border-3 border-dashed border-gray-100">
                  <GraduationCap className="w-16 h-16 mx-auto mb-6 text-gray-200" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Henüz Hedef Eklemedin</p>
                  <p className="text-xs text-gray-400 mt-3 px-12">Sol taraftaki arama panelinden hayalindeki bölümleri bulup listenize ekleyin.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {hedefler.map((hedef: any, idx: number) => {
                    const tahmin = tahminMap.get(hedef.bolum.id);
                    const ihtimal = tahmin ? ihtimalRenkleri[tahmin.ihtimal] : ihtimalRenkleri.BELİRSİZ;

                    return (
                      <motion.div 
                        key={hedef.id} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 rounded-2xl bg-white border border-gray-100 shadow-lg relative overflow-hidden group hover:border-indigo-200 transition-all"
                      >
                        <div className="relative z-10">
                           <div className="flex items-start justify-between mb-6">
                             <div className="min-w-0 pr-6">
                               <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1.5">{hedef.bolum.universite.kisaAd || hedef.bolum.universite.ad}</p>
                               <h4 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">{hedef.bolum.bolumAdi}</h4>
                             </div>
                             {tahmin && (
                               <div className="text-right shrink-0">
                                  <div className={`text-xs font-bold ${ihtimal.text} uppercase tracking-tighter mb-1.5`}>%{tahmin.yuzde} İhtimal</div>
                                  <div className={`h-2.5 w-24 ${ihtimal.light} rounded-full overflow-hidden inline-block border border-black/5 shadow-inner`}>
                                     <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${tahmin.yuzde}%` }} 
                                        className={`h-full ${ihtimal.bg} shadow-md`} 
                                     />
                                  </div>
                               </div>
                             )}
                           </div>
                           
                           <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                             <span className="flex items-center gap-2"><CircleDot className="w-4 h-4 text-indigo-400" /> {hedef.bolum.minSiralama?.toLocaleString('tr-TR')} Sıra</span>
                             <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" /> {hedef.bolum.minPuan || '—'} Puan</span>
                             <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> {hedef.bolum.sinavTuru}</span>
                           </div>
                        </div>

                        {/* Background Decoration */}
                        <div className={`absolute left-0 top-0 w-1.5 h-full ${ihtimal.bg} opacity-40 shadow-sm`} />
                      </motion.div>
                    );
                  })}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
