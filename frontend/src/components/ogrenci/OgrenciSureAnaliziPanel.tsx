'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { sureMsToMetin } from '@/lib/sureFormat';
import {
  Timer,
  ChevronDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ExternalLink,
  BarChart3,
} from 'lucide-react';

export type SureAnaliziOgesi = {
  katilimId: string;
  sinavBaslik: string;
  sinavTur: string;
  netPuan: number;
  toplamSureMs: number;
  ortalamaSureMs: number | null;
  kayitliSoruSayisi: number;
  toplamSoruSayisi: number;
  oneriSureMsPerSoru: number | null;
  enYavasSorular: Array<{
    soruId: string;
    siraNo: number;
    ders: string;
    konu: string;
    sureMs: number | null;
    dogru: boolean | null;
  }>;
  soruSureleri: Array<{
    soruId: string;
    siraNo: number;
    ders: string;
    konu: string;
    sureMs: number | null;
    dogru: boolean | null;
  }>;
};

interface Props {
  analizler: SureAnaliziOgesi[];
  compact?: boolean;
}

function durumIkon(dogru: boolean | null) {
  if (dogru === true) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (dogru === false) return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
  return <MinusCircle className="w-3.5 h-3.5 text-slate-400" />;
}

export function OgrenciSureAnaliziPanel({ analizler, compact = false }: Props) {
  const [seciliId, setSeciliId] = useState<string>(() => analizler[0]?.katilimId ?? '');
  const [siralama, setSiralama] = useState<'sira' | 'sure'>('sira');

  const secili = useMemo(
    () => analizler.find((a) => a.katilimId === seciliId) ?? analizler[0] ?? null,
    [analizler, seciliId]
  );

  const soruListesi = useMemo(() => {
    if (!secili) return [];
    const liste = [...secili.soruSureleri];
    if (siralama === 'sure') {
      return liste.sort((a, b) => (b.sureMs ?? 0) - (a.sureMs ?? 0));
    }
    return liste.sort((a, b) => a.siraNo - b.siraNo);
  }, [secili, siralama]);

  const maxSureMs = useMemo(() => {
    if (!secili) return 1;
    return Math.max(1, ...secili.soruSureleri.map((s) => s.sureMs ?? 0));
  }, [secili]);

  if (analizler.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-8 text-center">
        <Timer className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-700">Henüz süre kaydı yok</p>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Sınav sırasında sorular arasında geçiş yaptıkça süreler kaydedilir. Yeni tamamlanan sınavlardan sonra burada görünür.
        </p>
      </div>
    );
  }

  if (!secili) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" /> Soru Süre Analizi
        </h2>
        {!compact && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSiralama('sira')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                siralama === 'sira' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Soru sırası
            </button>
            <button
              type="button"
              onClick={() => setSiralama('sure')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                siralama === 'sure' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              En uzun
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {analizler.map((a) => (
          <button
            key={a.katilimId}
            type="button"
            onClick={() => setSeciliId(a.katilimId)}
            className={`rounded-xl border px-3 py-2 text-left transition-all min-w-[140px] ${
              secili.katilimId === a.katilimId
                ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                : 'border-gray-100 bg-white hover:border-indigo-100'
            }`}
          >
            <p className="text-xs font-bold text-gray-900 truncate max-w-[180px]">{a.sinavBaslik}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {sureMsToMetin(a.toplamSureMs)} · Net {a.netPuan.toFixed(1)}
            </p>
          </button>
        ))}
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Toplam</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{sureMsToMetin(secili.toplamSureMs)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ort./soru</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{sureMsToMetin(secili.ortalamaSureMs)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Öneri/soru</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{sureMsToMetin(secili.oneriSureMsPerSoru)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Kayıt</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {secili.kayitliSoruSayisi}/{secili.toplamSoruSayisi}
          </p>
        </div>
      </div>

      {!compact && secili.enYavasSorular.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-2">
            En çok beklediğin sorular
          </p>
          <div className="flex flex-wrap gap-2">
            {secili.enYavasSorular.map((s) => (
              <span
                key={s.soruId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900"
              >
                S.{s.siraNo} · {sureMsToMetin(s.sureMs)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-gray-700">
            {siralama === 'sure' ? 'Süreye göre sıralı' : 'Tüm sorular'} ({soruListesi.length})
          </p>
          <Link
            href={`/sinavlar/${secili.katilimId}/sonuc`}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            Sınav sonucu <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className={`divide-y divide-gray-50 ${compact ? 'max-h-64 overflow-y-auto' : ''}`}>
          {soruListesi.map((s) => {
            const yavasMi =
              secili.oneriSureMsPerSoru != null &&
              s.sureMs != null &&
              s.sureMs > secili.oneriSureMsPerSoru * 1.5;
            const barGenislik =
              s.sureMs != null && s.sureMs > 0
                ? Math.max(4, Math.round((s.sureMs / maxSureMs) * 100))
                : 0;

            return (
              <div
                key={s.soruId}
                className={`px-4 py-3 ${yavasMi ? 'bg-amber-50/40' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {s.siraNo}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase truncate">{s.ders}</p>
                      <p className="text-xs font-semibold text-gray-800 truncate">{s.konu}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {durumIkon(s.dogru)}
                    <span className={`text-xs font-bold tabular-nums ${yavasMi ? 'text-amber-700' : 'text-gray-700'}`}>
                      {sureMsToMetin(s.sureMs)}
                    </span>
                  </div>
                </div>
                {!compact && barGenislik > 0 && (
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${yavasMi ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${barGenislik}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {compact && (
        <Link
          href="/analiz"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
        >
          Detaylı süre analizi <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
        </Link>
      )}
    </div>
  );
}
