'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  MinusCircle,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { kocApi } from '@/lib/api';
import { usePanelYolu } from '@/components/panel/PanelYolu';

type Cevap = {
  soruId: string;
  secilen: string | null;
  dogru: boolean | null;
  ders: string;
  konu: string;
  dogruCevap: string;
};

type KonuOzet = {
  key: string;
  ders: string;
  konu: string;
  dogru: number;
  yanlis: number;
  bos: number;
  toplam: number;
  basari: number;
};

export default function OgrenciSonucEkrani() {
  const temelYol = usePanelYolu();
  const { ogrenciId, katilimId } = useParams<{ ogrenciId: string; katilimId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['koc-sonuc', ogrenciId, katilimId],
    queryFn: async () =>
      (await kocApi.ogrenciSonuc(ogrenciId, katilimId)).data.veri as {
        katilim: {
          dogruSayisi: number;
          yanlisSayisi: number;
          bosSayisi: number;
          netPuan: number;
          hamPuan?: number;
          ulusalSiralama: number | null;
          yuzdelik: number | null;
        };
        sinav: { id?: string; baslik: string; tur: string };
        cevaplar: Cevap[];
      },
    enabled: !!ogrenciId && !!katilimId,
  });

  const konuOzet = useMemo((): KonuOzet[] => {
    const map = new Map<string, KonuOzet>();
    for (const c of data?.cevaplar ?? []) {
      const key = `${c.ders}::${c.konu}`;
      const mevcut = map.get(key) || {
        key,
        ders: c.ders || 'Diğer',
        konu: c.konu || 'Konu',
        dogru: 0,
        yanlis: 0,
        bos: 0,
        toplam: 0,
        basari: 0,
      };
      mevcut.toplam += 1;
      if (c.dogru === true) mevcut.dogru += 1;
      else if (c.dogru === false) mevcut.yanlis += 1;
      else mevcut.bos += 1;
      map.set(key, mevcut);
    }
    return [...map.values()]
      .map((k) => ({
        ...k,
        basari: k.toplam > 0 ? (k.dogru / k.toplam) * 100 : 0,
      }))
      .sort((a, b) => a.basari - b.basari);
  }, [data?.cevaplar]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-red-600">Sonuç yüklenemedi.</p>;
  }

  const k = data.katilim;
  const yanlislar = (data.cevaplar ?? []).filter((c) => c.dogru === false);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <Link
          href={`${temelYol}/ogrenci/${ogrenciId}/sinavlar`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Sınavlar
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{data.sinav.baslik}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.sinav.tur}
          {k.yuzdelik != null ? ` · %${Number(k.yuzdelik).toFixed(1)}` : ''}
        </p>
        {data.sinav.id && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`${temelYol}/sinavlar/${data.sinav.id}/karnesi/${katilimId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
            >
              <FileText className="h-3.5 w-3.5" /> Deneme karnesi
            </Link>
            <Link
              href={`${temelYol}/sinavlar/${data.sinav.id}/sonuclar`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sınav sonuç listesi
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{k.dogruSayisi}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doğru</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <XCircle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{k.yanlisSayisi}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Yanlış</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <MinusCircle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{k.bosSayisi}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boş</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Trophy className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{Number(k.netPuan).toFixed(1)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Net{k.ulusalSiralama != null ? ` · #${k.ulusalSiralama.toLocaleString('tr-TR')}` : ''}
          </p>
        </div>
      </div>

      {konuOzet.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-sm font-bold">
            <Target className="h-4 w-4 text-teal-600" /> Konu / kazanım kırılımı
          </h2>
          <div className="grid gap-2 p-4 sm:grid-cols-2">
            {konuOzet.map((ka) => {
              const renk =
                ka.basari >= 70
                  ? 'border-emerald-100 bg-emerald-50/40'
                  : ka.basari >= 50
                    ? 'border-amber-100 bg-amber-50/40'
                    : 'border-rose-100 bg-rose-50/40';
              return (
                <div key={ka.key} className={`rounded-xl border p-4 ${renk}`}>
                  <p className="text-[10px] font-bold uppercase text-teal-700">{ka.ders}</p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">{ka.konu}</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Başarı %{ka.basari.toFixed(0)} · D:{ka.dogru} Y:{ka.yanlis} B:{ka.bos}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {yanlislar.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold">
            Yanlış cevaplar ({yanlislar.length})
          </h2>
          <ul className="divide-y divide-slate-100">
            {yanlislar.map((c) => (
              <li key={c.soruId} className="px-5 py-3 text-sm">
                <p className="text-[10px] font-bold uppercase text-rose-600">
                  {c.ders} · {c.konu}
                </p>
                <p className="mt-1 text-slate-700">
                  Seçim: <span className="font-semibold">{c.secilen || '—'}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  Doğru: <span className="font-semibold text-emerald-700">{c.dogruCevap}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`${temelYol}/ogrenci/${ogrenciId}/analiz`}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Genel analize git
        </Link>
        <Link
          href={`${temelYol}/ogrenci/${ogrenciId}/sinavlar`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          Tüm sınavlar
        </Link>
      </div>
    </div>
  );
}
