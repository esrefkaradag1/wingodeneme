'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { analizApi } from '@/lib/api';
import { Calculator, Loader2, TrendingDown, Info, ArrowLeft, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DERS_SECENEKLERI = [
  'Matematik', 'Türkçe', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'İngilizce'
];

export default function NetSimulasyonuPage() {
  const [siralama, setSiralama] = useState<string>('50000');
  const [ders, setDers] = useState('Matematik');
  const [ekNet, setEkNet] = useState(5);

  const { data: analizData } = useQuery({ queryKey: ['analiz'], queryFn: () => analizApi.benim() });
  const analiz = analizData?.data?.veri;

  useEffect(() => {
    if (analiz?.enIyiSiralama) setSiralama(String(analiz.enIyiSiralama));
  }, [analiz?.enIyiSiralama]);

  const sim = useMutation({
    mutationFn: async () => {
      const { data } = await analizApi.netSimulasyon({
        siralama: parseInt(siralama.replace(/\D/g, ''), 10) || 1,
        ders,
        ekNet,
      });
      return data.veri;
    },
  });

  const sonuc = sim.data;

  return (
    <div className="space-y-8 max-w-2xl pb-12">
      {/* Header - Compact */}
      <section className="relative overflow-hidden rounded-2xl bg-indigo-600 p-8 text-white shadow-lg">
         <div className="relative z-10">
            <Link href="/rehber" className="inline-flex items-center gap-1.5 text-indigo-100 font-bold mb-4 hover:gap-2 transition-all text-xs opacity-80">
              <ArrowLeft className="w-4 h-4" /> Rehber
            </Link>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Calculator className="w-6 h-6" /> Net Simülasyonu
            </h1>
            <p className="text-indigo-100 mt-2 text-sm font-medium opacity-80 leading-relaxed max-w-lg">
               Net artışının sıralamana etkisini yapay zeka ile tahmin et.
            </p>
         </div>
      </section>

      <div className="card !p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Referans Sıralama</label>
             <input
               type="text"
               inputMode="numeric"
               value={siralama}
               onChange={(e) => setSiralama(e.target.value)}
               className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 transition-all font-bold text-xs text-gray-700 outline-none"
               placeholder="örn. 50000"
             />
           </div>
           <div>
             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Hedef Ders</label>
             <select value={ders} onChange={(e) => setDers(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 transition-all font-bold text-xs text-gray-700 outline-none">
               {DERS_SECENEKLERI.map((d) => (
                 <option key={d} value={d}>{d}</option>
               ))}
             </select>
           </div>
        </div>

        <div>
           <div className="flex justify-between items-center mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Kazanılacak Ek Net
              </label>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100">+{ekNet} Net</span>
           </div>
           <input
             type="range"
             min={0}
             max={20}
             step={0.5}
             value={ekNet}
             onChange={(e) => setEkNet(parseFloat(e.target.value))}
             className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
           />
        </div>

        <button
          onClick={() => sim.mutate()}
          disabled={sim.isPending}
          className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sim.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
          Sıralamayı Tahmin Et
        </button>
      </div>

      <AnimatePresence>
        {sonuc && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card !p-8 bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <h2 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-indigo-400">
                   <Target className="w-4 h-4" /> Tahmini Sonuç
                </h2>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Mevcut</p>
                    <p className="text-2xl font-bold text-gray-300">#{sonuc.mevcutSiralama.toLocaleString('tr-TR')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Tahmini Yeni</p>
                    <p className="text-2xl font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.2)]">#{sonuc.tahminiYeniSiralama.toLocaleString('tr-TR')}</p>
                  </div>
                </div>
                
                <div className="mt-8 flex items-center gap-2 text-emerald-400 font-bold text-xs">
                   <TrendingDown className="w-4 h-4" /> 
                   <span>~{sonuc.siralamaIyilesme.toLocaleString('tr-TR')} Sıra İyileşme (Yaklaşık %{sonuc.yuzdeIyilesmeYaklasik})</span>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex gap-2 text-[10px] text-gray-500 leading-relaxed font-medium">
                   <Info className="w-3.5 h-3.5 shrink-0" />
                   <span>{sonuc.uyari} {sonuc.metodNotu}</span>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
