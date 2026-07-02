'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { sureMsToMetin } from '@/lib/sureFormat';
import { ArrowLeft, Loader2, Timer, Users, BarChart3 } from 'lucide-react';

type SureAnaliziVerisi = {
  sinav: {
    id: string;
    baslik: string;
    sureDakika: number;
    soruSayisi: number;
    oneriSureMsPerSoru: number | null;
  };
  katilimSayisi: number;
  soruAnalizi: Array<{
    soruId: string;
    siraNo: number;
    ders: string;
    konu: string;
    katilimSayisi: number;
    ortalamaSureMs: number | null;
    minSureMs: number | null;
    maxSureMs: number | null;
  }>;
  ogrenciOzetleri: Array<{
    katilimId: string;
    ogrenciAd: string;
    toplamSureMs: number;
    ortalamaSureMs: number | null;
    kayitliSoruSayisi: number;
  }>;
};

export default function SinavSureAnaliziSayfasi() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sinav-sure-analizi', id],
    queryFn: async () => {
      const r = await adminApi.sinavSureAnalizi(id);
      return r.data.veri as SureAnaliziVerisi;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-red-700 font-medium">Süre analizi yüklenemedi</p>
        <Link href="/panel/sinavlar" className="inline-block mt-4 text-indigo-600 text-sm font-medium">
          ← Sınav listesine dön
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/panel/sinavlar"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Sınav listesi
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.sinav.baslik}</h1>
          <p className="text-sm text-gray-500 mt-1">Soru bazlı süre analizi</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-center min-w-[7rem]">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Katılım</p>
            <p className="text-xl font-bold text-gray-900">{data.katilimSayisi}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center min-w-[7rem]">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Öneri/soru</p>
            <p className="text-xl font-bold text-gray-900">{sureMsToMetin(data.sinav.oneriSureMsPerSoru)}</p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" /> Soru bazlı ortalama süreler
        </h2>
        {data.soruAnalizi.length === 0 ? (
          <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 p-8 text-center">
            Henüz süre verisi yok. Öğrenciler sınavı tamamladıkça burada görünür.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Soru</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Ders / Konu</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider text-center">Kayıt</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Ort.</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Min</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                {data.soruAnalizi.map((s) => {
                  const yavasMi =
                    data.sinav.oneriSureMsPerSoru != null &&
                    s.ortalamaSureMs != null &&
                    s.ortalamaSureMs > data.sinav.oneriSureMsPerSoru * 1.5;
                  return (
                    <tr key={s.soruId} className={`border-b border-gray-50 ${yavasMi ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3 font-bold text-gray-900">S.{s.siraNo}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase">{s.ders}</span>
                        <span className="block text-xs">{s.konu}</span>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{s.katilimSayisi}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{sureMsToMetin(s.ortalamaSureMs)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{sureMsToMetin(s.minSureMs)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{sureMsToMetin(s.maxSureMs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" /> Öğrenci bazlı süre özeti
        </h2>
        {data.ogrenciOzetleri.filter((o) => o.kayitliSoruSayisi > 0).length === 0 ? (
          <p className="text-sm text-gray-500">Öğrenci süre kaydı bulunamadı.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.ogrenciOzetleri
              .filter((o) => o.kayitliSoruSayisi > 0)
              .map((o) => (
                <div key={o.katilimId} className="rounded-xl border border-gray-100 bg-white p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{o.ogrenciAd}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {o.kayitliSoruSayisi} soru kayıtlı
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1 justify-end">
                      <Timer className="w-3 h-3" /> Toplam
                    </p>
                    <p className="text-lg font-bold text-gray-900">{sureMsToMetin(o.toplamSureMs)}</p>
                    <p className="text-xs text-gray-500">Ort: {sureMsToMetin(o.ortalamaSureMs)}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
