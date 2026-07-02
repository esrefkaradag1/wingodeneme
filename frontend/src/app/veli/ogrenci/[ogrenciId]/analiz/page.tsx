'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { Trophy, Target, TrendingUp, AlertTriangle, Lightbulb, GraduationCap, Map } from 'lucide-react';
import { veliApi } from '@/lib/api';
import { VeliOgrenciBaslik, veliOgrenciYolu } from '@/components/veli/VeliOgrenciShell';
import { VeliSayfa, VeliStatKart, VeliPanel, VeliButon, VeliYukleniyor } from '@/components/veli/VeliUI';

export default function VeliOgrenciAnalizPage() {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['veli-ogrenci-analiz', ogrenciId],
    queryFn: async () => (await veliApi.ogrenciAnaliz(ogrenciId)).data.veri,
    enabled: !!ogrenciId,
  });

  if (isLoading) return <VeliYukleniyor mesaj="Raporlar hazırlanıyor…" />;

  const analiz = data?.analiz;
  const aiAnaliz = data?.aiAnaliz as {
    genelDegerlendirme?: string;
    kuvvetliYonler?: string[];
    geliştirmeGerekli?: string[];
  } | null;

  const dersVerisi = analiz?.dersPerformanslari?.map((d: { ders: string; ortalama: number }) => ({
    ders: d.ders,
    basari: d.ortalama,
  })) || [];

  const sinavVerisi = analiz?.sinavGecmisi?.map((s: { sinav: { baslik: string }; netPuan: number }) => ({
    name: s.sinav.baslik.substring(0, 12),
    net: s.netPuan,
  })) || [];

  return (
    <VeliSayfa>
      <VeliOgrenciBaslik altBaslik="Analiz & Raporlar" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <VeliStatKart ikon={Trophy} etiket="En iyi sıra" deger={analiz?.enIyiSiralama ? `#${analiz.enIyiSiralama.toLocaleString('tr-TR')}` : '—'} ton="amber" />
        <VeliStatKart ikon={Target} etiket="Ort. net" deger={analiz?.ortalamaNe?.toFixed(1) || '0'} ton="violet" />
        <VeliStatKart ikon={TrendingUp} etiket="Sınav" deger={analiz?.toplamSinav || 0} ton="emerald" />
        <VeliStatKart ikon={AlertTriangle} etiket="Zayıf konu" deger={analiz?.zayifKonular?.length || 0} ton="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {sinavVerisi.length > 0 && (
            <VeliPanel>
              <h2 className="text-sm font-bold text-gray-900 mb-4">Net trendi</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sinavVerisi}>
                    <defs>
                      <linearGradient id="veliNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="net" stroke="#7c3aed" strokeWidth={2.5} fill="url(#veliNet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </VeliPanel>
          )}

          {dersVerisi.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VeliPanel>
                <h2 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wide">Ders dağılımı</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={dersVerisi}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="ders" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <Radar dataKey="basari" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </VeliPanel>
              <VeliPanel>
                <h2 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wide">Performans (%)</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dersVerisi} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="ders" type="category" width={70} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="basari" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </VeliPanel>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {aiAnaliz?.genelDegerlendirme && (
            <VeliPanel className="!bg-gradient-to-br from-slate-900 to-violet-950 !border-0 text-white shadow-xl">
              <div className="flex items-center gap-2 mb-3 text-violet-300 text-xs font-bold uppercase tracking-wider">
                <GraduationCap className="w-4 h-4" /> Rehber değerlendirme
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{aiAnaliz.genelDegerlendirme}</p>
              {aiAnaliz.kuvvetliYonler?.[0] && (
                <p className="text-xs text-emerald-400 mt-3 font-medium">✓ {aiAnaliz.kuvvetliYonler[0]}</p>
              )}
            </VeliPanel>
          )}

          <VeliPanel>
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Zayıf konular
            </h2>
            <div className="space-y-4">
              {(analiz?.zayifKonular ?? []).slice(0, 6).map((konu: { konu: string; ders: string; basari: number }, i: number) => (
                <div key={i} className="pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-violet-600 uppercase">{konu.ders}</span>
                    <span className="text-gray-400 font-medium">%{konu.basari.toFixed(0)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{konu.konu}</p>
                </div>
              ))}
            </div>
            <VeliButon href={veliOgrenciYolu(ogrenciId, '/study-plan')} variant="outline" className="w-full mt-4">
              <Map className="w-4 h-4" /> Çalışma planını gör
            </VeliButon>
          </VeliPanel>
        </div>
      </div>
    </VeliSayfa>
  );
}
