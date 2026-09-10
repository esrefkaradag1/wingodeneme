'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft } from 'lucide-react';
import { kocApi } from '@/lib/api';
import { usePanelYolu } from '@/components/panel/PanelYolu';

export default function OgrenciSinavlarEkrani() {
  const temelYol = usePanelYolu();
  const { ogrenciId } = useParams<{ ogrenciId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['koc-sinavlar', ogrenciId],
    queryFn: async () => (await kocApi.ogrenciSinavlar(ogrenciId)).data.veri as Array<{
      id: string;
      baslik: string;
      tur: string;
      durum?: string;
      katilimId?: string | null;
      katilimDurumu?: string | null;
      soruSayisi?: number;
    }>,
    enabled: !!ogrenciId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const liste = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <Link href={`${temelYol}/ogrenci/${ogrenciId}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Öğrenci özeti
      </Link>
      <h1 className="text-2xl font-bold">Sınavlar</h1>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {liste.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-500">Sınav bulunamadı.</li>
        ) : (
          liste.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{s.baslik}</p>
                <p className="text-xs text-slate-500">
                  {s.tur}
                  {s.katilimDurumu ? ` · ${s.katilimDurumu}` : ''}
                </p>
              </div>
              {s.katilimId && s.katilimDurumu === 'TAMAMLANDI' ? (
                <Link
                  href={`${temelYol}/ogrenci/${ogrenciId}/sonuc/${s.katilimId}`}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Sonuç
                </Link>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
