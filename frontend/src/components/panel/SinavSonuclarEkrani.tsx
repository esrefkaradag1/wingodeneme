'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, FileText, Loader2, Trophy } from 'lucide-react';
import { kocApi } from '@/lib/api';
import { usePanelYolu } from '@/components/panel/PanelYolu';

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
  ogrenci: {
    id: string;
    ad: string;
    soyad: string;
    sinif: string | null;
    okul: string | null;
    kurumSinif?: { id: string; ad: string } | null;
  };
};

export default function SinavSonuclarEkrani() {
  const temelYol = usePanelYolu();
  const params = useParams();
  const sinavId = typeof params.id === 'string' ? params.id : '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['koc-sinav-katilimlar', sinavId],
    queryFn: async () => {
      const r = await kocApi.sinavKatilimlar(sinavId);
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
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg p-6">
        <p className="font-medium text-red-700">Sonuçlar yüklenemedi</p>
        <Link href={`${temelYol}/toplu`} className="mt-4 inline-block text-sm font-medium text-teal-700">
          ← Toplu analize dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`${temelYol}/toplu`}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Toplu analiz
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{data.sinav.baslik}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.sinav.tur} ·{' '}
            {format(new Date(data.sinav.baslangicZamani), 'd MMMM yyyy', { locale: tr })} · {data.toplam}{' '}
            tamamlayan (kurum / sınıfınız)
          </p>
        </div>
      </div>

      {data.katilimlar.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
          Bu sınavda kurumunuza bağlı tamamlanmış katılım yok.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Sıra</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Öğrenci</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">D/Y/B</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">Net</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">Puan</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">Yüzdelik</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {data.katilimlar.map((k, idx) => (
                <tr key={k.id} className="border-b border-slate-50 hover:bg-teal-50/30">
                  <td className="px-4 py-3 font-bold text-slate-400">#{k.ulusalSiralama ?? idx + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${temelYol}/ogrenci/${k.ogrenci.id}`}
                      className="font-bold text-slate-900 hover:text-teal-700"
                    >
                      {k.ogrenci.ad} {k.ogrenci.soyad}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {[k.ogrenci.kurumSinif?.ad, k.ogrenci.sinif, k.ogrenci.okul]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs tabular-nums">
                    <span className="font-bold text-emerald-700">{k.dogruSayisi}</span>/
                    <span className="font-bold text-rose-700">{k.yanlisSayisi}</span>/
                    <span className="text-slate-500">{k.bosSayisi}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold tabular-nums">{k.netPuan.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center font-bold tabular-nums">%{k.hamPuan.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-600">
                    {k.yuzdelik != null ? `%${k.yuzdelik.toFixed(1)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`${temelYol}/sinavlar/${sinavId}/karnesi/${k.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
                      >
                        <FileText className="h-3.5 w-3.5" /> Karnesi
                      </Link>
                      <Link
                        href={`${temelYol}/ogrenci/${k.ogrenci.id}/sonuc/${k.id}`}
                        className="text-xs font-semibold text-slate-500 hover:underline"
                      >
                        Özet
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.katilimlar.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Trophy className="h-4 w-4 text-amber-500" />
          En yüksek net: {data.katilimlar[0].netPuan.toFixed(2)} — {data.katilimlar[0].ogrenci.ad}{' '}
          {data.katilimlar[0].ogrenci.soyad}
        </div>
      )}
    </div>
  );
}
