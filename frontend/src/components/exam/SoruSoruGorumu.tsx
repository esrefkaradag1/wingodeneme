'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SoruKarti } from './SoruKarti';

interface Soru {
  id: string;
  siraNo: number;
  metinHtml: string;
  gorselUrl?: string;
  secenekler: Record<string, string>;
  konu: { ad: string; ders: string };
}

interface Props {
  sorular: Soru[];
  cevaplar: Record<string, string | null>;
  onCevapSec: (soruId: string, secilen: string | null) => void;
  aktifIndex: number;
  onIndexDegistir: (index: number) => void;
}

export function SoruSoruGorumu({ sorular, cevaplar, onCevapSec, aktifIndex, onIndexDegistir }: Props) {
  const aktifSoru = sorular[aktifIndex];
  if (!aktifSoru) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Soru gezgin */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
        <button
          onClick={() => onIndexDegistir(Math.max(0, aktifIndex - 1))}
          disabled={aktifIndex === 0}
          className="flex items-center gap-1 text-sm font-medium text-gray-600 disabled:opacity-30 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Önceki
        </button>

        <span className="text-sm text-gray-600 font-medium">
          {aktifIndex + 1} / {sorular.length}
        </span>

        <button
          onClick={() => onIndexDegistir(Math.min(sorular.length - 1, aktifIndex + 1))}
          disabled={aktifIndex === sorular.length - 1}
          className="flex items-center gap-1 text-sm font-medium text-gray-600 disabled:opacity-30 hover:text-indigo-600 transition-colors"
        >
          Sonraki <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Soru içeriği */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <SoruKarti
            soru={aktifSoru}
            secilen={cevaplar[aktifSoru.id] || null}
            onSec={(secilen) => onCevapSec(aktifSoru.id, secilen)}
          />
        </div>
      </div>

      {/* Hızlı navigasyon */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="flex gap-1 flex-wrap justify-center max-h-20 overflow-y-auto">
          {sorular.map((soru, i) => {
            const cevaplanmis = !!cevaplar[soru.id];
            return (
              <button
                key={soru.id}
                onClick={() => onIndexDegistir(i)}
                className={`w-8 h-8 rounded text-xs font-medium transition-all
                  ${i === aktifIndex ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                  ${cevaplanmis ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
