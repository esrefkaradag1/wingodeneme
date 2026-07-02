'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, FileText, Loader2, Trophy } from 'lucide-react';

type KatilimSatiri = {
  id: string;
  netPuan: number;
  hamPuan: number;
  dogruSayisi: number;
  yanlisSayisi: number;
  bosSayisi: number;
  ulusalSiralama: number | null;
  yuzdelik: number | null;
  bitisZamani: string | null;
  ogrenci: { id: string; ad: string; soyad: string; sinif: string | null; okul: string | null };
};

export default function SinavSonuclariSayfasi() {
  const params = useParams();
  const sinavId = typeof params.id === 'string' ? params.id : '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sinav-katilimlar', sinavId],
    queryFn: async () => {
      const r = await adminApi.sinavKatilimlar(sinavId);
      return r.data.veri as {
        sinav: { id: string; baslik: string; tur: string; baslangicZamani: string };
        katilimlar: KatilimSatiri[];
        toplam: number;
      };
    },
    enabled: Boolean(sinavId),
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
        <p className="text-red-700 font-medium">Sonuçlar yüklenemedi</p>
        <Link href="/panel/sinavlar" className="inline-block mt-4 text-indigo-600 text-sm font-medium">
          ← Sınav listesine dön
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/panel/sinavlar"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Sınav listesi
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.sinav.baslik}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.sinav.tur} · {format(new Date(data.sinav.baslangicZamani), 'd MMMM yyyy', { locale: tr })} ·{' '}
            {data.toplam} tamamlayan
          </p>
        </div>
        <Link
          href={`/panel/sinavlar/${sinavId}/sure-analizi`}
          className="btn-secondary text-sm inline-flex items-center gap-2"
        >
          Süre analizi
        </Link>
      </div>

      {data.katilimlar.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
          Henüz tamamlanan katılım yok.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
                <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase">Sıra</th>
                <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase">Öğrenci</th>
                <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">D/Y/B</th>
                <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Net</th>
                <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Puan</th>
                <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-center">Yüzdelik</th>
                <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase text-right">Karnesi</th>
              </tr>
            </thead>
            <tbody>
              {data.katilimlar.map((k, idx) => (
                <tr key={k.id} className="border-b border-gray-50 hover:bg-indigo-50/30">
                  <td className="px-4 py-3 font-bold text-gray-400">#{k.ulusalSiralama ?? idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">
                      {k.ogrenci.ad} {k.ogrenci.soyad}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[k.ogrenci.sinif, k.ogrenci.okul].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-xs">
                    <span className="text-emerald-700 font-bold">{k.dogruSayisi}</span>/
                    <span className="text-rose-700 font-bold">{k.yanlisSayisi}</span>/
                    <span className="text-gray-500">{k.bosSayisi}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold tabular-nums">{k.netPuan.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center font-bold tabular-nums">%{k.hamPuan.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {k.yuzdelik != null ? `%${k.yuzdelik.toFixed(1)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/panel/sinavlar/${sinavId}/karnesi/${k.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                    >
                      <FileText className="w-3.5 h-3.5" /> Karnesi
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.katilimlar.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Trophy className="w-4 h-4 text-amber-500" />
          En yüksek net: {data.katilimlar[0].netPuan.toFixed(2)} — {data.katilimlar[0].ogrenci.ad}{' '}
          {data.katilimlar[0].ogrenci.soyad}
        </div>
      )}
    </div>
  );
}
