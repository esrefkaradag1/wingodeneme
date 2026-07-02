'use client';

import { useCallback, useState } from 'react';
import { anlatimSegmentleriOlustur, type HataAciklaVeri } from '@/lib/hataAciklaTahta';
import { videoCozumKaydiOlustur, videoIndir } from '@/lib/videoCozumKaydi';

export function useVideoCozumExport() {
  const [kayitYapiliyor, setKayitYapiliyor] = useState(false);
  const [ilerleme, setIlerleme] = useState(0);
  const [durum, setDurum] = useState('');

  const videoOlustur = useCallback(
    async (opts: {
      veri: HataAciklaVeri;
      canvas: HTMLCanvasElement;
      onSegment: (idx: number) => void;
      dosyaAdi?: string;
    }) => {
      if (kayitYapiliyor) return;
      setKayitYapiliyor(true);
      setIlerleme(0);
      setDurum('Hazırlanıyor…');

      try {
        const segmentler = anlatimSegmentleriOlustur(opts.veri);
        const blob = await videoCozumKaydiOlustur({
          canvas: opts.canvas,
          segmentler,
          onSegment: opts.onSegment,
          onProgress: (p, d) => {
            setIlerleme(Math.round(p));
            setDurum(d);
          },
        });
        videoIndir(blob, opts.dosyaAdi || 'wingo-cozum-video');
        setDurum('Video indirildi');
      } catch (e) {
        setDurum(e instanceof Error ? e.message : 'Video oluşturulamadı');
        throw e;
      } finally {
        setKayitYapiliyor(false);
      }
    },
    [kayitYapiliyor]
  );

  return { videoOlustur, kayitYapiliyor, ilerleme, durum };
}
