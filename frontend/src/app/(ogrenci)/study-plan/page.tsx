'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, kullaniciApi } from '@/lib/api';
import { 
  Brain, 
  CheckCircle, 
  Circle, 
  Map, 
  Loader2, 
  Sparkles, 
  Clock, 
  BookOpen, 
  CalendarDays, 
  Trophy, 
  ListTodo, 
  ChevronDown,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
  Star
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { motion, AnimatePresence } from 'framer-motion';

interface StudyGorev {
  id: string;
  baslik: string;
  ders: string;
  konu: string;
  sureDakika: number;
  tamamlandi: boolean;
  gun: number;
}

interface StudyPlan {
  id: string;
  baslik: string;
  hedefler: { kisa: string; orta: string; uzun: string };
  gorevler: StudyGorev[];
}

export default function StudyPlanSayfasi() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const otomatikOlusturuldu = useRef(false);
  const [acikHaftalar, setAcikHaftalar] = useState<Record<number, boolean>>({ 1: true });

  const { data: planData, isLoading } = useQuery({
    queryKey: ['study-plan'],
    queryFn: () => kullaniciApi.studyPlanlar(),
  });

  const plan: StudyPlan = planData?.data?.veri?.[0];

  const yeniPlan = useMutation({
    mutationFn: () => aiApi.studyPlan(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-plan'] });
      toast.basarili('Çalışma planınız oluşturuldu!');
    },
    onError: () => toast.hata('Plan oluşturulamadı'),
  });

  useEffect(() => {
    if (searchParams.get('olustur') !== '1' || otomatikOlusturuldu.current || isLoading) return;
    if (!plan && !yeniPlan.isPending) {
      otomatikOlusturuldu.current = true;
      yeniPlan.mutate();
    }
  }, [searchParams, isLoading, plan, yeniPlan.isPending, yeniPlan.mutate]);

  const gorevDurumMutation = useMutation({
    mutationFn: ({ gorevId, tamamlandi }: { gorevId: string; tamamlandi: boolean }) =>
      kullaniciApi.studyGorevDurumGuncelle(gorevId, tamamlandi),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-plan'] });
    },
    onError: () => toast.hata('Görev durumu güncellenemedi'),
  });

  const gorevler = plan?.gorevler || [];
  const gunlukGorevler = gorevler.reduce<Record<number, StudyGorev[]>>((acc, gorev) => {
    if (!acc[gorev.gun]) acc[gorev.gun] = [];
    acc[gorev.gun].push(gorev);
    return acc;
  }, {});
  const gunler = Object.keys(gunlukGorevler).map(Number).sort((a, b) => a - b);
  const haftalikGorevler = gunler.reduce<Record<number, number[]>>((acc, gun) => {
    const hafta = Math.ceil(gun / 7);
    if (!acc[hafta]) acc[hafta] = [];
    acc[hafta].push(gun);
    return acc;
  }, {});
  const haftalar = Object.keys(haftalikGorevler).map(Number).sort((a, b) => a - b);
  const toplamGorev = gorevler.length;
  const tamamlananGorev = gorevler.filter((g) => g.tamamlandi).length;
  const kalanGorev = toplamGorev - tamamlananGorev;
  const toplamDakika = gorevler.reduce((t, g) => t + g.sureDakika, 0);
  const tamamlanmaYuzdesi = toplamGorev > 0 ? Math.round((tamamlananGorev / toplamGorev) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-gray-400 text-[10px] font-bold animate-pulse uppercase tracking-wider">Plan Hazırlanıyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header - Flat & Compact */}
      <section className="relative overflow-hidden rounded-2xl bg-indigo-900 p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase tracking-wider mb-3 border border-indigo-500/30">
              <Sparkles className="w-3 h-3" /> AI Planı
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Çalışma Planım</h1>
            <p className="text-indigo-100 mt-1.5 text-sm font-medium opacity-80 max-w-lg leading-relaxed">
              Kişiye özel 30 günlük stratejik planın.
            </p>
          </div>
          
          <button
            onClick={() => yeniPlan.mutate()}
            disabled={yeniPlan.isPending}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 text-xs"
          >
            {yeniPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Plan Üret
          </button>
        </div>
      </section>

      {!plan ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm border-dashed">
          <Map className="w-12 h-12 mx-auto mb-4 text-gray-100" />
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Henüz Bir Planın Yok</h2>
          <p className="text-gray-400 mt-2 max-w-sm mx-auto font-medium text-xs leading-relaxed">
            Sana özel bir yol haritası çıkarmamız için AI'yı çalıştır.
          </p>
          <button onClick={() => yeniPlan.mutate()} disabled={yeniPlan.isPending} className="mt-6 px-8 py-3 rounded-xl bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-700 hover:text-white transition-all text-xs active:scale-95 flex items-center gap-2 mx-auto">
            <Zap className="w-4 h-4" /> İlk Planını Hazırla
          </button>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Yapılan', val: tamamlananGorev, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: 'Kalan', val: kalanGorev, icon: Target, color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Süre', val: `${toplamDakika}dk`, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Başarı', val: `%${tamamlanmaYuzdesi}`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map((stat, i) => (
              <div key={i} className="card !p-4">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2 shadow-sm`}>
                   <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-xl font-bold text-gray-900 tracking-tight">{stat.val}</div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-4">
               <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                     <ListTodo className="w-4 h-4 text-indigo-500" /> Görev Listesi
                  </h2>
               </div>

               <div className="space-y-4">
                  {haftalar.map((hafta) => {
                    const haftaGunleri = haftalikGorevler[hafta] || [];
                    const haftaGorevleri = haftaGunleri.flatMap((gun) => gunlukGorevler[gun] || []);
                    const toplam = haftaGorevleri.length;
                    const tamamlanan = haftaGorevleri.filter((g) => g.tamamlandi).length;
                    const acik = acikHaftalar[hafta] || false;

                    return (
                      <motion.section key={hafta} className={`overflow-hidden rounded-2xl border ${acik ? 'border-indigo-100 bg-white shadow-xl' : 'border-gray-50 bg-white/50 shadow-sm'} transition-all`}>
                        <button type="button" onClick={() => setAcikHaftalar(prev => ({ ...prev, [hafta]: !acik }))} className="w-full flex items-center justify-between p-5 outline-none group text-left">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${acik ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                               <CalendarDays className="w-4.5 h-4.5" />
                            </div>
                            <div>
                               <p className="text-sm font-bold text-gray-900 tracking-tight">Hafta {hafta}</p>
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Tamamlanma: %{toplam > 0 ? Math.round((tamamlanan/toplam)*100) : 0}</p>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${acik ? 'rotate-180 text-indigo-600' : 'text-gray-400'}`} />
                        </button>

                        <AnimatePresence>
                          {acik && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-6 border-t border-gray-50 space-y-6">
                              {haftaGunleri.map((gun) => {
                                const bugunGorevleri = gunlukGorevler[gun] || [];
                                return (
                                  <div key={gun} className="pt-5">
                                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block mb-3">GÜN {gun}</span>
                                    <div className="space-y-2">
                                      {bugunGorevleri.map((gorev) => (
                                        <button key={gorev.id} type="button" onClick={() => gorevDurumMutation.mutate({ gorevId: gorev.id, tamamlandi: !gorev.tamamlandi })} className={`w-full group text-left flex items-center gap-3 p-3.5 rounded-xl transition-all border ${gorev.tamamlandi ? 'bg-emerald-50/50 border-emerald-100 opacity-70' : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md'}`}>
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${gorev.tamamlandi ? 'bg-emerald-500 text-white' : 'border-2 border-gray-200'}`}>
                                             {gorev.tamamlandi && <CheckCircle className="w-3.5 h-3.5" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold ${gorev.tamamlandi ? 'text-emerald-800 line-through' : 'text-gray-900'}`}>{gorev.baslik}</p>
                                            <div className="flex items-center gap-2 mt-1 ">
                                              <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider">{gorev.ders}</span>
                                              <span className="text-[8px] font-bold text-gray-300">•</span>
                                              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {gorev.sureDakika}dk</span>
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.section>
                    );
                  })}
               </div>
            </div>

            <aside className="xl:col-span-4 space-y-6">
               <div className="card !p-6 shadow-xl border-white bg-white/80">
                  <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                     <Star className="w-4 h-4 text-amber-500" /> Stratejik Hedefler
                  </h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Kısa Vade', text: plan.hedefler?.kisa, color: 'indigo' },
                      { label: 'Orta Vade', text: plan.hedefler?.orta, color: 'violet' },
                      { label: 'Sınav', text: plan.hedefler?.uzun, color: 'emerald' },
                    ].map((h, idx) => (
                      <div key={idx} className="relative pl-4 border-l-2 border-gray-50 group">
                         <div className={`absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-white border-2 border-${h.color}-500 transition-all`} />
                         <span className={`text-[8px] font-bold text-${h.color}-600 uppercase tracking-widest`}>{h.label}</span>
                         <p className="text-[11px] font-bold text-gray-800 mt-0.5 line-clamp-2">{h.text}</p>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="card bg-indigo-600 text-white border-0 !p-6 shadow-xl">
                  <h3 className="text-sm font-bold mb-4">İlerleme</h3>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-3">
                     <motion.div initial={{ width: 0 }} animate={{ width: `${tamamlanmaYuzdesi}%` }} className="h-full bg-white rounded-full shadow-[0_0_10px_white]" />
                  </div>
                  <div className="flex justify-between items-end">
                     <div>
                        <span className="text-2xl font-bold tracking-tight">%{tamamlanmaYuzdesi}</span>
                        <p className="text-[9px] font-bold uppercase text-indigo-200 tracking-wider">Biten</p>
                     </div>
                  </div>
               </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
