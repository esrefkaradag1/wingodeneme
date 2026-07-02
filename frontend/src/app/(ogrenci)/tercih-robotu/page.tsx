'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { universiteApi } from '@/lib/api';
import { 
  Sparkles, 
  Filter, 
  Search, 
  Plus, 
  Trash2, 
  MapPin, 
  CheckCircle2,
  GraduationCap,
  ChevronDown,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  List,
  Download,
  Info
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { motion, AnimatePresence } from 'framer-motion';

export default function TercihRobotuPage() {
  const [arama, setArama] = useState('');
  const [sehir, setSehir] = useState('');
  const [tur, setTur] = useState<'DEVLET' | 'VAKIF' | ''>('');
  const [puanTuru, setPuanTuru] = useState<'TYT' | 'AYT' | 'LGS' | ''>('');
  const [minSiralama, setMinSiralama] = useState('');
  const [maxSiralama, setMaxSiralama] = useState('');
  const [sonuclar, setSonuclar] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'table' | 'grid'>('table');

  const qc = useQueryClient();

  const { data: hedeflerData } = useQuery({
    queryKey: ['hedeflerim'],
    queryFn: () => universiteApi.hedeflerim(),
  });

  const tercihler = hedeflerData?.data?.veri || [];

  const araMutation = useMutation({
    mutationFn: () => {
      return universiteApi.ara(arama, {
        ...(sehir ? { sehir } : {}),
        ...(tur ? { universiteTuru: tur } : {}),
        ...(puanTuru ? { sinavTuru: puanTuru as any } : {}),
        ...(minSiralama ? { minSiralama: parseInt(minSiralama, 10) } : {}),
        ...(maxSiralama ? { maxSiralama: parseInt(maxSiralama, 10) } : {}),
      });
    },
    onSuccess: (yanit) => setSonuclar(yanit.data?.veri || []),
    onError: () => toast.hata('Arama sırasında hata oluştu'),
  });

  const tercihEkleMutation = useMutation({
    mutationFn: (bolumId: string) => universiteApi.hedefEkle(bolumId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hedeflerim'] });
      toast.basarili('Listeye eklendi');
    },
  });

  const tercihSilMutation = useMutation({
    mutationFn: (bolumId: string) => universiteApi.hedefSil(bolumId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hedeflerim'] });
      toast.basarili('Listeden çıkarıldı');
    },
  });

  const allBolumler = useMemo(() => {
    return sonuclar.flatMap(uni => (uni.bolumler || []).map((b: any) => ({ ...b, universite: uni })));
  }, [sonuclar]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-4">
               <GraduationCap className="w-10 h-10 text-indigo-600" />
               Tercih Robotu <span className="text-indigo-600">2026</span>
            </h1>
            <p className="text-gray-500 font-medium mt-2">Binlerce bölüm arasından hedeflerine en uygun olanı keşfet.</p>
          </div>

          <div className="flex items-center gap-3">
             <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex">
                <button 
                  onClick={() => setViewType('table')}
                  className={`p-2.5 rounded-xl transition-all ${viewType === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <List className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewType('grid')}
                  className={`p-2.5 rounded-xl transition-all ${viewType === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <LayoutGrid className="w-5 h-5" />
                </button>
             </div>
             <button className="btn-secondary !py-3 flex items-center gap-2">
                <Download className="w-4 h-4" /> PDF Aktar
             </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Filters */}
          <aside className="lg:col-span-3 space-y-6 sticky top-8">
             <div className="card !p-6 border-none shadow-xl shadow-gray-200/50">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center justify-between">
                   Filtreler
                   <Filter className="w-4 h-4 text-indigo-500" />
                </h3>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Arama</label>
                      <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <input 
                            value={arama} 
                            onChange={e => setArama(e.target.value)}
                            placeholder="Üniversite veya bölüm..." 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Şehir</label>
                      <select 
                        value={sehir}
                        onChange={e => setSehir(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm appearance-none"
                      >
                         <option value="">Tümü</option>
                         <option value="İstanbul">İstanbul</option>
                         <option value="Ankara">Ankara</option>
                         <option value="İzmir">İzmir</option>
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Üniversite Türü</label>
                      <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => setTur(tur === 'DEVLET' ? '' : 'DEVLET')}
                            className={`py-3 rounded-xl text-xs font-bold transition-all ${tur === 'DEVLET' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                         >
                            Devlet
                         </button>
                         <button 
                            onClick={() => setTur(tur === 'VAKIF' ? '' : 'VAKIF')}
                            className={`py-3 rounded-xl text-xs font-bold transition-all ${tur === 'VAKIF' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                         >
                            Vakıf
                         </button>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Sıralama Aralığı</label>
                      <div className="flex gap-2 items-center">
                         <input 
                            type="number"
                            value={minSiralama}
                            onChange={e => setMinSiralama(e.target.value)}
                            placeholder="Min" 
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                         />
                         <Minus className="w-4 h-4 text-gray-300" />
                         <input 
                            type="number"
                            value={maxSiralama}
                            onChange={e => setMaxSiralama(e.target.value)}
                            placeholder="Max" 
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                         />
                      </div>
                   </div>

                   <button 
                      onClick={() => araMutation.mutate()}
                      disabled={araMutation.isPending}
                      className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                   >
                      {araMutation.isPending ? 'Sorgulanıyor...' : 'Sonuçları Filtrele'}
                   </button>
                </div>
             </div>

             {/* Selected List Quick Summary */}
             <div className="card !p-6 bg-indigo-600 text-white border-none shadow-xl shadow-indigo-200">
                <div className="flex items-center justify-between mb-4">
                   <h4 className="text-sm font-black uppercase tracking-wider">Tercih Havuzu</h4>
                   <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{tercihler.length}</span>
                </div>
                <div className="space-y-3">
                   {tercihler.slice(0, 3).map((t: any) => (
                      <div key={t.id} className="text-[11px] font-medium opacity-80 truncate border-l-2 border-white/20 pl-3">
                         {t.bolum.bolumAdi}
                      </div>
                   ))}
                   {tercihler.length > 3 && (
                      <div className="text-[10px] font-bold opacity-60 text-center pt-2">
                         + {tercihler.length - 3} Bölüm Daha
                      </div>
                   )}
                </div>
             </div>
          </aside>

          {/* Main Results Area */}
          <main className="lg:col-span-9">
             <AnimatePresence mode="wait">
                {allBolumler.length > 0 ? (
                   <motion.div 
                      key={viewType}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                   >
                      {viewType === 'table' ? (
                         <div className="card !p-0 overflow-hidden border-none shadow-2xl shadow-gray-200/50">
                            <div className="overflow-x-auto">
                               <table className="w-full text-left border-collapse">
                                  <thead>
                                     <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Üniversite & Bölüm</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Şehir</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Puan / Sıralama</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">İşlem</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                     {allBolumler.map((bolum) => {
                                        const ekli = tercihler.some((t: any) => t.bolum.id === bolum.id);
                                        return (
                                           <tr key={bolum.id} className="hover:bg-indigo-50/20 transition-colors group">
                                              <td className="px-6 py-5">
                                                 <div className="flex flex-col">
                                                    <span className="text-xs font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{bolum.universite.ad}</span>
                                                    <span className="text-[11px] font-bold text-gray-500 mt-1">{bolum.bolumAdi}</span>
                                                    <div className="flex gap-2 mt-2">
                                                       <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${bolum.universite.tur === 'DEVLET' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                          {bolum.universite.tur}
                                                       </span>
                                                       <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">
                                                          {bolum.sinavTuru}
                                                       </span>
                                                    </div>
                                                 </div>
                                              </td>
                                              <td className="px-6 py-5">
                                                 <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 text-gray-400" /> {bolum.universite.sehir}
                                                 </span>
                                              </td>
                                              <td className="px-6 py-5">
                                                 <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                       <span className="text-sm font-black text-gray-900">{bolum.minSiralama?.toLocaleString('tr-TR')}</span>
                                                       <TrendingDown className="w-3 h-3 text-emerald-500" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 mt-1">{bolum.minPuan || '---'} Puan</span>
                                                 </div>
                                              </td>
                                              <td className="px-6 py-5">
                                                 <div className="flex justify-center">
                                                    <button 
                                                      onClick={() => ekli ? tercihSilMutation.mutate(bolum.id) : tercihEkleMutation.mutate(bolum.id)}
                                                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ekli ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-gray-50 text-gray-400 hover:bg-white hover:text-indigo-600 border border-transparent hover:border-indigo-100'}`}
                                                    >
                                                       {ekli ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                                    </button>
                                                 </div>
                                              </td>
                                           </tr>
                                        );
                                     })}
                                  </tbody>
                               </table>
                            </div>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {allBolumler.map((bolum) => {
                               const ekli = tercihler.some((t: any) => t.bolum.id === bolum.id);
                               return (
                                  <div key={bolum.id} className="card !p-6 hover:border-indigo-100 transition-all group">
                                     <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{bolum.universite.sehir}</span>
                                           <h3 className="text-sm font-black text-gray-900 mt-1 leading-tight">{bolum.universite.ad}</h3>
                                        </div>
                                        <button 
                                          onClick={() => ekli ? tercihSilMutation.mutate(bolum.id) : tercihEkleMutation.mutate(bolum.id)}
                                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${ekli ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-indigo-50'}`}
                                        >
                                           {ekli ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                        </button>
                                     </div>
                                     <p className="text-sm font-bold text-gray-600 mb-6">{bolum.bolumAdi}</p>
                                     <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <div className="flex flex-col">
                                           <span className="text-[10px] font-bold text-gray-400 uppercase">Sıralama</span>
                                           <span className="text-sm font-black text-gray-900">{bolum.minSiralama?.toLocaleString('tr-TR')}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                           <span className="text-[10px] font-bold text-gray-400 uppercase">Puan</span>
                                           <span className="text-sm font-black text-gray-900">{bolum.minPuan || '---'}</span>
                                        </div>
                                     </div>
                                  </div>
                               );
                            })}
                         </div>
                      )}
                   </motion.div>
                ) : (
                   <div className="card !p-20 text-center bg-white/50 border-dashed border-2 border-gray-200">
                      <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                         <Building2 className="w-10 h-10 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 mb-2">Henüz Arama Yapmadınız</h3>
                      <p className="text-gray-500 font-medium max-w-sm mx-auto">Sol paneldeki filtreleri kullanarak kriterlerinize uygun üniversiteleri listeleyebilirsiniz.</p>
                   </div>
                )}
             </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
