'use client';

import { CreditCard, Landmark } from 'lucide-react';

export type OdemeYontemi = 'KREDI_KARTI' | 'HAVALE';

type Props = {
  deger: OdemeYontemi;
  onChange: (v: OdemeYontemi) => void;
  className?: string;
  koyu?: boolean;
};

export function OdemeYontemiSecici({ deger, onChange, className = '', koyu }: Props) {
  const secenekler: {
    id: OdemeYontemi;
    baslik: string;
    alt: string;
    ikon: typeof CreditCard;
  }[] = [
    {
      id: 'KREDI_KARTI',
      baslik: 'Kredi / Banka Kartı',
      alt: 'iyzico ile anında ödeme',
      ikon: CreditCard,
    },
    {
      id: 'HAVALE',
      baslik: 'Havale / EFT',
      alt: 'Banka transferi + ödeme bildirimi',
      ikon: Landmark,
    },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <p
        className={`text-[11px] font-bold uppercase tracking-wider ${
          koyu ? 'text-indigo-100/70' : 'text-gray-500'
        }`}
      >
        Ödeme yöntemi
      </p>
      <div className="grid grid-cols-1 gap-2">
        {secenekler.map((s) => {
          const aktif = deger === s.id;
          const Ikon = s.ikon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                koyu
                  ? aktif
                    ? 'border-indigo-300 bg-white/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  : aktif
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-950 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  koyu
                    ? aktif
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-slate-200'
                    : aktif
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Ikon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{s.baslik}</span>
                <span
                  className={`block text-[11px] mt-0.5 ${
                    koyu ? 'text-slate-300' : 'text-gray-500'
                  }`}
                >
                  {s.alt}
                </span>
              </span>
              <span
                className={`ml-auto mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                  aktif
                    ? koyu
                      ? 'border-white bg-white'
                      : 'border-indigo-600 bg-indigo-600'
                    : koyu
                      ? 'border-white/30'
                      : 'border-gray-300'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
