'use client';

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
}

export function TekSayfaGorumu({ sorular, cevaplar, onCevapSec }: Props) {
  return (
    <div className="h-full overflow-y-auto bg-white p-6">
      <div className="max-w-3xl mx-auto space-y-2">
        {sorular.map((soru) => (
          <SoruKarti
            key={soru.id}
            soru={soru}
            secilen={cevaplar[soru.id] || null}
            onSec={(secilen) => onCevapSec(soru.id, secilen)}
          />
        ))}
      </div>
    </div>
  );
}
