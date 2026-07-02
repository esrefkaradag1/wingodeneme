import { api } from './api';

let aktifAudio: HTMLAudioElement | null = null;
let aktifUrl: string | null = null;
let neuralKullan = true;

function sesTemizle(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (aktifAudio) {
    aktifAudio.pause();
    aktifAudio.src = '';
    aktifAudio = null;
  }
  if (aktifUrl) {
    URL.revokeObjectURL(aktifUrl);
    aktifUrl = null;
  }
}

/** Web Speech yedek — en iyi Türkçe sesi seç */
export function turkceSesBul(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const sesler = window.speechSynthesis.getVoices();
  const trSesler = sesler.filter(
    (s) => s.lang === 'tr-TR' || s.lang.startsWith('tr') || /turk|türk|yelda|emel|ahmet/i.test(s.name)
  );

  const skor = (s: SpeechSynthesisVoice) => {
    let p = 0;
    if (/neural|premium|enhanced|natural|google/i.test(s.name)) p += 40;
    if (/yelda|emel|ahmet|filiz/i.test(s.name)) p += 30;
    if (s.lang === 'tr-TR') p += 20;
    if (!s.localService) p += 5;
    if (s.default) p += 3;
    return p;
  };

  trSesler.sort((a, b) => skor(b) - skor(a));
  return trSesler[0] || sesler.find((s) => s.lang.startsWith('tr')) || null;
}

export function seslerHazirOlunca(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {};
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) {
    cb();
    return () => {};
  }
  const handler = () => {
    cb();
    synth.removeEventListener('voiceschanged', handler);
  };
  synth.addEventListener('voiceschanged', handler);
  return () => synth.removeEventListener('voiceschanged', handler);
}

export function konusmayiDurdur(): void {
  sesTemizle();
}

type OkumaOpts = {
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onStart?: () => void;
  onBoundary?: () => void;
};

async function metinOkuNeural(metin: string, opts?: OkumaOpts): Promise<boolean> {
  if (!neuralKullan) return false;

  const { data } = await api.post<ArrayBuffer>(
    '/ai/tts',
    { metin },
    { responseType: 'arraybuffer', timeout: 45000 }
  );

  const blob = new Blob([data], { type: 'audio/mpeg' });
  aktifUrl = URL.createObjectURL(blob);
  aktifAudio = new Audio(aktifUrl);

  return new Promise((resolve) => {
    if (!aktifAudio) {
      resolve(false);
      return;
    }
    const audio = aktifAudio;

    audio.onplay = () => opts?.onStart?.();
    audio.onended = () => {
      sesTemizle();
      opts?.onEnd?.();
      resolve(true);
    };
    audio.onerror = () => {
      sesTemizle();
      resolve(false);
    };

    void audio.play().catch(() => resolve(false));
  });
}

function metinOkuWebSpeech(metin: string, opts?: OkumaOpts): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis || !metin.trim()) {
    opts?.onEnd?.();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(metin);
  utterance.lang = 'tr-TR';
  utterance.rate = opts?.rate ?? 0.88;
  utterance.pitch = opts?.pitch ?? 0.98;
  utterance.volume = 1;

  const ses = turkceSesBul();
  if (ses) utterance.voice = ses;

  utterance.onstart = () => opts?.onStart?.();
  utterance.onend = () => opts?.onEnd?.();
  utterance.onerror = () => opts?.onEnd?.();
  utterance.onboundary = () => opts?.onBoundary?.();

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/** Doğal ses (Edge Neural) + tarayıcı yedek */
export function metinOku(metin: string, opts?: OkumaOpts): SpeechSynthesisUtterance | null {
  if (!metin.trim()) {
    opts?.onEnd?.();
    return null;
  }

  sesTemizle();

  void (async () => {
    try {
      const ok = await metinOkuNeural(metin, opts);
      if (ok) return;
      neuralKullan = false;
      metinOkuWebSpeech(metin, opts);
    } catch {
      neuralKullan = false;
      metinOkuWebSpeech(metin, opts);
    }
  })();

  return null;
}

/** Sesli okuma modu: neural | web */
export function sesModuGetir(): 'neural' | 'web' {
  return neuralKullan ? 'neural' : 'web';
}
