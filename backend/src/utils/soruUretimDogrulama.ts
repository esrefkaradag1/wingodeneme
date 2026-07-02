/**
 * AI ve panelden gelen soru üretim çıktısı için şema doğrulama (şık/metin bütünlüğü).
 * Matematiksel tutarlılık ve özgünlük → `soruGarantiKatmani` + `aiSoruKaliteIsleme`.
 */

const SIKLAR_5 = ['A', 'B', 'C', 'D', 'E'] as const;
const SIKLAR_4 = ['A', 'B', 'C', 'D'] as const;
export type SikHarf = (typeof SIKLAR_5)[number];
type Sik4 = (typeof SIKLAR_4)[number];

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ');
}

/** Ham metin + isteğe bağlı SVG: ÖSYM tarzı minimum içerik */
export function metinYeterliMi(h: {
  metin?: string;
  metinHtml?: string;
  svgGorsel?: string;
}): boolean {
  const combined = (h.metinHtml ?? h.metin ?? '').trim();
  const plain = stripHtml(combined).replace(/\s+/g, ' ').trim();
  if (plain.length >= 8) return true;
  if (combined.includes('<svg') && combined.length >= 60) return true;
  if ((h.svgGorsel?.length ?? 0) > 40) return true;
  return false;
}

export function normalizeSeceneklerObject(
  raw: unknown,
  secenekSayisi: 4 | 5 = 5
): { ok: true; v: Record<string, string> } | { ok: false; sebep: string } {
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, sebep: 'secenekler nesne olmalı' };
  }
  const o = raw as Record<string, unknown>;
  const siklar = secenekSayisi === 4 ? SIKLAR_4 : SIKLAR_5;
  const out: Record<string, string> = {};
  for (const k of siklar) {
    const val = o[k] ?? o[k.toLowerCase()];
    if (val === undefined || val === null) {
      return { ok: false, sebep: `${k} şıkkı eksik` };
    }
    const str = String(val).trim();
    if (str.length === 0) {
      return { ok: false, sebep: `${k} şıkkı boş olamaz` };
    }
    out[k] = str;
  }
  return { ok: true, v: out };
}

export function normalizeDogruCevap(
  raw: unknown,
  secenekSayisi: 4 | 5 = 5
): { ok: true; v: SikHarf } | { ok: false; sebep: string } {
  if (raw == null || raw === '') {
    return { ok: false, sebep: 'dogruCevap boş' };
  }
  const s = String(raw).trim().toUpperCase();
  const re = secenekSayisi === 4 ? /^([A-D])$/ : /^([A-E])$/;
  if (!re.test(s)) {
    const kısa = String(raw).slice(0, 24);
    const aralik = secenekSayisi === 4 ? 'A–D' : 'A–E';
    return { ok: false, sebep: `dogruCevap ${aralik} harflerinden biri olmalı (gelen: "${kısa}")` };
  }
  return { ok: true, v: s as SikHarf };
}

function siklarBenzersizMi(secenekler: Record<string, string>, secenekSayisi: 4 | 5): boolean {
  const siklar = secenekSayisi === 4 ? SIKLAR_4 : SIKLAR_5;
  const degerler = siklar.map((k) => String(secenekler[k] || '').toLowerCase().trim());
  return new Set(degerler).size === siklar.length;
}

export interface HamUretilenSoru {
  metin?: string;
  metinHtml?: string;
  svgGorsel?: string;
  secenekler: unknown;
  dogruCevap: unknown;
  kazanim?: string | null;
}

export interface DogrulanmisHamSoru extends Omit<HamUretilenSoru, 'secenekler' | 'dogruCevap'> {
  secenekler: Record<string, string>;
  dogruCevap: SikHarf;
}

export type SoruDogrulamaHatasi = { sira: number; mesajlar: string[] };

/**
 * Tüm sorular geçerli değilse hiçbirini dönmez; hata listesi döner (1 tabanlı sira).
 */
export function validateUretilenSoruListesi(
  sorular: HamUretilenSoru[],
  secenekler?: { secenekSayisi?: 4 | 5 }
): { ok: true; sorular: DogrulanmisHamSoru[] } | { ok: false; hatalar: SoruDogrulamaHatasi[] } {
  const hatalar: SoruDogrulamaHatasi[] = [];
  const out: DogrulanmisHamSoru[] = [];
  const secenekSayisi = secenekler?.secenekSayisi === 4 ? 4 : 5;

  for (let i = 0; i < sorular.length; i++) {
    const raw = sorular[i];
    const mesajlar: string[] = [];

    const sec = normalizeSeceneklerObject(raw.secenekler, secenekSayisi);
    if (!sec.ok) mesajlar.push(sec.sebep);

    const dc = normalizeDogruCevap(raw.dogruCevap, secenekSayisi);
    if (!dc.ok) mesajlar.push(dc.sebep);

    if (!metinYeterliMi(raw)) {
      mesajlar.push(
        'Soru kökü çok kısa veya eksik (en az ~8 karakter anlamlı metin, veya yeterli SVG içeriği gerekir)'
      );
    }

    if (sec.ok && !siklarBenzersizMi(sec.v, secenekSayisi)) {
      mesajlar.push(`${secenekSayisi} şık birbirinden farklı olmalı (yinelenen şık metni var)`);
    }

    if (mesajlar.length > 0) {
      hatalar.push({ sira: i + 1, mesajlar });
    } else if (sec.ok && dc.ok) {
      const { secenekler: _a, dogruCevap: _b, ...rest } = raw;
      out.push({
        ...rest,
        secenekler: sec.v,
        dogruCevap: dc.v,
      });
    }
  }

  if (hatalar.length > 0) {
    return { ok: false, hatalar };
  }
  return { ok: true, sorular: out };
}
