'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Sınav sırasında soru bazlı geçirilen süreyi takip eder (ms cinsinden biriktirir). */
export function useSoruSureTakip(options: {
  aktifSoruId: string | null;
  devreDisi?: boolean;
  /** Soru başına üst sınır (ms); aşılırsa kırpılır */
  maxSoruSureMs?: number;
}) {
  const accumulatorRef = useRef<Record<string, number>>({});
  const aktifIdRef = useRef<string | null>(null);
  const baslangicRef = useRef<number>(Date.now());
  const duraklatildiRef = useRef(false);
  const [soruSureMs, setSoruSureMs] = useState<Record<string, number>>({});
  const [aktifAnlikSaniye, setAktifAnlikSaniye] = useState(0);

  const maxMs = options.maxSoruSureMs ?? 20 * 60 * 1000;

  const flush = useCallback(
    (soruId: string | null) => {
      if (!soruId || options.devreDisi || duraklatildiRef.current) return;
      const elapsed = Date.now() - baslangicRef.current;
      if (elapsed <= 0) return;
      const mevcut = accumulatorRef.current[soruId] || 0;
      accumulatorRef.current[soruId] = Math.min(maxMs, mevcut + elapsed);
      baslangicRef.current = Date.now();
      setSoruSureMs({ ...accumulatorRef.current });
    },
    [maxMs, options.devreDisi]
  );

  useEffect(() => {
    if (options.devreDisi) return;

    const duraklat = () => {
      if (duraklatildiRef.current) return;
      duraklatildiRef.current = true;
      flush(aktifIdRef.current);
    };

    const devam = () => {
      if (!duraklatildiRef.current) return;
      duraklatildiRef.current = false;
      baslangicRef.current = Date.now();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') duraklat();
      else devam();
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flush, options.devreDisi]);

  useEffect(() => {
    if (options.devreDisi) return;
    const nextId = options.aktifSoruId;
    if (aktifIdRef.current !== nextId) {
      flush(aktifIdRef.current);
      aktifIdRef.current = nextId;
      baslangicRef.current = Date.now();
      setAktifAnlikSaniye(0);
    }
  }, [options.aktifSoruId, options.devreDisi, flush]);

  useEffect(() => {
    if (options.devreDisi || !options.aktifSoruId || duraklatildiRef.current) {
      setAktifAnlikSaniye(0);
      return;
    }
    const tick = setInterval(() => {
      const acc = accumulatorRef.current[options.aktifSoruId!] || 0;
      const current = Date.now() - baslangicRef.current;
      setAktifAnlikSaniye(Math.floor((Math.min(maxMs, acc + current)) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [options.aktifSoruId, options.devreDisi, maxMs, soruSureMs]);

  const soruAktiflestir = useCallback(
    (soruId: string) => {
      if (options.devreDisi || aktifIdRef.current === soruId) return;
      flush(aktifIdRef.current);
      aktifIdRef.current = soruId;
      baslangicRef.current = Date.now();
    },
    [flush, options.devreDisi]
  );

  const getSureMsMap = useCallback(() => {
    flush(aktifIdRef.current);
    const out: Record<string, number> = {};
    for (const [id, ms] of Object.entries(accumulatorRef.current)) {
      out[id] = Math.max(0, Math.min(maxMs, Math.round(ms)));
    }
    return out;
  }, [flush, maxMs]);

  const soruSureSaniye = useCallback(
    (soruId: string) => Math.floor((soruSureMs[soruId] || 0) / 1000),
    [soruSureMs]
  );

  return {
    aktifAnlikSaniye,
    soruSureSaniye,
    getSureMsMap,
    soruAktiflestir,
  };
}
