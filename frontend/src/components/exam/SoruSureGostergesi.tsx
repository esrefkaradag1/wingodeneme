'use client';

import { Timer, Gauge } from 'lucide-react';
import { saniyeToMetin } from '@/lib/sureFormat';

interface SoruSureGostergesiProps {
  buSoruSaniye: number;
  oneriSaniye?: number | null;
  soruNo?: number;
}

export function SoruSureGostergesi({ buSoruSaniye, oneriSaniye, soruNo }: SoruSureGostergesiProps) {
  const yavasMi = oneriSaniye != null && oneriSaniye > 0 && buSoruSaniye > oneriSaniye * 1.5;

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${
        yavasMi
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5 shrink-0" />
        {soruNo != null && <span className="text-slate-400">S.{soruNo}</span>}
        Bu soru: {saniyeToMetin(buSoruSaniye)}
      </span>
      {oneriSaniye != null && oneriSaniye > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
          <Gauge className="w-3 h-3" />
          Öneri ~{saniyeToMetin(oneriSaniye)}/soru
        </span>
      )}
    </div>
  );
}
