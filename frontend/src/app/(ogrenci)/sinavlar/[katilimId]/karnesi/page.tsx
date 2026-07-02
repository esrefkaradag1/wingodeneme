'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { sinavApi } from '@/lib/api';
import { DenemeKarnesi, type DenemeKarnesiVerisi } from '@/components/exam/DenemeKarnesi';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';

export default function OgrenciDenemeKarnesiSayfasi() {
  const params = useParams();
  const katilimId = typeof params.katilimId === 'string' ? params.katilimId : '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['ogrenci-deneme-karnesi', katilimId],
    queryFn: async () => {
      const r = await sinavApi.karnesi(katilimId);
      return r.data.veri as DenemeKarnesiVerisi;
    },
    enabled: Boolean(katilimId),
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
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border text-center">
        <p className="text-red-700 font-medium">Deneme karnesi yüklenemedi</p>
        <Link href="/sinavlar" className="inline-block mt-6 btn-primary">
          Sınavlarıma dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border-b print:hidden">
        <Link
          href={`/sinavlar/${katilimId}/sonuc`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Sonuç sayfası
        </Link>
        <button type="button" onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-sm">
          <Printer className="w-4 h-4" /> Karnemi yazdır
        </button>
      </div>

      <div className="px-4 py-8 sm:px-8 print:p-0 bg-gradient-to-b from-slate-100 to-slate-50 min-h-screen print:bg-white">
        <DenemeKarnesi veri={data} />
      </div>
    </div>
  );
}
