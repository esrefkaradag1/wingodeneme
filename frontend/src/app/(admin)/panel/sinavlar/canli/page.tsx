'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, Loader2, Radio, RefreshCw, Users, CheckCircle2 } from 'lucide-react';

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

type CanliSinavBlok = {
  sinav: {
    id: string;
    baslik: string;
    tur: string;
    sureDakika: number;
    baslangicZamani: string;
    bitisZamani: string;
    grup?: { ad: string; tur: string } | null;
  };
  sayilar: { devamEden: number; tamamlanan: number; atanan: number; girisYapan: number };
  devamEdenler: CanliKatilim[];
};

type CanliOzet = {
  guncellemeZamani: string;
  ozet: { sinavSayisi: number; toplamDevamEden: number; toplamTamamlanan: number };
  sinavlar: CanliSinavBlok[];
};

function gecenSure(baslangic: string | null, sureDakika: number): string {
  if (!baslangic) return '—';
  const bas = new Date(baslangic).getTime();
  const dk = Math.max(0, Math.floor((Date.now() - bas) / 60000));
  const kalan = Math.max(0, sureDakika - dk);
  return `${dk} dk geçti · ~${kalan} dk kaldı`;
}

export default function SinavCanliSayfasi() {
  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['admin-sinavlar-canli'],
    queryFn: async () => {
      const r = await adminApi.sinavlarCanli();
      return r.data.veri as CanliOzet;
    },
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const ozet = data?.ozet;
  const sinavlar = data?.sinavlar || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/panel/sinavlar"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Sınav listesi
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            Canlı sınav takibi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Şu an sınava giren öğrenciler · her 5 saniyede yenilenir
            {dataUpdatedAt
              ? ` · son güncelleme ${format(new Date(dataUpdatedAt), 'HH:mm:ss', { locale: tr })}`
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">İzlenen sınav</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{ozet?.sinavSayisi ?? 0}</p>
        </div>
        <div className="card p-4 border-rose-100 bg-rose-50/40">
          <p className="text-[11px] font-bold uppercase text-rose-500 tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> Şu an sınavda
          </p>
          <p className="text-3xl font-bold text-rose-700 mt-1">{ozet?.toplamDevamEden ?? 0}</p>
        </div>
        <div className="card p-4 border-emerald-100 bg-emerald-50/40">
          <p className="text-[11px] font-bold uppercase text-emerald-600 tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tamamlayan
          </p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">{ozet?.toplamTamamlanan ?? 0}</p>
        </div>
      </div>

      {sinavlar.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-700">Şu an canlı penceresi açık sınav yok</p>
          <p className="text-sm mt-1">Sınav saati gelince buraya otomatik düşer.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sinavlar.map((blok) => {
            const pencereAcik =
              new Date(blok.sinav.baslangicZamani) <= new Date() &&
              (!blok.sinav.bitisZamani || new Date(blok.sinav.bitisZamani) >= new Date());
            return (
              <div key={blok.sinav.id} className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/80">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-gray-900">{blok.sinav.baslik}</h2>
                      {pencereAcik ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          Canlı
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                          Pencere kapalı
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {blok.sinav.grup?.ad || blok.sinav.tur} ·{' '}
                      {format(new Date(blok.sinav.baslangicZamani), 'd MMM HH:mm', { locale: tr })} –{' '}
                      {format(new Date(blok.sinav.bitisZamani), 'HH:mm', { locale: tr })} ·{' '}
                      {blok.sinav.sureDakika} dk
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-rose-500">Sınavda</p>
                      <p className="text-xl font-bold text-rose-700">{blok.sayilar.devamEden}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-emerald-600">Biten</p>
                      <p className="text-xl font-bold text-emerald-700">{blok.sayilar.tamamlanan}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Atanan</p>
                      <p className="text-xl font-bold text-gray-700">{blok.sayilar.atanan}</p>
                    </div>
                    <Link
                      href={`/panel/sinavlar/${blok.sinav.id}/sonuclar`}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Sonuçlar →
                    </Link>
                  </div>
                </div>

                {blok.devamEdenler.length === 0 ? (
                  <div className="px-5 py-8 text-sm text-gray-400 text-center">
                    Henüz devam eden öğrenci yok
                    {blok.sayilar.tamamlanan > 0
                      ? ` · ${blok.sayilar.tamamlanan} kişi tamamladı`
                      : ''}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white border-b border-gray-50">
                        <tr>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">
                            #
                          </th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">
                            Öğrenci
                          </th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">
                            E-posta
                          </th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">
                            Giriş
                          </th>
                          <th className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-400">
                            Süre
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {blok.devamEdenler.map((k, i) => (
                          <tr key={k.id} className="hover:bg-rose-50/30">
                            <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {k.ogrenci.ad} {k.ogrenci.soyad}
                              {k.ogrenci.okul ? (
                                <span className="block text-xs text-gray-400 font-normal">
                                  {k.ogrenci.okul}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {k.ogrenci.kullanici?.email || '—'}
                            </td>
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
                            <td className="px-5 py-3 text-gray-600">
                              {gecenSure(k.baslangicZamani, blok.sinav.sureDakika)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
