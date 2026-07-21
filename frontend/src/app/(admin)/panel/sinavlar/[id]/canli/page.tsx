'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, CheckCircle2, Loader2, Radio, RefreshCw, Users } from 'lucide-react';

type CanliOgrenci = {
  id: string;
  ad: string;
  soyad: string;
  sinif: string | null;
  okul: string | null;
  ogretimTuru: string;
  kullanici?: { email: string } | null;
};

type CanliKatilim = {
  id: string;
  baslangicZamani: string | null;
  guncellendi: string;
  ogrenci: CanliOgrenci;
};

export default function SinavCanliDetaySayfasi() {
  const params = useParams();
  const sinavId = typeof params.id === 'string' ? params.id : '';

  const { data, isLoading, isFetching, error, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['admin-sinav-canli', sinavId],
    queryFn: async () => {
      const r = await adminApi.sinavCanli(sinavId);
      return r.data.veri as {
        sinav: {
          id: string;
          baslik: string;
          tur: string;
          sureDakika: number;
          baslangicZamani: string;
          bitisZamani: string | null;
          grup?: { ad: string; tur: string } | null;
        };
        sayilar: { devamEden: number; tamamlanan: number; atanan: number; girisYapan: number };
        devamEdenler: CanliKatilim[];
      };
    },
    enabled: Boolean(sinavId),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-red-700 font-medium">Canlı veri yüklenemedi</p>
        <Link href="/panel/sinavlar/canli" className="inline-block mt-4 text-indigo-600 text-sm font-medium">
          ← Canlı takip
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/panel/sinavlar/canli"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Canlı takip
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Radio className="w-6 h-6 text-rose-600" />
            {data.sinav.baslik}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.sinav.grup?.ad || data.sinav.tur} · her 5 sn yenilenir
            {dataUpdatedAt
              ? ` · ${format(new Date(dataUpdatedAt), 'HH:mm:ss', { locale: tr })}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary text-sm inline-flex items-center gap-2"
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 border-rose-100 bg-rose-50/50">
          <p className="text-[10px] font-bold uppercase text-rose-500">Sınavda</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{data.sayilar.devamEden}</p>
        </div>
        <div className="card p-4 border-emerald-100 bg-emerald-50/50">
          <p className="text-[10px] font-bold uppercase text-emerald-600">Biten</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{data.sayilar.tamamlanan}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase text-gray-400">Giriş yapan</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{data.sayilar.girisYapan}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase text-gray-400">Atanan</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{data.sayilar.atanan}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-600" />
          <h2 className="font-bold text-gray-900 text-sm">Şu an sınavda olanlar</h2>
        </div>
        {data.devamEdenler.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            {data.sayilar.tamamlanan > 0 ? (
              <span className="inline-flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Devam eden yok · {data.sayilar.tamamlanan} kişi tamamladı
              </span>
            ) : (
              'Henüz kimse sınava girmedi'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">#</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">Öğrenci</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">E-posta</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">Giriş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.devamEdenler.map((k, i) => (
                  <tr key={k.id} className="hover:bg-rose-50/40">
                    <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {k.ogrenci.ad} {k.ogrenci.soyad}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{k.ogrenci.kullanici?.email || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {k.baslangicZamani
                        ? format(new Date(k.baslangicZamani), 'HH:mm:ss', { locale: tr })
                        : '—'}
                      {k.baslangicZamani ? (
                        <span className="block text-[11px] text-gray-400">
                          {formatDistanceToNow(new Date(k.baslangicZamani), {
                            addSuffix: true,
                            locale: tr,
                          })}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
