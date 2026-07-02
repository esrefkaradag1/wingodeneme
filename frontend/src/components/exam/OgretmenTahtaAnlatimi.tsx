'use client';

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { type HataAciklaVeri, videoAdimlariZenginlestir } from '@/lib/hataAciklaTahta';
import { useOgretmenAnlatimSesi } from '@/hooks/useOgretmenAnlatimSesi';
import { useVideoCozumExport } from '@/hooks/useVideoCozumExport';
import { konusmayiDurdur, metinOku } from '@/lib/ogretmenSesi';
import { canvasHazirBekle } from '@/lib/videoCozumKaydi';

const TahtaVideoSahnesi = dynamic(() => import('./ogretmen-tahta/TahtaVideoSahnesi'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 text-xs font-bold uppercase tracking-widest">
      Video çözüm hazırlanıyor…
    </div>
  ),
});

function YaziliAciklama({ veri }: { veri: HataAciklaVeri }) {
  const tamMetin = [veri.neden, `Ne yapmalı: ${veri.neYapmali}`, `Mini ipucu: ${veri.miniIpucu}`].join('. ');

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 leading-relaxed flex-1">{veri.neden}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            konusmayiDurdur();
            metinOku(tamMetin);
          }}
          className="shrink-0 text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-800 flex items-center gap-1"
        >
          <Volume2 className="w-3 h-3" /> Sesli oku
        </button>
      </div>
      <p className="text-sm font-bold text-gray-700">
        Ne yapmalı: <span className="font-medium">{veri.neYapmali}</span>
      </p>
      <p className="text-sm font-bold text-gray-700">
        Mini ipucu: <span className="font-medium">{veri.miniIpucu}</span>
      </p>
    </div>
  );
}

export default function OgretmenTahtaAnlatimi({
  veri: hamVeri,
  ders,
  konu,
  videoKayitBaslat,
  onVideoKayitBitti,
}: {
  veri: HataAciklaVeri;
  ders?: string;
  konu?: string;
  videoKayitBaslat?: boolean;
  onVideoKayitBitti?: () => void;
}) {
  const veri = useMemo(() => videoAdimlariZenginlestir(hamVeri, ders, konu), [hamVeri, ders, konu]);
  const [sesAcik, setSesAcik] = useState(true);
  const [basladi, setBasladi] = useState(false);
  const [kayitModu, setKayitModu] = useState(false);
  const [kayitSegmentIdx, setKayitSegmentIdx] = useState(0);
  const kapsayiciRef = useRef<HTMLDivElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { videoOlustur, kayitYapiliyor, ilerleme, durum: kayitDurum } = useVideoCozumExport();
  const {
    segmentIdx,
    toplamSegment,
    aktifSegment,
    tahtaDurumu,
    konusuyor,
    oynatiliyor,
    baslat,
    durdur,
    sifirla,
    oncekiSegment,
    sonrakiSegment,
    devamEt,
  } = useOgretmenAnlatimSesi(veri, sesAcik);

  const aktifAdimIdx = kayitModu ? (veri.videoAdimlari?.[kayitSegmentIdx]?.adimIdx ?? kayitSegmentIdx) : tahtaDurumu.adimIdx;
  const formulMetni =
    aktifSegment?.tur === 'video' && aktifSegment.formul
      ? aktifSegment.formul
      : aktifSegment?.metin && /[=+\-×x*/0-9²³]/.test(aktifSegment.metin)
        ? aktifSegment.metin
        : undefined;

  const baslatildiRef = useRef(false);
  useEffect(() => {
    if (basladi && !baslatildiRef.current) {
      baslatildiRef.current = true;
      baslat();
    }
    if (!basladi) baslatildiRef.current = false;
  }, [basladi, baslat]);

  useEffect(() => {
    if (!basladi) return;
    const el = kapsayiciRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [basladi]);

  const videoKaydiBaslat = useCallback(async () => {
    if (kayitYapiliyor) return;
    konusmayiDurdur();
    durdur();
    setBasladi(true);
    setKayitModu(true);
    setKayitSegmentIdx(0);
    await new Promise((r) => setTimeout(r, 600));
    const canvas = await canvasHazirBekle(() => videoCanvasRef.current, 15000);
    if (!canvas) {
      setKayitModu(false);
      return;
    }
    try {
      await videoOlustur({
        veri,
        canvas,
        onSegment: setKayitSegmentIdx,
        dosyaAdi: `wingo-${ders || 'cozum'}`.replace(/\s+/g, '-').toLowerCase(),
      });
    } finally {
      setKayitModu(false);
      onVideoKayitBitti?.();
    }
  }, [kayitYapiliyor, durdur, veri, videoOlustur, ders, onVideoKayitBitti]);

  const videoKayitBaslatildi = useRef(false);
  useEffect(() => {
    if (!videoKayitBaslat || videoKayitBaslatildi.current) return;
    videoKayitBaslatildi.current = true;
    void videoKaydiBaslat().finally(() => {
      videoKayitBaslatildi.current = false;
    });
  }, [videoKayitBaslat, videoKaydiBaslat]);

  useEffect(() => {
    if (!videoKayitBaslat) videoKayitBaslatildi.current = false;
  }, [videoKayitBaslat]);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    return <YaziliAciklama veri={veri} />;
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setBasladi(true);
          }}
          className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 flex items-center gap-2 shadow-md"
        >
          <Play className="w-3.5 h-3.5" /> Video Çözümü Başlat
        </button>
        <button
          type="button"
          disabled={kayitYapiliyor}
          onClick={(e) => {
            e.stopPropagation();
            void videoKaydiBaslat();
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-md"
        >
          <Download className="w-3.5 h-3.5" />
          {kayitYapiliyor ? `Video Oluşturuluyor %${ilerleme}` : 'Video Oluştur'}
        </button>
        {kayitYapiliyor && (
          <span className="text-[11px] font-medium text-indigo-600">{kayitDurum}</span>
        )}
      </div>

      <YaziliAciklama veri={veri} />

      <div
        ref={kapsayiciRef}
        className="mt-5 scroll-mt-24"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-900 shadow-2xl">
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-slate-900/95 to-transparent pointer-events-none">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                {konusuyor ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Türkçe video anlatım
                  </span>
                ) : (
                  <>3D video çözümü</>
                )}
              </p>
              <p className="text-xs font-bold text-white mt-0.5 line-clamp-2">
                {aktifSegment?.metin || veri.ogretmenSozu || 'Tahtada çizimle birlikte inceleyelim.'}
              </p>
              {(ders || konu) && (
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {[ders, konu].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <span className="shrink-0 text-[10px] font-bold text-amber-300 uppercase tracking-widest">
              {segmentIdx + 1}/{toplamSegment}
            </span>
          </div>

          <div
            className={kayitModu ? 'overflow-auto max-h-[80vh]' : 'h-[400px] sm:h-[460px] md:h-[540px]'}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!basladi ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-800 to-slate-900 px-6 text-center">
                <p className="text-sm font-bold text-white max-w-md">
                  Öğretmen hologram sınıfta adım adım Türkçe anlatır. Video Oluştur ile tarayıcıda Three.js sahnesi kaydedilir (ücretsiz MP4/WebM).
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBasladi(true);
                  }}
                  className="pointer-events-auto px-6 py-3 rounded-2xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-500 flex items-center gap-2 shadow-xl shadow-cyan-500/20"
                >
                  <Play className="w-4 h-4" /> Video Çözümü Başlat
                </button>
                <button
                  type="button"
                  disabled={kayitYapiliyor}
                  onClick={(e) => {
                    e.stopPropagation();
                    void videoKaydiBaslat();
                  }}
                  className="pointer-events-auto px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-xl"
                >
                  <Download className="w-4 h-4" />
                  {kayitYapiliyor ? `Oluşturuluyor %${ilerleme}` : 'Video Oluştur'}
                </button>
                </div>
                {kayitYapiliyor && (
                  <p className="text-xs text-cyan-200 font-medium">{kayitDurum}</p>
                )}
              </div>
            ) : (
              <TahtaVideoSahnesi
                veri={veri}
                adimIdx={aktifAdimIdx}
                ders={ders}
                konu={konu}
                konusuyor={konusuyor}
                oynatiliyor={oynatiliyor}
                formul={formulMetni}
                kayitModu={kayitModu}
                kayitSegmentIdx={kayitSegmentIdx}
                onCanvasReady={(c) => { videoCanvasRef.current = c; }}
              />
            )}
          </div>

          {basladi && (
            <div className="border-t border-slate-700/50 bg-slate-900/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (oynatiliyor) durdur();
                    else devamEt();
                  }}
                  className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  {oynatiliyor ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    oncekiSegment();
                  }}
                  disabled={segmentIdx === 0}
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/15 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sonrakiSegment();
                  }}
                  disabled={segmentIdx >= toplamSegment - 1}
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/15 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sifirla();
                    setBasladi(false);
                  }}
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/15"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void videoKaydiBaslat();
                  }}
                  disabled={kayitYapiliyor}
                  className="px-3 py-2 rounded-xl bg-cyan-700 text-white hover:bg-cyan-600 disabled:opacity-40 transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                  title="Video oluştur ve indir"
                >
                  <Download className="w-3.5 h-3.5" />
                  Video Oluştur
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSesAcik((s) => !s);
                  }}
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/15"
                  title={sesAcik ? 'Sesi kapat' : 'Sesi aç'}
                >
                  {sesAcik ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[240px]">
                {aktifSegment?.tur === 'video' && aktifSegment.baslik
                  ? aktifSegment.baslik
                  : `Çizim adımı · ${aktifAdimIdx + 1}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
