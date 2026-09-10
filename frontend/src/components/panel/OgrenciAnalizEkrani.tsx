'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Loader2,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { kocApi } from '@/lib/api';
import { usePanelYolu } from '@/components/panel/PanelYolu';

type Analiz = {
  ortalamaNet?: number;
  ortalamaNe?: number;
  enIyiSiralama?: number | null;
  toplamSinav?: number;
  dersPerformanslari?: Array<{ ders: string; ortalama: number }>;
  sinavGecmisi?: Array<{
    id?: string;
    sinav: { baslik: string; tur?: string };
    netPuan: number;
    ulusalSiralama?: number | null;
    katilimId?: string;
  }>;
  zayifKonular?: Array<{ konu: string; ders: string; basari: number }>;
  konuPerformanslari?: Array<{
    konu: string;
    ders: string;
    basariYuzdesi: number;
    toplamSoru: number;
  }>;
};

type AiAnaliz = {
  genelDegerlendirme?: string;
  kuvvetliYonler?: string[];
  geliştirmeGerekli?: string[];
  acilOnlemler?: string[];
} | null;

export default function OgrenciAnalizEkrani() {
  const temelYol = usePanelYolu();
  const { ogrenciId } = useParams<{ ogrenciId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['koc-analiz', ogrenciId],
    queryFn: async () =>
      (await kocApi.ogrenciAnaliz(ogrenciId)).data.veri as {
        analiz: Analiz;
        aiAnaliz: AiAnaliz;
      },
    enabled: !!ogrenciId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-red-600">Analiz yüklenemedi veya erişim yok.</p>;
  }

  const analiz = data.analiz ?? {};
  const ai = data.aiAnaliz;
  const ortNet = analiz.ortalamaNet ?? analiz.ortalamaNe ?? 0;

  const dersVerisi =
    analiz.dersPerformanslari?.map((d) => ({
      ders: d.ders,
      basari: Number(d.ortalama) || 0,
    })) || [];

  const sinavVerisi =
    [...(analiz.sinavGecmisi ?? [])]
      .reverse()
      .map((s) => ({
        name: (s.sinav?.baslik || 'Deneme').substring(0, 14),
        net: Number(s.netPuan) || 0,
        katilimId: s.katilimId || s.id,
      })) || [];

  const zayif = (analiz.zayifKonular ?? []).slice(0, 8);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`${temelYol}/ogrenci/${ogrenciId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Öğrenci özeti
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Detaylı performans analizi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Net trendi, ders dağılımı ve zayıf konular — koç / kurum görünümü
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${temelYol}/ogrenci/${ogrenciId}/sinavlar`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-300"
          >
            Sınavlar
          </Link>
          <Link
            href={`${temelYol}/toplu`}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Toplu analize dön
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            ikon: Trophy,
            label: 'En iyi sıra',
            deger: analiz.enIyiSiralama ? `#${analiz.enIyiSiralama.toLocaleString('tr-TR')}` : '—',
            renk: 'text-amber-600 bg-amber-50',
          },
          {
            ikon: Target,
            label: 'Ort. net',
            deger: Number(ortNet).toFixed(1),
            renk: 'text-teal-700 bg-teal-50',
          },
          {
            ikon: TrendingUp,
            label: 'Sınav',
            deger: analiz.toplamSinav ?? sinavVerisi.length,
            renk: 'text-emerald-600 bg-emerald-50',
          },
          {
            ikon: AlertTriangle,
            label: 'Zayıf konu',
            deger: zayif.length,
            renk: 'text-rose-600 bg-rose-50',
          },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${k.renk}`}>
              <k.ikon className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold text-slate-900">{k.deger}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <TrendingUp className="h-4 w-4 text-teal-600" /> Net trendi
            </h2>
            {sinavVerisi.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Henüz tamamlanan deneme yok.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sinavVerisi}>
                    <defs>
                      <linearGradient id="kocNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="net" stroke="#0d9488" strokeWidth={2.5} fill="url(#kocNet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {dersVerisi.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-900">Ders dağılımı</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={dersVerisi}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="ders" tick={{ fontSize: 9, fill: '#64748b' }} />
                      <Radar dataKey="basari" stroke="#0d9488" fill="#0d9488" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-900">Performans (%)</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dersVerisi} layout="vertical">
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis
                        dataKey="ders"
                        type="category"
                        width={72}
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar dataKey="basari" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          )}

          {(analiz.sinavGecmisi?.length ?? 0) > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-bold">
                <BookOpen className="h-4 w-4 text-teal-600" /> Son denemeler
              </h2>
              <ul className="divide-y divide-slate-100">
                {(analiz.sinavGecmisi ?? []).slice(0, 10).map((s, i) => {
                  const katilimId = s.katilimId || s.id;
                  return (
                  <li key={katilimId || i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{s.sinav?.baslik}</p>
                      <p className="text-xs text-slate-500">
                        {s.sinav?.tur}
                        {s.ulusalSiralama ? ` · sıra #${s.ulusalSiralama.toLocaleString('tr-TR')}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-bold text-slate-900">{Number(s.netPuan).toFixed(1)} net</span>
                      {katilimId && (
                        <Link
                          href={`${temelYol}/ogrenci/${ogrenciId}/sonuc/${katilimId}`}
                          className="text-xs font-semibold text-teal-700 hover:underline"
                        >
                          Sonuç
                        </Link>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-5">
          {ai && (ai.genelDegerlendirme || ai.kuvvetliYonler?.length || ai.geliştirmeGerekli?.length) && (
            <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-950 p-5 text-white shadow-lg">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
                <GraduationCap className="h-4 w-4" /> AI değerlendirme
              </div>
              {ai.genelDegerlendirme && (
                <p className="text-sm leading-relaxed text-slate-300">{ai.genelDegerlendirme}</p>
              )}
              {ai.kuvvetliYonler?.[0] && (
                <p className="mt-3 text-xs font-medium text-emerald-400">✓ {ai.kuvvetliYonler[0]}</p>
              )}
              {(ai.geliştirmeGerekli?.[0] || ai.acilOnlemler?.[0]) && (
                <p className="mt-2 text-xs font-medium text-amber-300">
                  → {ai.geliştirmeGerekli?.[0] || ai.acilOnlemler?.[0]}
                </p>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Zayıf konular
            </h2>
            {zayif.length === 0 ? (
              <p className="text-sm text-slate-500">Yeterli konu verisi yok.</p>
            ) : (
              <div className="space-y-3">
                {zayif.map((konu, i) => (
                  <div key={`${konu.ders}-${konu.konu}-${i}`} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-bold uppercase text-teal-700">{konu.ders}</span>
                      <span className="font-medium text-slate-400">%{Number(konu.basari).toFixed(0)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{konu.konu}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          konu.basari >= 70 ? 'bg-emerald-500' : konu.basari >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, konu.basari))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
