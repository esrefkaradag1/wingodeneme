'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Filter,
  Loader2,
  School,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { kocApi } from '@/lib/api';
import { usePanelYolu } from '@/components/panel/PanelYolu';

type TopluVeri = {
  ozet: { ogrenciSayisi: number; toplamKatilim: number; ortalamaNet?: number };
  sinavBazli: Array<{
    sinavId: string;
    baslik: string;
    tur: string;
    katilimSayisi: number;
    ortalamaNet: number;
    enYuksekNet: number;
    enDusukNet: number;
  }>;
  ogrenciSiralamasi: Array<{
    ogrenciId: string;
    ad: string;
    soyad: string;
    kurumSinifAdi?: string | null;
    denemeSayisi: number;
    ortalamaNet: number;
  }>;
  sinifBazli: Array<{
    sinifId: string;
    ad: string;
    ogrenciSayisi: number;
    denemeSayisi: number;
    ortalamaNet: number;
    enYuksekNet: number;
  }>;
  dersBazli?: Array<{ ders: string; toplamSoru: number; basari: number }>;
  zayifKonular?: Array<{ ders: string; konu: string; toplamSoru: number; basari: number }>;
  sinifSecenekleri?: Array<{ id: string; ad: string }>;
  seciliSinifId?: string | null;
};

export default function TopluAnalizEkrani() {
  const temelYol = usePanelYolu();
  const [sinifId, setSinifId] = useState('');
  const [arama, setArama] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['koc-toplu', sinifId || 'hepsi'],
    queryFn: async () =>
      (await kocApi.topluAnaliz(sinifId ? { sinifId } : undefined)).data.veri as TopluVeri,
  });

  const filtrelenmisOgrenciler = useMemo(() => {
    const liste = data?.ogrenciSiralamasi ?? [];
    const q = arama.trim().toLowerCase();
    if (!q) return liste;
    return liste.filter((o) => `${o.ad} ${o.soyad}`.toLowerCase().includes(q));
  }, [data?.ogrenciSiralamasi, arama]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-red-600">Toplu analiz yüklenemedi.</p>;
  }

  const dersChart = (data.dersBazli ?? []).map((d) => ({
    ders: d.ders.length > 12 ? `${d.ders.slice(0, 12)}…` : d.ders,
    basari: d.basari,
  }));

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Toplu detaylı analiz</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sınıf / öğrenci karşılaştırması, sınav sonuçları, ders başarıları ve zayıf konular
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(data.sinifSecenekleri?.length ?? 0) > 0 && (
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={sinifId}
                onChange={(e) => setSinifId(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
              >
                <option value="">Tüm sınıflar</option>
                {data.sinifSecenekleri!.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ad}
                  </option>
                ))}
              </select>
            </label>
          )}
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Öğrenci ara…"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Users className="h-4 w-4" /> Öğrenci
          </div>
          <p className="mt-2 text-2xl font-bold">{data.ozet.ogrenciSayisi}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <BookOpen className="h-4 w-4" /> Tamamlanan deneme
          </div>
          <p className="mt-2 text-2xl font-bold">{data.ozet.toplamKatilim}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <TrendingUp className="h-4 w-4" /> Ort. net
          </div>
          <p className="mt-2 text-2xl font-bold">{data.ozet.ortalamaNet ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <AlertTriangle className="h-4 w-4" /> Zayıf konu
          </div>
          <p className="mt-2 text-2xl font-bold">{data.zayifKonular?.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {(data.sinifBazli?.length ?? 0) > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-bold">
                <School className="h-4 w-4 text-teal-600" /> Sınıf karşılaştırması
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-2 font-semibold">Sınıf</th>
                      <th className="px-5 py-2 font-semibold">Öğrenci</th>
                      <th className="px-5 py-2 font-semibold">Deneme</th>
                      <th className="px-5 py-2 font-semibold">Ort. net</th>
                      <th className="px-5 py-2 font-semibold">En yüksek</th>
                      <th className="px-5 py-2 font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.sinifBazli.map((s) => (
                      <tr key={s.sinifId} className="hover:bg-slate-50/80">
                        <td className="px-5 py-2.5 font-medium text-slate-900">{s.ad}</td>
                        <td className="px-5 py-2.5">{s.ogrenciSayisi}</td>
                        <td className="px-5 py-2.5">{s.denemeSayisi}</td>
                        <td className="px-5 py-2.5 font-semibold">{s.ortalamaNet}</td>
                        <td className="px-5 py-2.5 text-slate-500">{s.enYuksekNet}</td>
                        <td className="px-5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSinifId(s.sinifId)}
                            className="text-xs font-semibold text-teal-700 hover:underline"
                          >
                            Filtrele
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold">
              Öğrenci sıralaması (ort. net)
            </h2>
            {filtrelenmisOgrenciler.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Henüz deneme verisi yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-2 font-semibold">#</th>
                      <th className="px-5 py-2 font-semibold">Öğrenci</th>
                      <th className="px-5 py-2 font-semibold">Deneme</th>
                      <th className="px-5 py-2 font-semibold">Ort. net</th>
                      <th className="px-5 py-2 font-semibold">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtrelenmisOgrenciler.map((o, i) => (
                      <tr key={o.ogrenciId} className="hover:bg-slate-50/80">
                        <td className="px-5 py-2.5 text-slate-400">{i + 1}</td>
                        <td className="px-5 py-2.5">
                          <Link
                            href={`${temelYol}/ogrenci/${o.ogrenciId}`}
                            className="font-medium text-teal-700 hover:underline"
                          >
                            {o.ad} {o.soyad}
                          </Link>
                          {o.kurumSinifAdi && (
                            <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              {o.kurumSinifAdi}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5">{o.denemeSayisi}</td>
                        <td className="px-5 py-2.5 font-semibold">{o.ortalamaNet}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`${temelYol}/ogrenci/${o.ogrenciId}/analiz`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                            >
                              Analiz <ArrowRight className="h-3 w-3" />
                            </Link>
                            <Link
                              href={`${temelYol}/ogrenci/${o.ogrenciId}/sinavlar`}
                              className="text-xs font-semibold text-slate-500 hover:underline"
                            >
                              Sınavlar
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold">Sınav bazlı ortalama</h2>
            {data.sinavBazli.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Henüz sınav katılımı yok.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.sinavBazli.map((s) => (
                  <li
                    key={s.sinavId}
                    className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{s.baslik}</p>
                      <p className="text-xs text-slate-500">
                        {s.tur} · {s.katilimSayisi} katılım
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm">
                        Ort. <span className="font-bold">{s.ortalamaNet}</span>
                        <span className="text-slate-400">
                          {' '}
                          (min {s.enDusukNet} / max {s.enYuksekNet})
                        </span>
                      </p>
                      <Link
                        href={`${temelYol}/sinavlar/${s.sinavId}/sonuclar`}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
                      >
                        Sonuçlar <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {(data.dersBazli?.length ?? 0) > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Target className="h-4 w-4 text-teal-600" /> Ders başarıları (%)
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dersChart} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis
                      dataKey="ders"
                      type="category"
                      width={70}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar dataKey="basari" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Ortak zayıf konular
            </h2>
            {(data.zayifKonular?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">Yeterli konu verisi yok.</p>
            ) : (
              <div className="space-y-3">
                {data.zayifKonular!.map((k, i) => (
                  <div key={`${k.ders}-${k.konu}-${i}`} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-bold uppercase text-teal-700">{k.ders}</span>
                      <span className="text-slate-400">
                        %{k.basari} · {k.toplamSoru} soru
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{k.konu}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          k.basari >= 70 ? 'bg-emerald-500' : k.basari >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, k.basari))}%` }}
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
