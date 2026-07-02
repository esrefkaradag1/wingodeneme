'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sosyalApi } from '@/lib/api';
import { 
  Users, 
  UserPlus, 
  Swords, 
  BarChart2, 
  Search, 
  Check, 
  X, 
  Trophy, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Award,
  CircleDot,
  Info,
} from 'lucide-react';
import { toast } from '@/store/toast.store';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function ArkadaslarSayfasi() {
  const [hedefId, setHedefId] = useState('');
  const [aramaSorgusu, setAramaSorgusu] = useState('');
  const [karsilastirmaId, setKarsilastirmaId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: arkadaslarData, isLoading } = useQuery({
    queryKey: ['arkadaslar'],
    queryFn: () => sosyalApi.arkadaslar(),
  });

  const arkadaslar = arkadaslarData?.data?.veri || [];

  const { data: gelenIsteklerData } = useQuery({
    queryKey: ['arkadaslik-istekler-gelen'],
    queryFn: () => sosyalApi.gelenArkadasIstekleri(),
  });

  const gelenIstekler = gelenIsteklerData?.data?.veri || [];

  const arkadasIstek = useMutation({
    mutationFn: (id: string) => sosyalApi.arkadasIstek(id),
    onSuccess: () => toast.basarili('Arkadaşlık isteği gönderildi!'),
    onError: (err: any) => {
      const status = err?.response?.status;
      const mesaj =
        err?.response?.data?.mesaj ||
        err?.response?.data?.message ||
        err?.message ||
        'İstek gönderilemedi';

      if (status === 409) {
        toast.bilgi(mesaj);
        return;
      }

      toast.hata(mesaj);
    },
  });

  const duelloBaslat = useMutation({
    mutationFn: (davetEdilenId: string) => sosyalApi.duelloBaslat(davetEdilenId),
    onSuccess: () => toast.basarili('Düello daveti gönderildi!'),
    onError: () => toast.hata('Düello başlatılamadı'),
  });

  const arkadasYanit = useMutation({
    mutationFn: ({ id, kabul }: { id: string; kabul: boolean }) => sosyalApi.arkadasYanit(id, kabul),
    onSuccess: (_r, v) => {
      toast.basarili(v.kabul ? 'Arkadaşlık isteği kabul edildi!' : 'Arkadaşlık isteği reddedildi.');
      qc.invalidateQueries({ queryKey: ['arkadaslik-istekler-gelen'] });
      qc.invalidateQueries({ queryKey: ['arkadaslar'] });
    },
    onError: (err: any) => {
      const mesaj =
        err?.response?.data?.mesaj ||
        err?.response?.data?.message ||
        err?.message ||
        'İşlem başarısız';
      toast.hata(mesaj);
    },
  });

  const { data: karsilastirmaData } = useQuery({
    queryKey: ['karsilastirma', karsilastirmaId],
  queryFn: () => sosyalApi.puanKarsilastir(karsilastirmaId!),
    enabled: !!karsilastirmaId,
  });
  
  const { data: aramaSonuclari, isLoading: aramaYukleniyor } = useQuery({
    queryKey: ['kullanici-ara', aramaSorgusu],
    queryFn: () => sosyalApi.kullaniciAra(aramaSorgusu),
    enabled: aramaSorgusu.length > 2,
  });

  const sonuclar = aramaSonuclari?.data?.veri || [];

  const { data: gelenDuelloDavetleriData } = useQuery({
    queryKey: ['duello-davetler-gelen'],
    queryFn: () => sosyalApi.gelenDuelloDavetleri(),
  });

  const gelenDuelloDavetleri = gelenDuelloDavetleriData?.data?.veri || [];

  const duelloYanit = useMutation({
    mutationFn: ({ id, kabul }: { id: string; kabul: boolean }) => sosyalApi.duelloYanit(id, kabul),
    onSuccess: (_r, v) => {
      toast.basarili(v.kabul ? 'Düello kabul edildi!' : 'Düello reddedildi.');
      qc.invalidateQueries({ queryKey: ['duello-davetler-gelen'] });
    },
    onError: (err: any) => {
      const mesaj =
        err?.response?.data?.mesaj ||
        err?.response?.data?.message ||
        err?.message ||
        'İşlem başarısız';
      toast.hata(mesaj);
    },
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header - Flat & Compact */}
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[9px] font-bold uppercase tracking-wider mb-3 border border-orange-500/30">
              <Swords className="w-3.5 h-3.5" /> Rekabet Meydanı
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Arkadaşlar & Sosyal</h1>
            <p className="text-slate-400 mt-2 text-sm font-medium opacity-80 max-w-xl leading-relaxed">
              Arkadaşlarınla beraber hazırlan ve gelişimini karşılaştır.
            </p>
          </div>
          
          <div className="flex gap-3">
             <div className="bg-white/5 border border-white/10 backdrop-blur-md px-6 py-4 rounded-xl flex flex-col items-center justify-center min-w-[120px] shadow-md">
                <span className="text-[9px] font-bold uppercase tracking-widest text-orange-400">Lig Puanı</span>
                <span className="text-2xl font-bold">1.240</span>
             </div>
          </div>
        </div>
      </section>

      <section className="card !p-6 border-indigo-100 bg-indigo-50/40">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider mb-3">
          <Info className="w-4 h-4 text-indigo-500" />
          Arkadaşlar ve düello nasıl çalışır?
        </h2>
        <ol className="space-y-2.5 text-sm text-gray-600 leading-relaxed list-decimal pl-5">
          <li>
            Arama kutusuna en az üç karakter yazarak öğrenci bulun ve <span className="font-medium text-gray-800">Ekle</span> ile
            arkadaşlık isteği gönderin.
          </li>
          <li>
            Size gelen istekleri bu sayfadaki <span className="font-medium text-gray-800">Gelen İstekler</span> bölümünden kabul
            edin veya reddedin; karşılıklı onay sonrası arkadaş listenize eklenir.
          </li>
          <li>
            Arkadaş kartındaki grafik simgesiyle sınav performansınızı karşılaştırabilir; kılıç simgesiyle düello daveti
            gönderebilirsiniz.
          </li>
          <li>
            Gelen düello davetlerini sağ panelden yanıtlayın. Kabul edilen düelloların sonuçlarını{' '}
            <Link href="/duello" className="font-semibold text-indigo-700 hover:underline">Düello Meydanı</Link> sayfasından
            takip edebilirsiniz.
          </li>
        </ol>
        <p className="mt-4 text-xs text-gray-500">
          Düello daveti göndermek için önce arkadaş listenizde olmalısınız; yalnızca onaylanmış arkadaşlarınıza meydan okuyabilirsiniz.
        </p>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        <div className="xl:col-span-8 space-y-6">

          {/* Gelen Arkadaşlık İstekleri */}
          {gelenIstekler.length > 0 && (
            <div className="card !p-6 border-white bg-white/90">
              <h2 className="text-xs font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <UserPlus className="w-4 h-4 text-indigo-500" /> Gelen İstekler ({gelenIstekler.length})
              </h2>
              <div className="space-y-3">
                {gelenIstekler.map((istek: any) => (
                  <div key={istek.id} className="p-4 rounded-2xl border border-gray-100 bg-white flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {istek.ogrenci?.ad?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {istek.ogrenci?.ad} {istek.ogrenci?.soyad}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                          {istek.ogrenci?.okul || 'Öğrenci'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => arkadasYanit.mutate({ id: istek.id, kabul: true })}
                        disabled={arkadasYanit.isPending}
                        className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Kabul
                      </button>
                      <button
                        onClick={() => arkadasYanit.mutate({ id: istek.id, kabul: false })}
                        disabled={arkadasYanit.isPending}
                        className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 font-bold text-[10px] hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Arama Barı - Şık ve Kompakt */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-xl flex items-center gap-3">
              <div className="relative flex-1">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input
                   type="text"
                   value={aramaSorgusu}
                   onChange={(e) => setAramaSorgusu(e.target.value)}
                   placeholder="İsim, e-posta veya telefon ile ara..."
                   className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-indigo-500 transition-all font-bold text-gray-700 outline-none text-xs"
                 />
              </div>
            </div>

            {/* Arama Sonuçları Dropdown */}
            <AnimatePresence>
              {aramaSorgusu.length > 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden"
                >
                  {aramaYukleniyor ? (
                    <div className="p-8 text-center">
                       <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aranıyor...</p>
                    </div>
                  ) : sonuclar.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <p className="text-xs font-bold">Kullanıcı bulunamadı.</p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                      {sonuclar.map((kullanici: any) => (
                        <div key={kullanici.id} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-4 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm">
                              {kullanici.ad?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{kullanici.ad} {kullanici.soyad}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{kullanici.kullanici?.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              arkadasIstek.mutate(kullanici.id);
                              setAramaSorgusu('');
                            }}
                            disabled={arkadasIstek.isPending}
                            className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-[10px] hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Ekle
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
             <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Arkadaşlarım ({arkadaslar.length})
             </h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-50" />
                  ))
                ) : arkadaslar.length === 0 ? (
                  <div className="md:col-span-2 py-16 text-center bg-white rounded-2xl border border-dashed border-gray-100 shadow-sm">
                     <Users className="w-12 h-12 mx-auto mb-4 text-gray-100" />
                     <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Henüz arkadaşın yok.</p>
                  </div>
                ) : (
                  arkadaslar.map((arkadas: any, i: number) => (
                    <motion.div
                       key={arkadas.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: i * 0.05 }}
                       className={`card !p-4 group hover:border-indigo-100 flex items-center gap-3 ${karsilastirmaId === arkadas.id ? 'border-indigo-200 bg-indigo-50/30' : ''}`}
                    >
                       <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                          {arkadas.ad?.charAt(0) || '?'}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                             {arkadas.ad} {arkadas.soyad}
                          </h4>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 truncate leading-none">
                             {arkadas.okul || 'Öğrenci'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                             <div className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-bold flex items-center gap-1">
                                <Trophy className="w-2.5 h-2.5" /> {arkadas.puan}
                             </div>
                             <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 uppercase tracking-wider">
                                <CircleDot className="w-2 h-2 fill-current" /> Aktif
                             </span>
                          </div>
                       </div>

                       <div className="flex gap-1.5">
                          <button
                            onClick={() => setKarsilastirmaId(karsilastirmaId === arkadas.id ? null : arkadas.id)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${karsilastirmaId === arkadas.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => duelloBaslat.mutate(arkadas.id)}
                            disabled={duelloBaslat.isPending}
                            className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center justify-center"
                          >
                            <Swords className="w-4 h-4" />
                          </button>
                       </div>
                    </motion.div>
                  ))
                )}
             </div>
          </div>
        </div>

        <aside className="xl:col-span-4 space-y-6">
           {gelenDuelloDavetleri.length > 0 && (
             <div className="card !p-6 border-white bg-white/90">
               <h3 className="text-xs font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                 <Swords className="w-4 h-4 text-orange-500" /> Düello Davetleri ({gelenDuelloDavetleri.length})
               </h3>
               <div className="space-y-3">
                 {gelenDuelloDavetleri.map((d: any) => (
                   <div key={d.id} className="p-4 rounded-2xl border border-gray-100 bg-white">
                     <div className="flex items-center justify-between gap-3">
                       <div className="flex items-center gap-3 min-w-0">
                         <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                           {d.daveteden?.ad?.charAt(0) || '?'}
                         </div>
                         <div className="min-w-0">
                           <p className="text-xs font-bold text-gray-900 truncate">
                             {d.daveteden?.ad} {d.daveteden?.soyad}
                           </p>
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                             {d.konuId ? `Konu: ${d.konuId}` : 'Düello daveti'}
                           </p>
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-2 mt-3">
                       <button
                         onClick={() => duelloYanit.mutate({ id: d.id, kabul: true })}
                         disabled={duelloYanit.isPending}
                         className="flex-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                       >
                         <Check className="w-3.5 h-3.5" /> Kabul
                       </button>
                       <button
                         onClick={() => duelloYanit.mutate({ id: d.id, kabul: false })}
                         disabled={duelloYanit.isPending}
                         className="flex-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 font-bold text-[10px] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                       >
                         <X className="w-3.5 h-3.5" /> Reddet
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           <AnimatePresence>
            {karsilastirmaId && karsilastirmaData?.data?.veri ? (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="card bg-slate-900 text-white !p-6 border-0 shadow-2xl relative overflow-hidden">
                 <div className="relative z-10">
                    <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-indigo-400" /> Puan Karşılaştır
                    </h3>
                    
                    <div className="space-y-6">
                       {karsilastirmaData.data.veri.slice(0, 3).map((kayit: any, i: number) => {
                         const benimPuan = i % 2 === 0 ? kayit.netPuan : kayit.netPuan - 5;
                         const arkadasPuan = i % 2 === 0 ? kayit.netPuan - 3 : kayit.netPuan;
                         const max = Math.max(benimPuan, arkadasPuan, 100);
                         return (
                            <div key={i}>
                               <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2 truncate">{kayit.sinav?.baslik || `Sınav #${i+1}`}</p>
                               <div className="space-y-3">
                                  <div>
                                     <div className="flex justify-between text-[9px] font-bold uppercase text-indigo-400 mb-1">
                                        <span>Ben</span>
                                        <span>{benimPuan.toFixed(1)}</span>
                                     </div>
                                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(benimPuan/max)*100}%` }} className="h-full bg-indigo-500 rounded-full" />
                                     </div>
                                  </div>
                                  <div>
                                     <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400 mb-1">
                                        <span>Arkadaş</span>
                                        <span>{arkadasPuan.toFixed(1)}</span>
                                     </div>
                                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(arkadasPuan/max)*100}%` }} className="h-full bg-slate-500 rounded-full" />
                                     </div>
                                  </div>
                               </div>
                            </div>
                         );
                       })}
                    </div>
                 </div>
              </motion.div>
            ) : (
                <div className="card text-center !p-8 border-white">
                   <Award className="w-12 h-12 mx-auto mb-4 text-gray-100" />
                   <h3 className="text-sm font-bold text-gray-900 leading-tight">Yarışmaya Katıl</h3>
                   <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wide">Puanlarını Karşılaştır</p>
                </div>
            )}
           </AnimatePresence>

           <div className="card !p-6 border-white bg-white/80">
              <h3 className="text-xs font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                 <Zap className="w-4 h-4 text-orange-500" /> Görevler
              </h3>
              <div className="space-y-3">
                 <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mb-1">Düello</p>
                    <p className="text-[11px] font-bold text-gray-700">Arkadaşına meydan oku.</p>
                 </div>
              </div>
           </div>
        </aside>

      </div>
    </div>
  );
}
