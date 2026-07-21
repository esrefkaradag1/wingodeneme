'use client';

import type { ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { aiApi, sinavApi } from '@/lib/api';
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Target,
  BarChart3,
  ListChecks,
  Hash,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  ChevronDown,
  Layout,
  ExternalLink,
  FileText,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { toast } from '@/store/toast.store';
import { useMutation } from '@tanstack/react-query';
import { SoruHtmlMath } from '@/components/admin/SoruHtmlMath';
import { duzMetinHtmlSar } from '@/lib/soruCozumYardim';
import { sureMsToMetin } from '@/lib/sureFormat';
import OgretmenTahtaAnlatimi from '@/components/exam/OgretmenTahtaAnlatimi';
import type { HataAciklaVeri } from '@/lib/hataAciklaTahta';

interface TahminiSiralama {
  sira: number;
  havuz: number;
  gercekKatilim: number;
  ortalamaNet: number;
  ogrenciNet: number;
  yuzdelik: number;
  ilkUc: Array<{ sira: number; tahminiNet: number }>;
}

interface SonucVerisi {
  id: string;
  durum: string;
  dogruSayisi: number;
  yanlisSayisi: number;
  bosSayisi: number;
  netPuan: number;
  hamPuan: number;
  ulusalSiralama: number | null;
  yuzdelik: number | null;
  gosterilenSiralama?: number | null;
  siralamaHavuz?: number;
  tahminiSiralama?: TahminiSiralama | null;
  sinav: { baslik: string; tur: string };
  kazanimAnalizi?: Array<{
    kazanim: string;
    ders: string;
    konu: string;
    toplam: number;
    dogru: number;
    yanlis: number;
    bos: number;
    basariYuzdesi: number;
    yanlisSoruNo: number[];
  }>;
  konuAnalizi?: Array<{
    ders: string;
    konu: string;
    toplam: number;
    dogru: number;
    yanlis: number;
    bos: number;
    basariYuzdesi: number;
  }>;
  cevaplar: Array<{
    id: string;
    soruId: string;
    secilen: string | null;
    dogru: boolean | null;
    sureMs?: number | null;
    platformBasariYuzdesi?: number | null;
    soru: {
      siraNo: number;
      metinHtml: string;
      gorselUrl?: string;
      secenekler: Record<string, string>;
      dogruCevap: string;
      konu: { ad: string; ders: string };
    };
  }>;
  zamanAnalizi?: {
    toplamSureMs: number;
    ortalamaSureMs: number | null;
    kayitliSoruSayisi: number;
    enYavasSorular: Array<{
      soruId: string;
      siraNo: number;
      ders: string;
      konu: string;
      sureMs: number | null;
      dogru: boolean | null;
    }>;
    enHizliSorular: Array<{
      soruId: string;
      siraNo: number;
      ders: string;
      konu: string;
      sureMs: number | null;
      dogru: boolean | null;
    }>;
    soruSureleri?: Array<{
      soruId: string;
      siraNo: number;
      ders: string;
      konu: string;
      sureMs: number | null;
      dogru: boolean | null;
    }>;
  };
}

export default function SinavSonucSayfasi() {
  const router = useRouter();
  const params = useParams();
  const katilimId = typeof params.katilimId === 'string' ? params.katilimId : '';
  const [aktifSoruId, setAktifSoruId] = useState<string | null>(null);
  const [aiAciklamalar, setAiAciklamalar] = useState<Record<string, HataAciklaVeri>>({});
  const [videoIstekSoruId, setVideoIstekSoruId] = useState<string | null>(null);

  const hataAciklaMutation = useMutation({
    mutationFn: async (soruId: string) => {
      if (!katilimId) throw new Error('Katılım ID bulunamadı');
      const r = await aiApi.hataAcikla({ katilimId, soruId });
      return r.data.veri as HataAciklaVeri;
    },
    onSuccess: (veri, soruId) => {
      setAiAciklamalar((prev) => ({ ...prev, [soruId]: veri }));
      setAktifSoruId(soruId);
    },
    onError: (err: any) => {
      const mesaj =
        err?.response?.data?.mesaj ||
        err?.response?.data?.message ||
        err?.message ||
        'AI açıklaması alınamadı';
      toast.hata(mesaj);
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['sinav-sonuc', katilimId],
    queryFn: async () => {
      const r = await sinavApi.sonuc(katilimId);
      return r.data.veri as SonucVerisi;
    },
    enabled: !!katilimId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Analiz Hazırlanıyor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border border-gray-100 shadow-xl text-center">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Sonuç Yüklenemedi</h2>
        <p className="text-sm text-slate-500 mt-2">Bu sonuca erişim yetkiniz olmayabilir veya oturumunuz sonlanmış olabilir.</p>
        <button onClick={() => router.push('/sinavlar')} className="mt-8 w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
          Sınavlarıma Dön
        </button>
      </div>
    );
  }

  const k = data;
  const cevaplarSirali = [...(k.cevaplar || [])].sort((a, b) => a.soru.siraNo - b.soru.siraNo);
  const kazanimAnalizi = k.kazanimAnalizi || [];
  const konuAnalizi = k.konuAnalizi || [];
  const konuAnaliziGoster = konuAnalizi.filter((ka) => ka.dogru + ka.yanlis > 0);
  const zaman = k.zamanAnalizi;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      
      {/* Header - Modern & Slim */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <Link href="/sinavlar" className="inline-flex items-center gap-2 text-indigo-400 font-bold mb-4 hover:gap-3 transition-all text-xs uppercase tracking-widest">
              <ArrowLeft className="w-4 h-4" /> Geri Dön
            </Link>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{k.sinav.baslik}</h1>
            <div className="flex items-center gap-3">
               <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/30">
                 {k.sinav.tur}
               </span>
               <span className="text-slate-400 text-xs font-medium opacity-80">Sınav Tamamlandı</span>
            </div>
            <Link
              href={`/sinavlar/${katilimId}/karnesi`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white hover:text-gray-900 transition-all"
            >
              <FileText className="w-4 h-4" /> Deneme Karnesi
            </Link>
          </div>

          <div className="flex items-center gap-6 bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl">
             <div className="text-center">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Başarı Puanı</p>
                <div className="text-4xl font-bold tracking-tighter">%{k.hamPuan.toFixed(1)}</div>
             </div>
             <div className="w-px h-12 bg-white/10" />
             <div className="text-center">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Toplam Net</p>
                <div className="text-4xl font-bold tracking-tighter text-indigo-400">{k.netPuan.toFixed(2)}</div>
             </div>
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />
      </section>

      {/* Stats Cards - Modern Flat */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <OzetKutu ikon={<CheckCircle2 className="w-6 h-6" />} etiket="Doğru" deger={k.dogruSayisi} color="emerald" />
        <OzetKutu ikon={<XCircle className="w-6 h-6" />} etiket="Yanlış" deger={k.yanlisSayisi} color="rose" />
        <OzetKutu ikon={<MinusCircle className="w-6 h-6" />} etiket="Boş" deger={k.bosSayisi} color="slate" />
        <OzetKutu
          ikon={<Trophy className="w-6 h-6" />}
          etiket={k.siralamaHavuz ? `Sıra / ${k.siralamaHavuz.toLocaleString('tr-TR')}` : 'Sıralama'}
          deger={
            k.gosterilenSiralama
              ? `#${k.gosterilenSiralama.toLocaleString('tr-TR')}`
              : k.ulusalSiralama
                ? `#${k.ulusalSiralama}`
                : '—'
          }
          color="amber"
        />
      </div>

      {k.tahminiSiralama && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-3">
            Tahmini sıralama (2000 üzerinden)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {k.tahminiSiralama.ilkUc.map((u) => (
              <div key={u.sira} className="rounded-xl bg-white border border-amber-100 p-3 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase">{u.sira}. sıra</p>
                <p className="text-xl font-bold text-gray-900">#{u.sira}</p>
                <p className="text-xs text-gray-500">~{u.tahminiNet} net</p>
              </div>
            ))}
            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-3 text-center shadow">
              <p className="text-[10px] font-bold uppercase text-white/80">Senin sıran</p>
              <p className="text-2xl font-bold">
                #{k.tahminiSiralama.sira.toLocaleString('tr-TR')}
              </p>
              <p className="text-[11px] text-white/80">
                / {k.tahminiSiralama.havuz.toLocaleString('tr-TR')} · %{k.tahminiSiralama.yuzdelik}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Deneme ortalaması {k.tahminiSiralama.ortalamaNet} net · gerçek katılım{' '}
            {k.tahminiSiralama.gercekKatilim} kişi
          </p>
        </div>
      )}

      {/* Zaman Analizi */}
      {zaman && zaman.kayitliSoruSayisi > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-indigo-600" /> Süre Analizi
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Toplam süre</p>
              <p className="text-2xl font-bold text-gray-900">{sureMsToMetin(zaman.toplamSureMs)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Soru başına ort.</p>
              <p className="text-2xl font-bold text-gray-900">{sureMsToMetin(zaman.ortalamaSureMs)}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">En uzun sorular</p>
              <p className="text-sm font-bold text-gray-900">
                {zaman.enYavasSorular.slice(0, 3).map((s) => `S.${s.siraNo}`).join(', ') || '—'}
              </p>
            </div>
          </div>

          {zaman.enYavasSorular.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">En çok beklediğin sorular</p>
              {zaman.enYavasSorular.map((s) => (
                <div key={s.soruId} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-800">
                    S.{s.siraNo} · {s.ders} · {s.konu}
                  </span>
                  <span className="font-bold text-amber-700">{sureMsToMetin(s.sureMs)}</span>
                </div>
              ))}
            </div>
          )}

          {(zaman.soruSureleri?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Tüm sorularda geçirdiğin süre
                </p>
              </div>
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {[...(zaman.soruSureleri || [])]
                  .sort((a, b) => a.siraNo - b.siraNo)
                  .map((s) => (
                    <div key={s.soruId} className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-gray-800 min-w-0 truncate">
                        S.{s.siraNo} · {s.ders} · {s.konu}
                      </span>
                      <span className="font-bold text-gray-700 shrink-0 tabular-nums">{sureMsToMetin(s.sureMs)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Konu Bazlı Analiz */}
      {konuAnaliziGoster.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                <Target className="w-6 h-6 text-indigo-600" /> Konu Bazlı Analiz
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Yalnızca en az bir doğru veya yanlış cevabın olduğu konular gösterilir.{' '}
                <span className="font-semibold">D: Doğru · Y: Yanlış · B: Boş</span>
              </p>
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {konuAnaliziGoster.length} konu
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {konuAnaliziGoster.map((ka) => {
              const renk =
                ka.basariYuzdesi >= 70
                  ? 'border-emerald-100 bg-emerald-50/40'
                  : ka.basariYuzdesi >= 50
                    ? 'border-amber-100 bg-amber-50/40'
                    : 'border-rose-100 bg-rose-50/40';

              return (
                <div key={`${ka.ders}-${ka.konu}`} className={`rounded-2xl border p-5 ${renk}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                        {ka.ders}
                      </div>
                      <div className="text-sm font-bold text-gray-900 leading-snug">{ka.konu}</div>
                      <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        D:{ka.dogru} Y:{ka.yanlis} B:{ka.bos}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold tracking-tight text-gray-900">
                        %{ka.basariYuzdesi.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kazanım Bazlı Analiz */}
      {kazanimAnalizi.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-6 h-6 text-indigo-600" /> Kazanım Bazlı Analiz
            </h2>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {kazanimAnalizi.length} kazanım
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {kazanimAnalizi.slice(0, 12).map((ka) => {
              const renk =
                ka.basariYuzdesi >= 70
                  ? 'border-emerald-100 bg-emerald-50/40'
                  : ka.basariYuzdesi >= 50
                    ? 'border-amber-100 bg-amber-50/40'
                    : 'border-rose-100 bg-rose-50/40';

              return (
                <div key={`${ka.ders}-${ka.konu}-${ka.kazanim}`} className={`rounded-2xl border p-5 ${renk}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
                        {ka.ders} · {ka.konu}
                      </div>
                      <div className="text-sm font-bold text-gray-900 leading-snug">
                        {ka.kazanim}
                      </div>
                      {ka.yanlisSoruNo?.length > 0 && (
                        <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Hata yaptığın sorular: {ka.yanlisSoruNo.filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Başarı</div>
                      <div className="text-2xl font-bold tracking-tight text-gray-900">%{ka.basariYuzdesi.toFixed(0)}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                        D:{ka.dogru} Y:{ka.yanlis} B:{ka.bos}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {kazanimAnalizi.length > 12 && (
            <div className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              İlk 12 kazanım gösteriliyor (en zayıftan en güçlüye).
            </div>
          )}
        </div>
      )}

      {/* Soru Detayları Listesi */}
      <div className="space-y-6">
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
               <HelpCircle className="w-6 h-6 text-indigo-600" /> Soru Bazlı Analiz
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
               <span>Toplam {cevaplarSirali.length} Soru</span>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-4">
            {cevaplarSirali.map((c) => {
              const isOpen = aktifSoruId === c.soruId;
              const durumIcon = c.dogru === true ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 
                              : c.dogru === false ? <XCircle className="w-5 h-5 text-rose-500" /> 
                              : <MinusCircle className="w-5 h-5 text-slate-400" />;
              
              const durumMetni = c.dogru === true ? 'Doğru' : c.dogru === false ? 'Yanlış' : 'Boş';
              const durumRenk = c.dogru === true ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                               : c.dogru === false ? 'bg-rose-50 border-rose-100 text-rose-700' 
                               : 'bg-slate-50 border-slate-100 text-slate-600';

              return (
                <div key={c.soruId} className="group">
                  <motion.div 
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isOpen ? 'border-indigo-200 bg-white shadow-xl ring-1 ring-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-100 shadow-sm'
                    }`}
                  >
                    {/* Soru Header — sadece başlık tıklanınca aç/kapa */}
                    <div
                      className="p-5 flex items-center justify-between gap-4 cursor-pointer"
                      onClick={() => setAktifSoruId(isOpen ? null : c.soruId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setAktifSoruId(isOpen ? null : c.soruId);
                        }
                      }}
                    >
                       <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                            isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                             {c.soru.siraNo}
                          </div>
                          <div className="min-w-0">
                             <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none mb-1">{c.soru.konu.ders}</div>
                             <h4 className="text-sm font-bold text-gray-900 truncate">{c.soru.konu.ad}</h4>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-4 shrink-0">
                          {c.sureMs != null && c.sureMs > 0 && (
                            <span className="hidden md:inline text-[10px] font-bold text-slate-500 uppercase tracking-widest tabular-nums">
                              {sureMsToMetin(c.sureMs)}
                            </span>
                          )}
                          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${durumRenk}`}>
                             {durumIcon} {durumMetni}
                          </div>
                          <ChevronDown className={`w-5 h-5 text-gray-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                       </div>
                    </div>

                    {/* Soru İçeriği (Genişletilmiş) */}
                    <AnimatePresence>
                       {isOpen && (
                         <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-50 bg-slate-50/30"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                         >
                            <div className="p-8 space-y-8">
                               {/* Soru Metni & Görseli */}
                               <div className="space-y-6">
                                  {c.soru.gorselUrl && (
                                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm max-w-2xl mx-auto overflow-hidden group/img">
                                       <img src={c.soru.gorselUrl} alt="Soru" className="w-full h-auto rounded-xl" />
                                    </div>
                                  )}
                                  <SoruHtmlMath className="prose prose-sm max-w-none text-gray-800 font-medium leading-relaxed" html={c.soru.metinHtml} />
                               </div>

                               {/* Seçenekler */}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {Object.entries(c.soru.secenekler).map(([key, value]) => {
                                    const isCorrect = key === c.soru.dogruCevap;
                                    const isSelected = key === c.secilen;
                                    
                                    let borderColor = 'border-gray-100';
                                    let bgColor = 'bg-white';
                                    let textColor = 'text-gray-700';
                                    let icon = null;

                                    if (isCorrect) {
                                      borderColor = 'border-emerald-200';
                                      bgColor = 'bg-emerald-50/50';
                                      textColor = 'text-emerald-700';
                                      icon = <CheckCircle2 className="w-4 h-4" />;
                                    } else if (isSelected && !isCorrect) {
                                      borderColor = 'border-rose-200';
                                      bgColor = 'bg-rose-50/50';
                                      textColor = 'text-rose-700';
                                      icon = <XCircle className="w-4 h-4" />;
                                    }

                                    return (
                                      <div key={key} className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${borderColor} ${bgColor}`}>
                                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                                           isCorrect ? 'bg-emerald-500 text-white' : isSelected ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
                                         }`}>
                                            {key}
                                         </div>
                                         <div className="flex-1 min-w-0">
                                            <SoruHtmlMath className={`text-sm font-bold leading-relaxed ${textColor}`} html={duzMetinHtmlSar(String(value))} />
                                            <div className="flex items-center gap-1.5 h-4">
                                               {isCorrect && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Doğru Cevap</span>}
                                               {isSelected && !isCorrect && <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Senin Seçimin</span>}
                                            </div>
                                         </div>
                                         {icon}
                                      </div>
                                    );
                                  })}
                               </div>

                               {/* Analiz Footer */}
                               <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                     <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Konu Analizi:</div>
                                     <span className="text-[11px] font-bold text-indigo-600">{c.soru.konu.ad}</span>
                                  </div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                     Platform başarı:{' '}
                                     <span className="text-gray-900">
                                       {typeof c.platformBasariYuzdesi === 'number'
                                         ? `%${c.platformBasariYuzdesi.toFixed(0)}`
                                         : '—'}
                                     </span>
                                  </div>
                               </div>

                               {(c.dogru === false || c.dogru === null) && (
                                 <div
                                   className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5"
                                   onClick={(e) => e.stopPropagation()}
                                   onPointerDown={(e) => e.stopPropagation()}
                                 >
                                   <div className="flex items-center justify-between gap-3">
                                     <div>
                                       <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Neden hata yaptın?</p>
                                       <p className="text-xs font-bold text-gray-900 mt-1">
                                         {c.dogru === false ? 'Yanlış' : 'Boş'} yaptığın soruyu tahtada dinle veya Three.js ile ücretsiz video indir.
                                       </p>
                                     </div>
                                   <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setVideoIstekSoruId(null);
                                         hataAciklaMutation.mutate(c.soruId);
                                       }}
                                       disabled={hataAciklaMutation.isPending}
                                       className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                     >
                                       {hataAciklaMutation.isPending && !videoIstekSoruId ? (
                                         <Loader2 className="w-4 h-4 animate-spin" />
                                       ) : null}
                                       Tahtada Anlat
                                     </button>
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setVideoIstekSoruId(c.soruId);
                                         if (!aiAciklamalar[c.soruId]) {
                                           hataAciklaMutation.mutate(c.soruId);
                                         }
                                       }}
                                       disabled={hataAciklaMutation.isPending}
                                       className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 disabled:opacity-50 flex items-center gap-2"
                                     >
                                       {hataAciklaMutation.isPending && videoIstekSoruId === c.soruId ? (
                                         <Loader2 className="w-4 h-4 animate-spin" />
                                       ) : (
                                         <Download className="w-4 h-4" />
                                       )}
                                       Video Oluştur
                                     </button>
                                   </div>
                                   </div>

                                   {aiAciklamalar[c.soruId] && (
                                     <OgretmenTahtaAnlatimi
                                       veri={aiAciklamalar[c.soruId]!}
                                       ders={c.soru.konu.ders}
                                       konu={c.soru.konu.ad}
                                       videoKayitBaslat={videoIstekSoruId === c.soruId}
                                       onVideoKayitBitti={() => setVideoIstekSoruId(null)}
                                     />
                                   )}
                                 </div>
                               )}
                            </div>
                         </motion.div>
                       )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              );
            })}
         </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-center pt-10 border-t border-gray-100">
         <Link href="/sinavlar" className="px-10 py-5 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3">
            Diğer Sınavlarıma Göz At <ArrowRight className="w-5 h-5" />
         </Link>
      </div>

    </div>
  );
}

function OzetKutu({
  ikon,
  etiket,
  deger,
  color
}: {
  ikon: ReactNode;
  etiket: string;
  deger: number | string;
  color: 'emerald' | 'rose' | 'slate' | 'amber';
}) {
  const themes = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-600',
    slate: 'bg-slate-50 border-slate-100 text-slate-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600'
  };

  return (
    <div className={`rounded-2xl border p-6 flex flex-col items-center text-center transition-all hover:translate-y-[-2px] hover:shadow-lg ${themes[color]}`}>
      <div className="mb-4">{ikon}</div>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{etiket}</p>
      <p className="text-3xl font-bold tracking-tight">{deger}</p>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
