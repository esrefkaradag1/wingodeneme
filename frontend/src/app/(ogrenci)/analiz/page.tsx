'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { analizApi, aiApi } from '@/lib/api';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Lightbulb, 
  Calculator, 
  Map,
  ArrowRight,
  Zap,
  GraduationCap,
  Timer,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { OgrenciSureAnaliziPanel, type SureAnaliziOgesi } from '@/components/ogrenci/OgrenciSureAnaliziPanel';

function netArtirmaOneriMetni(z: { konu: string; ders: string; basari: number }): string {
  const d = z.ders.toLowerCase();
  const k = z.konu;
  if (d.includes('matemat')) {
    return `Matematikte “${k}” başlığında düşük performans görülüyor.`;
  }
  if (d.includes('türk') || d.includes('turk')) {
    return `Türkçede “${k}” için süre uzun kalıyor olabilir.`;
  }
  return `${z.ders} — “${k}” alanında başarı %${z.basari.toFixed(0)}.`;
}

export default function AnalizSayfasi() {
  const { data: analizData, isLoading } = useQuery({
    queryKey: ['analiz'],
    queryFn: () => analizApi.benim(),
  });

  const { data: aiData } = useQuery({
    queryKey: ['ai-analiz'],
    queryFn: () => aiApi.analiz(),
  });

  const analiz = analizData?.data?.veri;
  const aiAnaliz = aiData?.data?.veri?.aiAnaliz as {
    genelDegerlendirme?: string;
    kuvvetliYonler?: string[];
    geliştirmeGerekli?: string[];
    acilOnlemler?: string[];
  } | undefined;
  const gelisimAlani =
    aiAnaliz?.geliştirmeGerekli?.[0] ?? aiAnaliz?.acilOnlemler?.[0];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-gray-400 text-xs font-bold animate-pulse">Raporlar Hazırlanıyor...</p>
      </div>
    );
  }

  const dersVerisi = analiz?.dersPerformanslari?.map((d: { ders: string; ortalama: number }) => ({
    ders: d.ders,
    basari: d.ortalama,
  })) || [];

  const sinavVerisi = analiz?.sinavGecmisi?.map((s: { sinav: { baslik: string; tur: string }; netPuan: number; ulusalSiralama: number }) => ({
    name: s.sinav.baslik.substring(0, 10),
    net: s.netPuan,
    siralama: s.ulusalSiralama,
  })) || [];

  const sureAnalizleri = (analiz?.sureAnalizleri || []) as SureAnaliziOgesi[];

  return (
    <div className="space-y-8 pb-12">
      {/* Header - Flat & Compact */}
      <section className="relative overflow-hidden rounded-2xl bg-indigo-900 p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold mb-3 border border-indigo-500/30">
              <Zap className="w-3 h-3" /> Analiz Modu
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Performans Raporu</h1>
            <p className="text-indigo-100 mt-2 text-sm font-medium opacity-80 max-w-lg">
              Deneme sonuçların ve kişisel gelişim stratejin.
            </p>
          </motion.div>
          
          <div className="flex gap-3">
             <Link href="/rehber/net-simulasyonu" className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-bold shadow-md hover:bg-gray-50 transition-all text-xs flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Simülasyon
             </Link>
             <Link href="/study-plan" className="px-4 py-2.5 rounded-xl bg-indigo-500/20 border border-white/20 text-white font-bold hover:bg-white/10 transition-all text-xs flex items-center gap-2">
                <Map className="w-4 h-4" /> Planla
             </Link>
          </div>
        </div>
      </section>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { ikon: Trophy, label: 'En İyi Sıra', deger: analiz?.enIyiSiralama ? `#${analiz.enIyiSiralama.toLocaleString('tr-TR')}` : '—', color: 'text-amber-500', bg: 'bg-amber-50' },
          { ikon: Target, label: 'Ort. Net', deger: analiz?.ortalamaNet?.toFixed(1) || '0', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { ikon: TrendingUp, label: 'Sınav', deger: analiz?.toplamSinav || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { ikon: AlertTriangle, label: 'Zayıf Konu', deger: analiz?.zayifKonular?.length || 0, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((kart, i) => {
          const KartIkon = kart.ikon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card !p-5">
              <div className={`w-9 h-9 rounded-xl ${kart.bg} flex items-center justify-center mb-3 shadow-sm`}>
                <KartIkon className={`w-4.5 h-4.5 ${kart.color}`} />
              </div>
              <div className="text-xl font-bold text-gray-900 tracking-tight">{kart.deger}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{kart.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Süre Analizi */}
      <section className="card !p-6">
        <div className="flex items-center gap-2 mb-1">
          <Timer className="w-4 h-4 text-violet-600" />
          <h2 className="text-sm font-bold text-gray-900">Hangi soruda ne kadar bekledin?</h2>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Hangi soruda ne kadar kaldığını gör. Ortalama aykırı değerleri (tek soruya yığılan süreler)
          hariç tutar; kapsama oranı ölçüm kalitesini gösterir.
        </p>
        <OgrenciSureAnaliziPanel analizler={sureAnalizleri} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card !p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-indigo-500" /> Net Trendi
            </h2>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sinavVerisi}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="net" stroke="#4F46E5" strokeWidth={3} fill="url(#colorNet)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="card !p-5">
                <h2 className="text-xs font-bold text-gray-900 mb-4">Ders Dağılımı</h2>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={dersVerisi}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="ders" tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} />
                      <Radar name="Başarı" dataKey="basari" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
             </div>
             <div className="card !p-5">
                <h2 className="text-xs font-bold text-gray-900 mb-4">Performans (%)</h2>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dersVerisi} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="ders" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} width={70} />
                      <Tooltip />
                      <Bar dataKey="basari" fill="#4F46E5" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          {aiAnaliz && (
            <div className="card bg-slate-900 text-white border-0 !p-6 shadow-xl relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    <GraduationCap className="w-4 h-4" /> Rehber Değerlendirme
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed mb-6 font-medium">
                    "{aiAnaliz.genelDegerlendirme}"
                  </p>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                       <h4 className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Kuvvetli Yan</h4>
                       <p className="text-[10px] text-slate-300 leading-relaxed font-medium">{aiAnaliz.kuvvetliYonler?.[0]}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                       <h4 className="text-[9px] font-bold text-rose-400 uppercase tracking-wider mb-2">Gelişim Alanı</h4>
                       <p className="text-[10px] text-slate-300 leading-relaxed font-medium">{gelisimAlani || 'Gelişim alanların analiz ediliyor.'}</p>
                    </div>
                  </div>
               </div>
            </div>
          )}

          <div className="card !p-6">
             <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" /> Aksiyonlar
             </h2>
             <div className="space-y-4">
                {analiz?.zayifKonular?.slice(0, 4).map((konu: any, i: number) => (
                  <div key={i}>
                     <div className="flex justify-between mb-1">
                        <span className="text-[9px] font-bold text-indigo-600 uppercase">{konu.ders}</span>
                        <span className="text-[9px] font-bold text-gray-400">%{konu.basari.toFixed(0)}</span>
                     </div>
                     <p className="text-xs font-bold text-gray-900">{konu.konu}</p>
                     <p className="text-[10px] text-gray-500 mt-1 leading-snug font-medium">
                        {netArtirmaOneriMetni(konu)}
                     </p>
                  </div>
                ))}
             </div>
             
             <Link href="/study-plan" className="w-full mt-6 py-3 rounded-xl bg-slate-50 border border-slate-100 text-gray-600 font-bold text-[11px] hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2">
                Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
