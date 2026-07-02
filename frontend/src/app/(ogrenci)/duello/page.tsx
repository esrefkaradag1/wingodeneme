'use client';

import { useQuery } from '@tanstack/react-query';
import { sosyalApi } from '@/lib/api';
import { 
  Swords, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Timer,
  Zap,
  Target,
  Users,
  Info,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

export default function DuelloSayfasi() {
  const { data: arkadaslarData } = useQuery({
    queryKey: ['arkadaslar'],
    queryFn: () => sosyalApi.arkadaslar(),
  });

  const arkadaslar = arkadaslarData?.data?.veri || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Swords className="w-32 h-32 rotate-12" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border border-orange-500/30">
            <Zap className="w-3.5 h-3.5 fill-current" /> Sezon 4
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Düello Meydanı</h1>
          <p className="text-slate-400 text-sm font-medium max-w-xl leading-relaxed opacity-80">
            Arkadaşlarına meydan oku, canlı sınavlara katıl ve liderlik tablosunda üst sıralara tırman.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-8">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md px-6 py-3 rounded-2xl">
              <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Toplam Galibiyet</p>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xl font-bold">12</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-md px-6 py-3 rounded-2xl">
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Küresel Sıralama</p>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-xl font-bold">#420</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card !p-6 border-indigo-100 bg-indigo-50/40">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider mb-3">
          <Info className="w-4 h-4 text-indigo-500" />
          Düello nasıl çalışır?
        </h2>
        <ol className="space-y-2.5 text-sm text-gray-600 leading-relaxed list-decimal pl-5">
          <li>
            Önce <Link href="/arkadaslar" className="font-semibold text-indigo-700 hover:underline">Arkadaşlar</Link> sayfasından
            öğrenci arayıp arkadaşlık isteği gönderin; karşı taraf kabul edince listede görünür.
          </li>
          <li>
            Arkadaş listenizdeki birine <span className="font-medium text-gray-800">Meydan Oku</span> ile düello daveti
            gönderin. Davetlerinizi Arkadaşlar sayfasından da yönetebilirsiniz.
          </li>
          <li>
            Davet edilen öğrenci daveti kabul ederse düello başlar; reddederse iptal olur.
          </li>
          <li>
            İkiniz de aynı soru setini çözersiniz. Puanlar karşılaştırılarak kazanan belirlenir; sonuçlar bu sayfada
            listelenir.
          </li>
        </ol>
        <p className="mt-4 text-xs text-gray-500">
          Henüz arkadaşınız yoksa önce arkadaş ekleyin; düello yalnızca arkadaş listenizdeki öğrencilere gönderilebilir.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol Kolon - Aktif Düellolar */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-indigo-500" /> Aktif Düellolar
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="card !p-12 text-center border-dashed border-2 flex flex-col items-center justify-center bg-gray-50/50">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 text-gray-200">
                <Timer className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Şu an aktif düellon yok</h3>
              <p className="text-xs text-gray-400 mt-2 font-medium">Arkadaşlarına meydan okumaya ne dersin?</p>
            </div>
          </div>

          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider pt-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Geçmiş Düellolar
          </h2>
          
          <div className="space-y-3">
             <div className="card !p-4 flex items-center justify-between group hover:border-emerald-100 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold border border-gray-100">
                      M
                   </div>
                   <div>
                      <h4 className="text-xs font-bold text-gray-900">Murat Yılmaz ile Düello</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">TYT Matematik • 14 Mart</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none mb-1">Kazandın</p>
                      <p className="text-sm font-black text-gray-900">45 - 38</p>
                   </div>
                   <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Trophy className="w-4 h-4" />
                   </div>
                </div>
             </div>

             <div className="card !p-4 flex items-center justify-between group hover:border-rose-100 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold border border-gray-100">
                      S
                   </div>
                   <div>
                      <h4 className="text-xs font-bold text-gray-900">Selin Aktaş ile Düello</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">AYT Edebiyat • 12 Mart</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest leading-none mb-1">Kaybettin</p>
                      <p className="text-sm font-black text-gray-900">22 - 28</p>
                   </div>
                   <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <XCircle className="w-4 h-4" />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Sağ Kolon - Arkadaş Listesi & Meydan Okuma */}
        <aside className="lg:col-span-4 space-y-6">
           <div className="card !p-6">
              <h3 className="text-xs font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-wider">
                 <Users className="w-4 h-4 text-indigo-500" /> Hızlı Meydan Oku
              </h3>
              
              <div className="space-y-3">
                 {arkadaslar.length === 0 ? (
                    <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                       <p className="text-[10px] font-bold text-gray-400 uppercase">Henüz arkadaşın yok</p>
                    </div>
                 ) : (
                    arkadaslar.map((arkadas: any) => (
                       <div key={arkadas.id} className="p-3 rounded-2xl bg-white border border-gray-100 hover:border-orange-200 transition-all flex items-center justify-between gap-3 shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 font-bold text-xs flex items-center justify-center">
                                {arkadas.ad.charAt(0)}
                             </div>
                             <span className="text-xs font-bold text-gray-700 truncate max-w-[100px]">{arkadas.ad}</span>
                          </div>
                          <button className="px-3 py-1.5 rounded-lg bg-orange-500 text-white font-bold text-[10px] hover:bg-orange-600 transition-all shadow-sm shadow-orange-500/20">
                             Meydan Oku
                          </button>
                       </div>
                    ))
                 )}
              </div>
           </div>

           <div className="card !p-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0 shadow-xl overflow-hidden relative">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                 <h3 className="text-xs font-bold mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <Zap className="w-4 h-4 text-amber-400 fill-current" /> Sezon Liderleri
                 </h3>
                 <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                       <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-black text-white/50 w-4">{i}.</span>
                             <span className="text-xs font-bold">Kullanıcı #{i}29</span>
                          </div>
                          <span className="text-xs font-black text-amber-400">{2400 - i * 150}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
