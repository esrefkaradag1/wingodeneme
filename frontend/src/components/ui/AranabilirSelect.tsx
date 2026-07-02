'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export type AranabilirSecenek = {
  value: string;
  etiket: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  secenekler: AranabilirSecenek[];
  placeholder?: string;
  bosSecenek?: { value: string; etiket: string };
  disabled?: boolean;
  className?: string;
};

export function AranabilirSelect({
  value,
  onChange,
  secenekler,
  placeholder = 'Ara veya seç…',
  bosSecenek,
  disabled,
  className = '',
}: Props) {
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState('');
  const kapsayiciRef = useRef<HTMLDivElement>(null);

  const seciliEtiket = useMemo(() => {
    if (!value) return bosSecenek?.etiket ?? '';
    return secenekler.find((s) => s.value === value)?.etiket ?? value;
  }, [value, secenekler, bosSecenek]);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    const liste = secenekler.filter((s) => !q || s.etiket.toLowerCase().includes(q));
    return liste;
  }, [arama, secenekler]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!kapsayiciRef.current?.contains(e.target as Node)) setAcik(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={kapsayiciRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAcik((v) => !v)}
        className="input-field w-full flex items-center justify-between gap-2 text-left disabled:opacity-60"
      >
        <span className={`truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {seciliEtiket || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${acik ? 'rotate-180' : ''}`} />
      </button>

      {acik && !disabled ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="İsim veya e-posta ara…"
              className="flex-1 text-sm outline-none placeholder:text-gray-400"
              autoFocus
            />
            {arama ? (
              <button type="button" onClick={() => setArama('')} className="p-1 rounded hover:bg-gray-100">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ) : null}
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {bosSecenek ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(bosSecenek.value);
                    setAcik(false);
                    setArama('');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600'}`}
                >
                  {bosSecenek.etiket}
                </button>
              </li>
            ) : null}
            {filtreli.length === 0 ? (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">Sonuç bulunamadı</li>
            ) : (
              filtreli.map((s) => (
                <li key={s.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(s.value);
                      setAcik(false);
                      setArama('');
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 truncate ${
                      value === s.value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-800'
                    }`}
                  >
                    {s.etiket}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
