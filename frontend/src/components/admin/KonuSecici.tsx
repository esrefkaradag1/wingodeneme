'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X, BookOpen } from 'lucide-react';

export interface KonuSecimi {
  id: string;
  ad: string;
  ders: string;
  uniteAdi?: string | null;
  ogretimTuru?: string;
  yksSegment?: string | null;
}

interface Props {
  konular: KonuSecimi[];
  value?: string;
  onChange: (id: string) => void;
  havuzSayilari?: Record<string, number>;
  placeholder?: string;
  className?: string;
  /** Sadece şu yks kapsamına ait konuları öne çıkar (TYT/AYT) — diğerleri gri */
  oncelikliKapsam?: 'TYT' | 'AYT' | null;
}

function trNorm(s: string): string {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
}

const AYT_SEGS = new Set([
  'AYT_MATEMATIK',
  'AYT_FEN_BILIMLERI',
  'AYT_EDEBIYAT',
  'AYT_TARIH1',
  'AYT_COG1',
  'AYT_TARIH2',
  'AYT_COG2',
  'AYT_FELSEFE_GRUBU',
  'AYT_DIN',
]);

function segmentEtiketi(seg?: string | null): string | null {
  if (!seg) return null;
  if (seg === 'TYT') return 'TYT';
  if (AYT_SEGS.has(seg)) return 'AYT';
  return seg;
}

/** KPSS kademe rozeti — Lisans/Önlisans/Ortaöğretim konuları aynı adla geldiği için zorunlu. */
function kpssKademeEtiketi(tur?: string | null): string | null {
  switch (tur) {
    case 'KPSS_LISANS':
      return 'KPSS LİS';
    case 'KPSS_ONLISANS':
      return 'KPSS ÖL';
    case 'KPSS_ORTAOGRETIM':
      return 'KPSS OÖ';
    default:
      return null;
  }
}

function kpssKademeRozetSinif(tur?: string | null): string {
  switch (tur) {
    case 'KPSS_LISANS':
      return 'bg-teal-100 text-teal-800';
    case 'KPSS_ONLISANS':
      return 'bg-sky-100 text-sky-800';
    case 'KPSS_ORTAOGRETIM':
      return 'bg-cyan-100 text-cyan-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/** Ara sınıf konuları (6/7 ve 9/10/11) ünitesiz gelir; kademeden sınıf etiketi türet. */
function kademeUniteEtiketi(tur?: string): string | null {
  switch (tur) {
    case 'SINIF_6': return '6. Sınıf';
    case 'SINIF_7': return '7. Sınıf';
    case 'SINIF_8': return '8. Sınıf';
    case 'SINIF_9': return '9. Sınıf';
    case 'SINIF_10': return '10. Sınıf';
    case 'SINIF_11': return '11. Sınıf';
    default: return null;
  }
}

export default function KonuSecici({
  konular, value, onChange, havuzSayilari = {}, placeholder = 'Konu seçin', className = '', oncelikliKapsam = null,
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

  const secili = useMemo(() => konular.find((k) => k.id === value) || null, [konular, value]);

  const filtreli = useMemo(() => {
    const q = trNorm(arama).trim();
    if (!q) return konular;
    return konular.filter((k) => {
      const hay = trNorm(`${k.ders} ${k.uniteAdi || ''} ${k.ad}`);
      return q.split(/\s+/).every((parca) => hay.includes(parca));
    });
  }, [konular, arama]);

  // Ders → ünite → konu gruplaması (KPSS kademesi üniteye eklenir; aynı adlar karışmasın)
  const dersGruplari = useMemo(() => {
    const map = new Map<string, Map<string, KonuSecimi[]>>();
    for (const k of filtreli) {
      const dersAd = k.ders || 'Diğer';
      if (!map.has(dersAd)) map.set(dersAd, new Map());
      const uniteMap = map.get(dersAd)!;
      const kpssEtiket = kpssKademeEtiketi(k.ogretimTuru);
      const temelUnite = k.uniteAdi || kademeUniteEtiketi(k.ogretimTuru) || '— Genel —';
      const uniteAd = kpssEtiket ? `${temelUnite} · ${kpssEtiket}` : temelUnite;
      if (!uniteMap.has(uniteAd)) uniteMap.set(uniteAd, []);
      uniteMap.get(uniteAd)!.push(k);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([ders, unMap]) => ({
        ders,
        uniteler: Array.from(unMap.entries())
          .sort(([a], [b]) => a.localeCompare(b, 'tr'))
          .map(([uniteAd, list]) => ({
            uniteAd,
            list: list.sort((a, b) => {
              const ka = kpssKademeEtiketi(a.ogretimTuru) || '';
              const kb = kpssKademeEtiketi(b.ogretimTuru) || '';
              if (ka !== kb) return ka.localeCompare(kb, 'tr');
              return a.ad.localeCompare(b.ad, 'tr');
            }),
          })),
      }));
  }, [filtreli]);

  return (
    <div ref={kokRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="input-field flex items-center justify-between gap-2 text-sm w-full text-left"
        aria-haspopup="listbox"
        aria-expanded={acik}
      >
        <span className={`truncate ${secili ? 'text-gray-800' : 'text-gray-400'}`}>
          {secili ? (
            <>
              <b>{secili.ders}</b>
              {secili.uniteAdi ? ` — ${secili.uniteAdi}` : ''} — {secili.ad}
              {kpssKademeEtiketi(secili.ogretimTuru) ? (
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${kpssKademeRozetSinif(secili.ogretimTuru)}`}>
                  {kpssKademeEtiketi(secili.ogretimTuru)}
                </span>
              ) : null}
              <span className="font-normal text-gray-500">
                {' '}
                ({havuzSayilari[secili.id] ?? 0} soru)
              </span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${acik ? 'rotate-180' : ''}`} />
      </button>

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
              <button
                type="button"
                onClick={() => setArama('')}
                className="p-1 rounded hover:bg-gray-100 text-gray-400"
                aria-label="Aramayı temizle"
              >
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
                        const sayi = havuzSayilari[k.id] ?? 0;
                        const seg = segmentEtiketi(k.yksSegment);
                        const kpssEtiket = kpssKademeEtiketi(k.ogretimTuru);
                        const onCikar = oncelikliKapsam && seg && seg === oncelikliKapsam;
                        const isimDimm = oncelikliKapsam && seg && seg !== oncelikliKapsam;
                        return (
                          <button
                            type="button"
                            key={k.id}
                            onClick={() => { onChange(k.id); setAcik(false); setArama(''); }}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-indigo-50 transition-colors ${
                              k.id === value ? 'bg-indigo-100' : ''
                            } ${isimDimm ? 'opacity-70' : ''}`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {k.id === value && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              <span className="truncate">{k.ad}</span>
                              {seg && (
                                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  onCikar ? 'bg-emerald-100 text-emerald-800' :
                                  seg === 'TYT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                }`}>{seg}</span>
                              )}
                              {kpssEtiket && (
                                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${kpssKademeRozetSinif(k.ogretimTuru)}`}>
                                  {kpssEtiket}
                                </span>
                              )}
                            </span>
                            <span
                              className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded font-semibold tabular-nums ${
                                sayi > 0 ? 'text-emerald-800 bg-emerald-50' : 'text-gray-500 bg-gray-100'
                              }`}
                              title="Onaylı soru sayısı (grup havuzu veya tüm banka)"
                            >
                              {sayi} soru
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

          <div className="px-3 py-2 border-t border-gray-100 text-[11px] text-gray-500 bg-gray-50">
            Toplam <b>{filtreli.length}</b> konu
            {oncelikliKapsam && <> · Önerilen: <b className="text-emerald-700">{oncelikliKapsam}</b></>}
            <span className="block mt-0.5 text-gray-400">
              Sayılar: grup seçiliyse o grubun havuzundaki onaylı sorular; değilse tüm bankadaki onaylı sorular.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
