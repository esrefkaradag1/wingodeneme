/**
 * Admin paneli sesli bildirimleri.
 * Tarayıcı autoplay politikası nedeniyle ilk kullanıcı etkileşiminde AudioContext açılır.
 */

const STORAGE_KEY = 'wingo-admin-bildirim-sesi';

let audioCtx: AudioContext | null = null;
let kilidiAcik = false;

function ctxAl(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function adminBildirimSesiAcikMi(): boolean {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v !== '0';
}

export function adminBildirimSesiAyarla(acik: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, acik ? '1' : '0');
  if (acik) void adminBildirimSesiKilidiAc();
}

/** Kullanıcı tıklaması sonrası çağrılmalı — ses çalabilmek için */
export async function adminBildirimSesiKilidiAc(): Promise<void> {
  const ctx = ctxAl();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* sessiz */
    }
  }
  kilidiAcik = ctx.state === 'running';
}

function tonCal(
  ctx: AudioContext,
  frekans: number,
  baslangic: number,
  sure: number,
  tip: OscillatorType = 'sine',
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tip;
  osc.frequency.value = frekans;
  gain.gain.setValueAtTime(0.0001, baslangic);
  gain.gain.exponentialRampToValueAtTime(0.18, baslangic + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, baslangic + sure);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(baslangic);
  osc.stop(baslangic + sure + 0.02);
}

/**
 * Sipariş / onay için kısa çift ton.
 * `tur: 'siparis'` biraz daha belirgin.
 */
export async function adminBildirimSesiCal(tur: 'siparis' | 'onay' = 'onay'): Promise<void> {
  if (!adminBildirimSesiAcikMi()) return;
  await adminBildirimSesiKilidiAc();
  const ctx = ctxAl();
  if (!ctx || ctx.state !== 'running') return;

  const t0 = ctx.currentTime + 0.01;
  if (tur === 'siparis') {
    tonCal(ctx, 880, t0, 0.14);
    tonCal(ctx, 1174.7, t0 + 0.12, 0.18);
    tonCal(ctx, 1318.5, t0 + 0.26, 0.22);
  } else {
    tonCal(ctx, 740, t0, 0.12);
    tonCal(ctx, 988, t0 + 0.14, 0.2);
  }
}

/** Sayaç artışına göre hangi sesin çalacağını seçer */
export function adminBildirimSesiTurSec(artislar: {
  siparis?: boolean;
  havale?: boolean;
  bildirim?: boolean;
}): 'siparis' | 'onay' {
  if (artislar.siparis || artislar.havale || artislar.bildirim) return 'siparis';
  return 'onay';
}
