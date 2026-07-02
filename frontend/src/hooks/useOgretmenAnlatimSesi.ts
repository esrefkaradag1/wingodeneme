'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  anlatimSegmentleriOlustur,
  segmentTahtaDurumu,
  type AnlatimSegment,
  type HataAciklaVeri,
} from '@/lib/hataAciklaTahta';
import { konusmayiDurdur, metinOku, seslerHazirOlunca } from '@/lib/ogretmenSesi';

export function useOgretmenAnlatimSesi(veri: HataAciklaVeri, sesAcik: boolean) {
  const segmentler = useRef(anlatimSegmentleriOlustur(veri));
  const [segmentIdx, setSegmentIdx] = useState(0);
  const [konusuyor, setKonusuyor] = useState(false);
  const [oynatiliyor, setOynatiliyor] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [agizAcikligi, setAgizAcikligi] = useState(0);
  const agizTimer = useRef<number | null>(null);

  const aktifSegment: AnlatimSegment | null = segmentler.current[segmentIdx] ?? null;
  const tahtaDurumu = aktifSegment
    ? segmentTahtaDurumu(aktifSegment)
    : { adimIdx: 0, gorunenSatir: 0 };

  const agizAnimBaslat = useCallback(() => {
    if (agizTimer.current) window.clearInterval(agizTimer.current);
    agizTimer.current = window.setInterval(() => {
      setAgizAcikligi((v) => (v > 0.5 ? 0.15 : 0.75));
    }, 120);
  }, []);

  const agizAnimDurdur = useCallback(() => {
    if (agizTimer.current) {
      window.clearInterval(agizTimer.current);
      agizTimer.current = null;
    }
    setAgizAcikligi(0);
  }, []);

  const segmentCal = useCallback(
    (idx: number) => {
      const seg = segmentler.current[idx];
      if (!seg) {
        setOynatiliyor(false);
        setKonusuyor(false);
        agizAnimDurdur();
        setBitti(true);
        return;
      }

      setBitti(false);

      setSegmentIdx(idx);

      if (!sesAcik) {
        const sure = seg.tur === 'video' ? 2800 : seg.tur === 'giris' ? 1800 : seg.tur === 'baslik' ? 1400 : 1600;
        window.setTimeout(() => segmentCal(idx + 1), sure);
        return;
      }

      setKonusuyor(true);
      agizAnimBaslat();
      metinOku(seg.metin, {
        onEnd: () => {
          setKonusuyor(false);
          agizAnimDurdur();
          window.setTimeout(() => segmentCal(idx + 1), 350);
        },
      });
    },
    [sesAcik, agizAnimBaslat, agizAnimDurdur]
  );

  const baslat = useCallback(() => {
    konusmayiDurdur();
    setBitti(false);
    setSegmentIdx(0);
    setOynatiliyor(true);
    segmentCal(0);
  }, [segmentCal]);

  const durdur = useCallback(() => {
    konusmayiDurdur();
    setOynatiliyor(false);
    setKonusuyor(false);
    agizAnimDurdur();
  }, [agizAnimDurdur]);

  const sifirla = useCallback(() => {
    durdur();
    setSegmentIdx(0);
    setBitti(false);
  }, [durdur]);

  const oncekiSegment = useCallback(() => {
    durdur();
    setSegmentIdx((i) => Math.max(0, i - 1));
  }, [durdur]);

  const sonrakiSegment = useCallback(() => {
    durdur();
    setSegmentIdx((i) => Math.min(segmentler.current.length - 1, i + 1));
  }, [durdur]);

  useEffect(() => {
    segmentler.current = anlatimSegmentleriOlustur(veri);
    sifirla();
  }, [veri, sifirla]);

  useEffect(() => {
    return seslerHazirOlunca(() => {});
  }, []);

  useEffect(() => {
    return () => {
      konusmayiDurdur();
      agizAnimDurdur();
    };
  }, [agizAnimDurdur]);

  return {
    segmentIdx,
    toplamSegment: segmentler.current.length,
    aktifSegment,
    tahtaDurumu,
    konusuyor,
    oynatiliyor,
    agizAcikligi,
    bitti,
    baslat,
    durdur,
    sifirla,
    oncekiSegment,
    sonrakiSegment,
    devamEt: () => {
      if (!oynatiliyor && !bitti) {
        setOynatiliyor(true);
        segmentCal(segmentIdx);
      }
    },
  };
}
