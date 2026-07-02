'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X, BookOpen } from 'lucide-react';
import type { KonuSecimi } from './KonuSecici';

interface Props {
  konular: KonuSecimi[];
  value: string[];
  onChange: (ids: string[]) => void;
  havuzSayilari?: Record<string, number>;
  placeholder?: string;
  className?: string;
  oncelikliKapsam?: 'TYT' | 'AYT' | null;
}

function trNorm(s: string): string {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
}

const AYT_SEGS = new Set([
  'AYT_MATEMATIK', 'AYT_FEN_BILIMLERI', 'AYT_EDEBIYAT', 'AYT_TARIH1', 'AYT_COG1',
  'AYT_TARIH2', 'AYT_COG2', 'AYT_FELSEFE_GRUBU', 'AYT_DIN',
]);

function segmentEtiketi(seg?: string | null): string | null {
  if (!seg) return null;
  if (seg === 'TYT') return 'TYT';
  if (AYT_SEGS.has(seg)) return 'AYT';
  return seg;
}

export default function KonuCokluSecici({
  konular,
  value,
  onChange,
  havuzSayilari = {},
  placeholder = 'Konu seçin (birden fazla)',
  className = '',
  oncelikliKapsam = null,
}: Props) {
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState('');
  const kokRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!acik) return;
    function onClick(e: MouseEvent) {
      if (kokRef.current && !kokRef.current.contains(e.target as Node)) setAcik(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAcik(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [acik]);

  const seciliKonular = useMemo(
    () => value.map((id) => konular.find((k) => k.id === id)).filter(Boolean) as KonuSecimi[],
    [konular, value]
  );

  const filtreli = useMemo(() => {
    const q = trNorm(arama).trim();
    if (!q) return konular;
    return konular.filter((k) => {
      const hay = trNorm(`${k.ders} ${k.uniteAdi || ''} ${k.ad}`);
      return q.split(/\s+/).every((parca) => hay.includes(parca));
    });
  }, [konular, arama]);

  const dersGruplari = useMemo(() => {
    const map = new Map<string, Map<string, KonuSecimi[]>>();
    for (const k of filtreli) {
      const dersAd = k.ders || 'Diğer';
      if (!map.has(dersAd)) map.set(dersAd, new Map());
      const uniteMap = map.get(dersAd)!;
      const uniteAd = k.uniteAdi || '— Genel —';
      if (!uniteMap.has(uniteAd)) uniteMap.set(uniteAd, []);
      uniteMap.get(uniteAd)!.push(k);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([ders, unMap]) => ({
        ders,
        uniteler: Array.from(unMap.entries())
          .sort(([a], [b]) => a.localeCompare(b, 'tr'))
          .map(([uniteAd, list]) => ({ uniteAd, list: list.sort((a, b) => a.ad.localeCompare(b.ad, 'tr')) })),
      }));
  }, [filtreli]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const kaldir = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((x) => x !== id));
  };

  return (
    <div ref={kokRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="input-field flex items-center justify-between gap-2 text-sm w-full text-left min-h-[42px]"
        aria-haspopup="listbox"
        aria-expanded={acik}
      >
        <span className="flex-1 min-w-0">
          {seciliKonular.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {seciliKonular.map((k, i) => (
                <span
                  key={k.id}
                  className={`inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-lg text-xs font-semibold ${
                    i === 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-violet-50 text-violet-800'
                  }`}
                >
                  <span className="truncate">
                    {i === 0 && <span className="opacity-70 mr-0.5">Ana:</span>}
                    {k.ad}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => kaldir(k.id, e)}
                    onKeyDown={(e) => e.key === 'Enter' && kaldir(k.id, e as unknown as React.MouseEvent)}
                    className="p-0.5 rounded hover:bg-white/60"
                    aria-label={`${k.ad} kaldır`}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </span>
              ))}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${acik ? 'rotate-180' : ''}`} />
      </button>

      {seciliKonular.length > 1 && (
        <p className="text-[11px] text-indigo-600 mt-1">
          İlk seçilen konu birincil (AI üretimi); tüm seçilen konularda soru bankasında görünür.
        </p>
      )}

      {acik && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ders, ünite veya konu ara…"
              className="flex-1 text-sm outline-none placeholder-gray-400 bg-transparent"
              autoComplete="off"
            />
            {arama && (
              <button type="button" onClick={() => setArama('')} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {dersGruplari.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400 flex flex-col items-center gap-1">
                <BookOpen className="w-5 h-5" />
                Eşleşen konu yok
              </div>
            ) : (
              dersGruplari.map(({ ders, uniteler }) => (
                <div key={ders} className="py-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 sticky top-0 uppercase tracking-wider">
                    {ders}
                  </div>
                  {uniteler.map(({ uniteAd, list }) => (
                    <div key={uniteAd}>
                      {uniteAd !== '— Genel —' && (
                        <div className="px-3 py-1 text-[11px] font-medium text-gray-500 bg-gray-50">{uniteAd}</div>
                      )}
                      {list.map((k) => {
                        const secili = value.includes(k.id);
                        const ana = value[0] === k.id;
                        const sayi = havuzSayilari[k.id] ?? 0;
                        const seg = segmentEtiketi(k.yksSegment);
                        return (
                          <button
                            type="button"
                            key={k.id}
                            onClick={() => toggle(k.id)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-indigo-50 transition-colors ${
                              secili ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  secili ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
                                }`}
                              >
                                {secili && <Check className="w-3 h-3 text-white" />}
                              </span>
                              <span className="truncate">{k.ad}</span>
                              {ana && secili && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1 rounded">Ana</span>
                              )}
                              {seg && (
                                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                  {seg}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded font-semibold tabular-nums text-gray-500 bg-gray-100">
                              {sayi}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2 bg-gray-50">
            <span className="text-[11px] text-gray-500">
              <b>{seciliKonular.length}</b> konu seçili
            </span>
            {seciliKonular.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-bold text-red-600 hover:text-red-800"
              >
                Temizle
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
