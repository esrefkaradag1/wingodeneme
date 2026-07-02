'use client';

import { useEffect, useRef, useState } from 'react';

/** Tahta adımı başına bir kez çizim (0→1); satır/ses değişiminde sıfırlanmaz */
export function useTahtaCizimAnimasyonu(
  adimIdx: number,
  elemanSayisi: number,
  konusuyor: boolean,
  oynatiliyor: boolean,
  zorunluSureMs?: number
) {
  const [progress, setProgress] = useState(0);
  const tamamlananAdimlar = useRef<Set<number>>(new Set());
  const sonAdimRef = useRef(adimIdx);
  const rafRef = useRef<number | null>(null);
  const baslangicRef = useRef(0);
  const konusuyorRef = useRef(konusuyor);
  konusuyorRef.current = konusuyor;

  useEffect(() => {
    if (sonAdimRef.current === adimIdx) return;
    sonAdimRef.current = adimIdx;
    if (tamamlananAdimlar.current.has(adimIdx)) {
      setProgress(1);
    } else {
      setProgress(0);
    }
  }, [adimIdx]);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!oynatiliyor) return;

    if (tamamlananAdimlar.current.has(adimIdx)) {
      setProgress(1);
      return;
    }

    const sureMs = zorunluSureMs ?? Math.max(3200, Math.min(7000, elemanSayisi * 650));
    baslangicRef.current = performance.now();

    const kare = (now: number) => {
      const gecen = now - baslangicRef.current;
      const hiz = konusuyorRef.current ? 0.95 : 1.15;
      const t = Math.min(1, (gecen / sureMs) * hiz);
      setProgress(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(kare);
      } else {
        tamamlananAdimlar.current.add(adimIdx);
      }
    };

    rafRef.current = requestAnimationFrame(kare);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [adimIdx, elemanSayisi, oynatiliyor, zorunluSureMs]);

  return oynatiliyor ? progress : 1;
}
