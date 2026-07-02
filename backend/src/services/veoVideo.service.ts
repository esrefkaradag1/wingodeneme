import axios from 'axios';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getOpenRouterApiKey } from '../config/openrouter';
import { logger } from '../utils/logger';
import { openrouterHttpHeaders } from '../utils/openrouterHeaders';
import { s3DosyaYukle } from '../utils/s3';
import { s3AnahtarlariGecerli } from '../utils/storageYapilandirma';
import type { HataAciklaSonuc } from '../services/hataAcikla.service';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const VEO_MODEL_DEFAULT = 'google/veo-3.1-fast';
const VEO_SURE = Math.min(8, Math.max(4, Number(process.env.VEO_DURATION) || 8));

type OpenRouterVideoDurum =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

type OpenRouterVideoJob = {
  id: string;
  polling_url?: string;
  status: OpenRouterVideoDurum;
  error?: string;
  unsigned_urls?: string[];
};

type VeoIs = {
  openRouterJobId: string;
  prompt: string;
  olusturma: number;
  durum: 'bekliyor' | 'hazir' | 'hata';
  videoUrl?: string;
  videoBuffer?: Buffer;
  hata?: string;
};

const isler = new Map<string, VeoIs>();

const LEGACY_VEO_MODEL_MAP: Record<string, string> = {
  'veo-3.1-fast-generate-preview': 'google/veo-3.1-fast',
  'veo-3.1-generate-preview': 'google/veo-3.1',
  'veo-3.1-lite': 'google/veo-3.1-lite',
};

export function veoModelSlug(): string {
  const raw = process.env.VEO_MODEL?.trim();
  if (!raw) return VEO_MODEL_DEFAULT;
  if (raw.startsWith('google/')) return raw;
  return LEGACY_VEO_MODEL_MAP[raw] || raw;
}

function temizleEskiIsler() {
  const sinir = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, is] of isler) {
    if (is.olusturma < sinir) isler.delete(id);
  }
}

function openRouterAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    'Content-Type': 'application/json',
    ...openrouterHttpHeaders(),
  };
}

function openRouterHataMesaji(data: unknown, varsayilan: string): string {
  if (data && typeof data === 'object') {
    const err = (data as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err;
    if (err && typeof err === 'object') {
      const msg = (err as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
  }
  return varsayilan;
}

/** Ücretli OpenRouter Veo — varsayılan kapalı; Three.js tarayıcı kaydı kullanılır. */
export function veoAktifMi(): boolean {
  return process.env.VEO_AKTIF === 'true' && Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function veoPromptOlustur(girdi: {
  ders: string;
  konu: string;
  soruOzet: string;
  aciklama: Pick<HataAciklaSonuc, 'ogretmenSozu' | 'neden' | 'neYapmali' | 'videoAdimlari'>;
}): string {
  const adimlar = (girdi.aciklama.videoAdimlari || [])
    .slice(0, 6)
    .map((a, i) => `Step ${i + 1}: ${a.baslik}. ${a.anlatim}${a.formul ? ` Formula: ${a.formul}` : ''}`)
    .join('\n');

  return `Cinematic ultra-realistic futuristic Turkish classroom education video, 16:9, photorealistic quality like a premium AI education production.

ENVIRONMENT: Bright white minimalist sci-fi classroom with cyan and blue LED accent lighting, large windows, sleek student desks, digital chalkboard on back wall covered with handwritten geometry formulas.

CENTERPIECE: A glowing hexagonal holographic platform on the floor projects a vivid 3D blue-cyan geometry diagram floating in mid-air. The hologram is semi-transparent with luminous edges.

LESSON CONTENT (${girdi.ders} — ${girdi.konu}):
${girdi.soruOzet.slice(0, 400)}

STEP-BY-STEP HOLOGRAM ANIMATION (show progressively):
${adimlar || girdi.aciklama.neYapmali}

STYLE: Smooth slow camera orbit around the hologram. Labels and formulas appear as floating holographic UI panels in Turkish. Professional educational atmosphere. Turkish teacher voiceover narrating the solution calmly in Turkish language.

Teacher opening line (Turkish): "${(girdi.aciklama.ogretmenSozu || girdi.aciklama.neden).slice(0, 180)}"

No subtitles burned in. High production value, soft depth of field, clean composition.`.trim();
}

async function videoyuKaydet(jobId: string, buffer: Buffer): Promise<string> {
  if (s3AnahtarlariGecerli()) {
    try {
      return await s3DosyaYukle(buffer, `${jobId}.mp4`, 'video/mp4', 'veo-cozum-videolari');
    } catch (e) {
      logger.warn('Veo video S3 yükleme başarısız, yerel yedek', e);
    }
  }

  const klasor = path.resolve(process.cwd(), 'uploads', 'veo-videolari');
  fs.mkdirSync(klasor, { recursive: true });
  const dosya = path.join(klasor, `${jobId}.mp4`);
  fs.writeFileSync(dosya, buffer);
  return `/api/v1/ai/veo-video/${jobId}/indir`;
}

async function openRouterVideoBaslat(prompt: string): Promise<OpenRouterVideoJob> {
  const model = veoModelSlug();
  const yanit = await axios.post<OpenRouterVideoJob>(
    `${OPENROUTER_BASE}/videos`,
    {
      model,
      prompt,
      aspect_ratio: '16:9',
      duration: VEO_SURE,
      resolution: '720p',
      generate_audio: true,
    },
    {
      headers: openRouterAuthHeaders(),
      timeout: 120_000,
      validateStatus: () => true,
    },
  );

  if (yanit.status >= 400 || !yanit.data?.id) {
    throw new Error(openRouterHataMesaji(yanit.data, `OpenRouter video isteği başarısız (${yanit.status})`));
  }

  return yanit.data;
}

async function openRouterVideoDurumSorgula(jobId: string): Promise<OpenRouterVideoJob> {
  const yanit = await axios.get<OpenRouterVideoJob>(
    `${OPENROUTER_BASE}/videos/${jobId}`,
    {
      headers: openRouterAuthHeaders(),
      timeout: 60_000,
      validateStatus: () => true,
    },
  );

  if (yanit.status >= 400 || !yanit.data?.id) {
    throw new Error(openRouterHataMesaji(yanit.data, `OpenRouter durum sorgusu başarısız (${yanit.status})`));
  }

  return yanit.data;
}

async function openRouterVideoIndir(job: OpenRouterVideoJob): Promise<Buffer> {
  const apiKey = getOpenRouterApiKey();
  const unsignedUrl = job.unsigned_urls?.[0];
  const downloadUrl = unsignedUrl ?? `${OPENROUTER_BASE}/videos/${job.id}/content?index=0`;
  const openRouterIstegi = downloadUrl.includes('openrouter.ai/api/');

  const yanit = await axios.get<ArrayBuffer>(
    downloadUrl,
    {
      headers: openRouterIstegi
        ? { Authorization: `Bearer ${apiKey}`, ...openrouterHttpHeaders() }
        : undefined,
      responseType: 'arraybuffer',
      timeout: 180_000,
      validateStatus: () => true,
    },
  );

  if (yanit.status >= 400) {
    throw new Error(`Video indirilemedi (${yanit.status})`);
  }

  return Buffer.from(yanit.data);
}

export async function veoVideoBaslat(prompt: string): Promise<{ islemId: string; model: string; tahminiSureSn: number }> {
  temizleEskiIsler();
  const model = veoModelSlug();
  const job = await openRouterVideoBaslat(prompt);

  const islemId = randomUUID();
  isler.set(islemId, {
    openRouterJobId: job.id,
    prompt,
    olusturma: Date.now(),
    durum: 'bekliyor',
  });

  logger.info(`OpenRouter Veo video başlatıldı: ${islemId} job=${job.id} model=${model}`);

  return { islemId, model, tahminiSureSn: 90 };
}

export async function veoVideoDurum(islemId: string): Promise<{
  durum: 'bekliyor' | 'hazir' | 'hata';
  videoUrl?: string;
  mesaj?: string;
  model: string;
}> {
  const model = veoModelSlug();
  const is = isler.get(islemId);
  if (!is) {
    return { durum: 'hata', mesaj: 'İşlem bulunamadı veya süresi doldu', model };
  }

  if (is.durum === 'hazir' && is.videoUrl) {
    return { durum: 'hazir', videoUrl: is.videoUrl, model };
  }
  if (is.durum === 'hata') {
    return { durum: 'hata', mesaj: is.hata || 'Video oluşturulamadı', model };
  }

  try {
    const job = await openRouterVideoDurumSorgula(is.openRouterJobId);

    if (job.status === 'pending' || job.status === 'in_progress') {
      return { durum: 'bekliyor', mesaj: 'OpenRouter Veo video üretiyor…', model };
    }

    if (job.status === 'failed' || job.status === 'cancelled' || job.status === 'expired') {
      is.durum = 'hata';
      is.hata = job.error || `Video üretimi ${job.status}`;
      return { durum: 'hata', mesaj: is.hata, model };
    }

    if (job.status !== 'completed') {
      return { durum: 'bekliyor', mesaj: 'OpenRouter Veo video üretiyor…', model };
    }

    const buffer = await openRouterVideoIndir(job);
    is.videoBuffer = buffer;
    is.videoUrl = await videoyuKaydet(islemId, buffer);
    is.durum = 'hazir';

    return { durum: 'hazir', videoUrl: is.videoUrl, model };
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : 'Veo durum sorgusu başarısız';
    logger.error('OpenRouter Veo durum hatası', e);
    return { durum: 'bekliyor', mesaj, model };
  }
}

export function veoVideoBufferGetir(islemId: string): Buffer | null {
  return isler.get(islemId)?.videoBuffer ?? null;
}
