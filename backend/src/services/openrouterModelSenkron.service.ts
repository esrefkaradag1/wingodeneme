import axios from 'axios';
import { getOpenRouterApiKey } from '../config/openrouter';
import {
  OpenRouterModelAyar,
  OpenRouterModelKayit,
  openRouterModelAyarKaydet,
  openRouterModelAyarOku,
  panelCacheTemizle,
  varsayilanModelAyar,
} from '../config/openrouterModeller';
import { openrouterHttpHeaders } from '../utils/openrouterHeaders';
import { logger } from '../utils/logger';

interface OpenRouterApiModel {
  id: string;
  name?: string;
  created?: number;
  context_length?: number;
  expiration_date?: string | null;
  architecture?: {
    output_modalities?: string[];
    modality?: string;
  };
}

const ONERILEN_PANEL_KALIP =
  /^(openai\/(gpt-[45][\w.-]*|o[34][\w.-]*|chatgpt)|anthropic\/claude-(sonnet|haiku|opus)-[\d.]+|google\/gemini-(2\.[45]|3\.[\d.]+)|deepseek\/deepseek-(chat|v3|r1)|mistralai\/mistral-large)/i;

const KATALOG_KALIP =
  /^(openai\/|anthropic\/claude|google\/gemini|deepseek\/|mistralai\/mistral|meta-llama\/llama-3)/i;

const HARIC_KALIP =
  /embed|whisper|tts|dall-e|image|audio|transcri|moderation|guard|safety|:free$/i;

function saglayiciStil(id: string): Pick<OpenRouterModelKayit, 'renk' | 'ikon'> {
  if (/^openai\/o/.test(id) || /\/o[34]-/.test(id)) return { renk: 'blue', ikon: '🔵' };
  if (id.startsWith('openai/')) return { renk: 'green', ikon: '🟢' };
  if (id.startsWith('anthropic/')) return { renk: 'orange', ikon: '🟠' };
  if (id.startsWith('google/')) return { renk: 'purple', ikon: '🟣' };
  return { renk: 'gray', ikon: '⚪' };
}

function gorunenAd(model: OpenRouterApiModel): string {
  const ham = model.name?.trim() || model.id.split('/').pop() || model.id;
  return ham.replace(/\s*\(via OpenRouter\)\s*$/i, '').trim();
}

function varsayilanAciklama(id: string, ad: string): string {
  if (/o[34]-mini/i.test(id)) return 'İleri muhakeme — zor Matematik & Fizik';
  if (/claude.*sonnet/i.test(id)) return 'Doğal dil — Türkçe, İngilizce & sözel';
  if (/claude.*haiku/i.test(id)) return 'Hızlı sözel üretim';
  if (/gemini.*pro/i.test(id)) return 'Görsel okuma & grafik — Geometri';
  if (/gemini.*flash/i.test(id)) return 'Hızlı görsel yorumlama';
  if (/deepseek/i.test(id)) return 'Alternatif genel model';
  if (/mistral/i.test(id)) return 'Alternatif — uzun bağlam';
  if (/mini|nano/i.test(id)) return 'Hızlı & ekonomik üretim';
  if (/gpt-5\.5/i.test(id)) return 'En yeni OpenAI — karmaşık soru & kod';
  if (/gpt-5/i.test(id)) return 'Güncel OpenAI modeli';
  return ad;
}

function panelOnerilirMi(id: string): boolean {
  return ONERILEN_PANEL_KALIP.test(id) && !HARIC_KALIP.test(id);
}

function katalogaUygunMu(model: OpenRouterApiModel): boolean {
  if (!model.id || HARIC_KALIP.test(model.id)) return false;
  if (model.expiration_date) {
    const exp = Date.parse(model.expiration_date);
    if (!Number.isNaN(exp) && exp < Date.now()) return false;
  }
  const cikti = model.architecture?.output_modalities;
  if (Array.isArray(cikti) && cikti.length > 0 && !cikti.includes('text')) return false;
  return KATALOG_KALIP.test(model.id);
}

async function openRouterModelleriCek(): Promise<OpenRouterApiModel[]> {
  const headers: Record<string, string> = { ...openrouterHttpHeaders() };
  try {
    headers.Authorization = `Bearer ${getOpenRouterApiKey()}`;
  } catch {
    /* API key yoksa herkese açık liste denenir */
  }

  const yanit = await axios.get<{ data?: OpenRouterApiModel[] }>('https://openrouter.ai/api/v1/models', {
    headers,
    timeout: 60000,
  });
  return Array.isArray(yanit.data?.data) ? yanit.data.data : [];
}

function mevcutHarita(ayar: OpenRouterModelAyar): Map<string, OpenRouterModelKayit> {
  return new Map(ayar.modeller.map((m) => [m.id, m]));
}

function kayitOlustur(model: OpenRouterApiModel, onceki?: OpenRouterModelKayit): OpenRouterModelKayit {
  const stil = saglayiciStil(model.id);
  const ad = onceki?.ad || gorunenAd(model);
  return {
    id: model.id,
    ad,
    aciklama: onceki?.aciklama || varsayilanAciklama(model.id, ad),
    renk: onceki?.renk || stil.renk,
    ikon: onceki?.ikon || stil.ikon,
    paneldeGoster: onceki?.paneldeGoster ?? panelOnerilirMi(model.id),
    openrouterAd: model.name || model.id,
    contextLength: model.context_length,
    uretim: model.created,
  };
}

export async function openRouterModelleriSenkronize(): Promise<{
  ayar: OpenRouterModelAyar;
  yeniEklenen: number;
  guncellenen: number;
}> {
  const mevcut = await openRouterModelAyarOku();
  const harita = mevcutHarita(mevcut.modeller.length ? mevcut : varsayilanModelAyar());

  const tum = await openRouterModelleriCek();
  const filtreli = tum.filter(katalogaUygunMu).sort((a, b) => (b.created || 0) - (a.created || 0));

  let yeniEklenen = 0;
  let guncellenen = 0;
  const yeniListe: OpenRouterModelKayit[] = [];

  for (const model of filtreli) {
    const onceki = harita.get(model.id);
    const kayit = kayitOlustur(model, onceki);
    if (!onceki) yeniEklenen += 1;
    else if (onceki.openrouterAd !== kayit.openrouterAd || onceki.contextLength !== kayit.contextLength) {
      guncellenen += 1;
    }
    yeniListe.push(kayit);
    harita.delete(model.id);
  }

  for (const kalan of harita.values()) {
    yeniListe.push({
      ...kalan,
      aciklama: `${kalan.aciklama.replace(/\s*\(OpenRouter'da bulunamadı\)\s*$/i, '')} (OpenRouter'da bulunamadı)`.trim(),
    });
  }

  const ayar: OpenRouterModelAyar = {
    sonSenkron: new Date().toISOString(),
    openrouterToplam: tum.length,
    modeller: yeniListe,
  };

  await openRouterModelAyarKaydet(ayar);
  panelCacheTemizle();
  logger.info(
    `[OpenRouter] Model senkron — katalog ${filtreli.length}/${tum.length}, yeni ${yeniEklenen}, güncellenen ${guncellenen}`,
  );

  return { ayar, yeniEklenen, guncellenen };
}

export async function openRouterPanelModelleriKaydet(
  modeller: OpenRouterModelKayit[],
): Promise<OpenRouterModelAyar> {
  const mevcut = await openRouterModelAyarOku();
  const ayar: OpenRouterModelAyar = {
    ...mevcut,
    modeller: modeller.map((m) => ({
      id: m.id,
      ad: String(m.ad || m.id).trim(),
      aciklama: String(m.aciklama || '').trim(),
      renk: m.renk || 'gray',
      ikon: m.ikon || '⚪',
      paneldeGoster: Boolean(m.paneldeGoster),
      openrouterAd: m.openrouterAd,
      contextLength: m.contextLength,
      uretim: m.uretim,
    })),
  };
  await openRouterModelAyarKaydet(ayar);
  panelCacheTemizle();
  return ayar;
}
