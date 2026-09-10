'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft } from 'lucide-react';
import { kocApi } from '@/lib/api';
import { usePanelYolu } from '@/components/panel/PanelYolu';

export default function OgrenciOzetEkrani() {
  const temelYol = usePanelYolu();
  const { ogrenciId } = useParams<{ ogrenciId: string }>();

  const { data: profil, isLoading: pYukle } = useQuery({
    queryKey: ['koc-ogrenci-profil', ogrenciId],
    queryFn: async () => (await kocApi.ogrenciProfil(ogrenciId)).data.veri as {
      ad: string; soyad: string; email: string; sinif?: string; okul?: string; ogretimTuru: string;
      hedefUniversite?: string; hedefBolum?: string;
    },
    enabled: !!ogrenciId,
  });

  const { data: ozet } = useQuery({
    queryKey: ['koc-ozet'],
    queryFn: async () => (await kocApi.ozet()).data.veri as {
      ogrenciler: Array<{
        id: string;
        ozet: { tamamlananDeneme: number; ortalamaNet: number; enIyiSiralama: number | null };
        sonDenemeler: Array<{ katilimId: string; sinavBaslik: string; net: number; tarih: string }>;
      }>;
    },
  });

  const ogr = ozet?.ogrenciler.find((o) => o.id === ogrenciId);

  if (pYukle || !profil) {
    return (
      <div className="flex justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href={`${temelYol}/dashboard`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Öğrencilerim
      </Link>
      <div>
        <h1 className="text-2xl font-bold">
          {profil.ad} {profil.soyad}
        </h1>
        <p className="text-sm text-slate-500">
          {profil.ogretimTuru}
          {profil.sinif ? ` · ${profil.sinif}` : ''}
          {profil.okul ? ` · ${profil.okul}` : ''}
        </p>
        <p className="text-xs text-slate-400">{profil.email}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`${temelYol}/ogrenci/${ogrenciId}/analiz`} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
          Analiz
        </Link>
        <Link href={`${temelYol}/ogrenci/${ogrenciId}/sinavlar`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">
          Sınavlar
        </Link>
      </div>

      {ogr && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Deneme</p>
            <p className="text-xl font-bold">{ogr.ozet.tamamlananDeneme}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Ort. net</p>
            <p className="text-xl font-bold">{ogr.ozet.ortalamaNet}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">En iyi sıra</p>
            <p className="text-xl font-bold">{ogr.ozet.enIyiSiralama ?? '—'}</p>
          </div>
        </div>
      )}

      {ogr && ogr.sonDenemeler.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold">Son denemeler</h2>
          <ul className="divide-y divide-slate-100">
            {ogr.sonDenemeler.map((d) => (
              <li key={d.katilimId} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{d.sinavBaslik}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{d.net} net</span>
                  <Link
                    href={`${temelYol}/ogrenci/${ogrenciId}/sonuc/${d.katilimId}`}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    Sonuç
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
