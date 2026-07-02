import { api } from './api';
import type { AnlatimSegment } from './hataAciklaTahta';

export const KAYIT_GENISLIK = 1280;
export const KAYIT_YUKSEKLIK = 720;

async function ttsIndir(metin: string): Promise<ArrayBuffer> {
  const { data } = await api.post<ArrayBuffer>(
    '/ai/tts',
    { metin },
    { responseType: 'arraybuffer', timeout: 90000 }
  );
  return data;
}

export type SegmentSes = {
  buffer: AudioBuffer;
  sureMs: number;
};

export async function segmentSesleriniHazirla(
  segmentler: AnlatimSegment[],
  onProgress?: (yuzde: number) => void
): Promise<SegmentSes[]> {
  const ctx = new AudioContext();
  const sonuc: SegmentSes[] = [];

  for (let i = 0; i < segmentler.length; i++) {
    const metin = segmentler[i]?.metin?.trim();
    if (!metin) {
      sonuc.push({ buffer: ctx.createBuffer(1, 1, ctx.sampleRate), sureMs: 800 });
      onProgress?.(((i + 1) / segmentler.length) * 40);
      continue;
    }
    try {
      const ab = await ttsIndir(metin);
      const buf = await ctx.decodeAudioData(ab.slice(0));
      sonuc.push({ buffer: buf, sureMs: Math.ceil((buf.duration + 0.45) * 1000) });
    } catch {
      sonuc.push({ buffer: ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), sureMs: 1800 });
    }
    onProgress?.(((i + 1) / segmentler.length) * 40);
  }

  return sonuc;
}

export function sesleriBirlestir(ctx: AudioContext, parcalar: AudioBuffer[], boslukSn = 0.45): AudioBuffer {
  if (!parcalar.length) return ctx.createBuffer(1, 1, ctx.sampleRate);
  const bosluk = Math.floor(boslukSn * ctx.sampleRate);
  const toplam = parcalar.reduce((s, b) => s + b.length, 0) + bosluk * (parcalar.length - 1);
  const cikti = ctx.createBuffer(1, toplam, ctx.sampleRate);
  const kanal = cikti.getChannelData(0);
  let offset = 0;
  parcalar.forEach((buf, i) => {
    kanal.set(buf.getChannelData(0), offset);
    offset += buf.length + (i < parcalar.length - 1 ? bosluk : 0);
  });
  return cikti;
}

function kayitMimeTipi(): string {
  const adaylar = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return adaylar.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
}

export type VideoKayitSecenekleri = {
  canvas: HTMLCanvasElement;
  segmentler: AnlatimSegment[];
  onSegment: (idx: number) => void;
  onProgress?: (yuzde: number, durum: string) => void;
  fps?: number;
};

export async function videoCozumKaydiOlustur(opts: VideoKayitSecenekleri): Promise<Blob> {
  const { canvas, segmentler, onSegment, onProgress, fps = 30 } = opts;

  onProgress?.(5, 'Sesler hazırlanıyor…');
  const segmentSesler = await segmentSesleriniHazirla(segmentler, (p) => onProgress?.(p, 'Sesler hazırlanıyor…'));

  const audioCtx = new AudioContext();
  const birlesikSes = sesleriBirlestir(
    audioCtx,
    segmentSesler.map((s) => s.buffer)
  );

  onProgress?.(45, 'Sahne hazırlanıyor…');
  await new Promise((r) => setTimeout(r, 900));

  const dest = audioCtx.createMediaStreamDestination();
  const kaynak = audioCtx.createBufferSource();
  kaynak.buffer = birlesikSes;
  kaynak.connect(dest);

  const videoStream = canvas.captureStream(fps);
  const birlesikStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = kayitMimeTipi();
  const parcalar: Blob[] = [];

  await new Promise<void>((resolve, reject) => {
    const recorder = new MediaRecorder(birlesikStream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
      audioBitsPerSecond: 192_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) parcalar.push(e.data);
    };
    recorder.onerror = () => reject(recorder.error ?? new Error('Kayıt hatası'));
    recorder.onstop = () => resolve();

    let gecen = 0;
    const toplamSure = segmentSesler.reduce((s, seg) => s + seg.sureMs, 0);

    segmentSesler.forEach((seg, idx) => {
      setTimeout(() => {
        onSegment(idx);
        onProgress?.(45 + (gecen / Math.max(1, toplamSure)) * 50, `Adım ${idx + 1}/${segmentler.length}`);
      }, gecen);
      gecen += seg.sureMs;
    });

    onProgress?.(48, 'Video kaydı başlıyor…');
    recorder.start(100);
    kaynak.start(0);

    kaynak.onended = () => {
      onProgress?.(98, 'Video tamamlanıyor…');
      setTimeout(() => recorder.stop(), 800);
    };
  });

  await audioCtx.close();
  onProgress?.(100, 'Hazır');

  return new Blob(parcalar, { type: mimeType });
}

export function videoIndir(blob: Blob, dosyaAdi = 'wingo-cozum-video') {
  const uzanti = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dosyaAdi}.${uzanti}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function canvasHazirBekle(
  getCanvas: () => HTMLCanvasElement | null,
  maxMs = 15000
): Promise<HTMLCanvasElement | null> {
  const bas = Date.now();
  while (Date.now() - bas < maxMs) {
    const c = getCanvas();
    if (c && c.width >= KAYIT_GENISLIK * 0.5 && c.height >= KAYIT_YUKSEKLIK * 0.5) return c;
    await new Promise((r) => setTimeout(r, 150));
  }
  return getCanvas();
}
