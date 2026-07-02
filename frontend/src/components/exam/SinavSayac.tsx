'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface SinavSayacProps {
  sureDakika: number;
  baslangicZamani: string;
  onSureDoldu: () => void;
  onKalanSaniye?: (saniye: number) => void;
}

export function SinavSayac({ sureDakika, baslangicZamani, onSureDoldu, onKalanSaniye }: SinavSayacProps) {
  const [kalanSaniye, setKalanSaniye] = useState<number>(() => {
    const baslangic = new Date(baslangicZamani).getTime();
    const toplam = sureDakika * 60;
    const gecen = Math.floor((Date.now() - baslangic) / 1000);
    return Math.max(0, toplam - gecen);
  });

  const sureDolduRef = useRef(false);

  useEffect(() => {
    onKalanSaniye?.(kalanSaniye);
  }, [kalanSaniye, onKalanSaniye]);

  useEffect(() => {
    if (kalanSaniye === 0) {
      if (!sureDolduRef.current) {
        sureDolduRef.current = true;
        onSureDoldu();
      }
      return;
    }

    const id = setTimeout(() => setKalanSaniye((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [kalanSaniye, onSureDoldu]);

  const dakika = Math.floor(kalanSaniye / 60);
  const saniye = kalanSaniye % 60;

  const uyariMi = kalanSaniye <= 10 * 60;
  const tehlikelMi = kalanSaniye <= 5 * 60;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm font-bold border shadow-sm tabular-nums
      ${
        tehlikelMi
          ? 'bg-red-50 border-red-200 text-red-700 shadow-red-500/10'
          : uyariMi
            ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-amber-500/10'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-900/5'
      }`}
      title="Kalan süre"
    >
      <Clock className={`w-4 h-4 shrink-0 ${tehlikelMi ? 'text-red-600' : uyariMi ? 'text-amber-700' : 'text-slate-500'}`} />
      <span className={tehlikelMi ? 'animate-pulse' : ''}>
        {String(dakika).padStart(2, '0')}:{String(saniye).padStart(2, '0')}
      </span>
    </div>
  );
}
