'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { kocApi } from '@/lib/api';
import { DenemeKarnesi, type DenemeKarnesiVerisi } from '@/components/exam/DenemeKarnesi';
import { usePanelYolu } from '@/components/panel/PanelYolu';

export default function DenemeKarnesiEkrani() {
  const temelYol = usePanelYolu();
  const params = useParams();
  const sinavId = typeof params.id === 'string' ? params.id : '';
  const katilimId = typeof params.katilimId === 'string' ? params.katilimId : '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['koc-deneme-karnesi', sinavId, katilimId],
    queryFn: async () => {
      const r = await kocApi.denemeKarnesi(sinavId, katilimId);
      return r.data.veri as DenemeKarnesiVerisi;
    },
    enabled: Boolean(sinavId && katilimId),
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
        <p className="font-medium text-red-700">Deneme karnesi yüklenemedi</p>
        <Link
          href={`${temelYol}/sinavlar/${sinavId}/sonuclar`}
          className="mt-4 inline-block text-sm font-medium text-teal-700"
        >
          ← Sonuç listesine dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-4 print:hidden">
        <Link
          href={`${temelYol}/sinavlar/${sinavId}/sonuclar`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Sonuç listesi
        </Link>
        <div className="flex items-center gap-2">
          <p className="hidden text-xs text-slate-500 sm:block">
            {data.ogrenci.ad} {data.ogrenci.soyad} — {data.sinav.baslik}
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Printer className="h-4 w-4" /> Yazdır / PDF
          </button>
        </div>
      </div>

      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-8 sm:px-8 print:bg-white print:p-0">
        <DenemeKarnesi veri={data} />
      </div>
    </div>
  );
}
