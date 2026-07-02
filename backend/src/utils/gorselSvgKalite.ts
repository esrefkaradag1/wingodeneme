/**
 * Tüm dersler için SVG/görsel kalite sezgisi ve yeniden üretim yönergeleri.
 * Fizik devre şablonu fizikSvgYardim.ts üzerinden devralınır.
 */

import {
  fizikSvgZayifMi,
  seriDevreSvgSablonuOlustur,
  seriDevreSorusuMu,
  fizikSvgYenidenUretEk,
} from './fizikSvgYardim';
import {
  lineerGrafikSorusuMu,
  lineerGrafikSvgSablonuOlustur,
  OSYM_CIZGI_GRAFIK_SVG_ORNEK,
  OSYM_CIZGI_GRAFIK_SVG_YONERGESI,
} from './grafikSvgSablonu';
import { ogretmenTalimatKirp } from '../constants/ogretmenTalimat';

export { OSYM_CIZGI_GRAFIK_SVG_YONERGESI, OSYM_CIZGI_GRAFIK_SVG_ORNEK };

const LATEX_IN_SVG = /\$|\\frac|\\Omega|\\omega|\\sqrt|\\text\{/i;

const GORSEL_DERS_ANAHTAR = [
  'fizik', 'kimya', 'biyoloji', 'fen', 'geometri', 'trigonometri', 'matematik',
  'coğrafya', 'cografya', 'harita', 'grafik', 'optik', 'devre',
];

function shapeCount(svg: string): number {
  const lineSay = (svg.match(/<line\b/gi) || []).length;
  const rectSay = (svg.match(/<rect\b/gi) || []).length;
  const pathSay = (svg.match(/<path\b/gi) || []).length;
  const circleSay = (svg.match(/<circle\b/gi) || []).length;
  const polySay = (svg.match(/<polygon\b/gi) || []).length;
  const ellipseSay = (svg.match(/<ellipse\b/gi) || []).length;
  return lineSay + rectSay + pathSay + circleSay + polySay + ellipseSay;
}

function textDumpMi(svg: string): boolean {
  const textIcerik = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/gi)].map((m) => m[1].trim());
  const birlesik = textIcerik.join(' ');
  const esittirSay = textIcerik.filter((t) => t.includes('=')).length;
  if (esittirSay >= 3) return true;
  if (birlesik.length > 100 && esittirSay >= 2) return true;
  if (birlesik.length > 140) return true;
  return false;
}

function cizgiGrafikZayifMi(svg: string, soruMetni?: string): boolean {
  const s = (svg || '').trim();
  const metin = (soruMetni || '').replace(/<[^>]+>/g, ' ');
  if (!lineerGrafikSorusuMu(metin)) return false;

  const lineSay = (s.match(/<line\b/gi) || []).length;
  const pathSay = (s.match(/<path\b/gi) || []).length;
  const textSay = (s.match(/<text\b/gi) || []).length;
  const maviCizgi = /stroke="#2563eb"|stroke='#2563eb'|stroke="#3b82f6"|stroke='#3b82f6'/.test(s);
  const baslikVar = /<text[^>]*font-weight="600"/i.test(s) || /Grafik:/i.test(s);
  const kesikCizgi = /stroke-dasharray/i.test(s);
  const vurguVar = /<circle\b/i.test(s);

  if (lineSay < 2 && pathSay < 1) return true;
  if (textSay < 3) return true;
  if (!baslikVar && textSay < 5) return true;
  if (!maviCizgi && pathSay < 1) return true;

  const araNokta = /(\d+)\s*(?:dk|dakika)[^0-9]{0,40}(\d+)\s*(?:L|litre)/i.test(metin);
  if (araNokta && !kesikCizgi && !vurguVar) return true;

  return false;
}

/** Ders + içerik bağlamında SVG yetersiz mi? */
export function gorselSvgZayifMi(ders: string, svg: string, soruMetni?: string): boolean {
  const s = (svg || '').trim();
  const metin = (soruMetni || '').replace(/<[^>]+>/g, ' ');
  const d = (ders || '').toLowerCase();

  if (s.length < 80) return true;
  if (LATEX_IN_SVG.test(s)) return true;

  if (cizgiGrafikZayifMi(s, metin)) return true;

  if (/fizik|fen bilim/i.test(d) || /devre|direnç|kaldırma|basınç|taşırma|optik|kuvvet/i.test(metin)) {
    return fizikSvgZayifMi(s, metin);
  }

  const shapes = shapeCount(s);
  if (shapes < 1) return true;

  if (/geometri|trigonometri|üçgen|çember|açı/i.test(metin) && shapes < 2) return true;
  if (/grafik|koordinat|fonksiyon|eğri|tablo/i.test(metin) && shapes < 2 && !/<line\b/i.test(s)) return true;
  if (/harita|coğrafya|cografya|iklim|nüfus/i.test(metin) && shapes < 2) return true;

  const rectSay = (s.match(/<rect\b/gi) || []).length;
  const lineSay = (s.match(/<line\b/gi) || []).length;
  if (rectSay === 1 && lineSay < 2 && shapes <= 2) return true;

  if (textDumpMi(s)) return true;

  if (GORSEL_DERS_ANAHTAR.some((k) => d.includes(k)) && shapes < 2 && s.length < 200) return true;

  return false;
}

/** Bilinen senaryolar için deterministik SVG şablonu */
export function gorselSvgSablonu(ders: string, soruMetni: string): string | null {
  const metin = soruMetni.replace(/<[^>]+>/g, ' ');
  const d = (ders || '').toLowerCase();

  const lineerGrafik = lineerGrafikSvgSablonuOlustur(metin);
  if (lineerGrafik) return lineerGrafik;

  if ((/fizik|fen/i.test(d) || /devre|direnç|ohm/i.test(metin)) && seriDevreSorusuMu(metin)) {
    return seriDevreSvgSablonuOlustur(metin);
  }
  return null;
}

/** SVG yeniden üretim prompt eki — ders ve öğretmen talimatına göre */
export function gorselSvgYenidenUretPromptEk(ders: string, ogretmenTalimat?: string): string {
  const d = (ders || '').toLowerCase();
  let ek =
    'ÖNCEKİ SVG GEÇERSİZ veya yetersiz. Soru metnini ve şıkları DEĞİŞTİRME; yalnızca svgGorsel üret.\n';

  if (/fizik|fen/i.test(d)) {
    ek += fizikSvgYenidenUretEk();
    ek += `
Basınç/kaldırma: taşırma kabında su seviyesi taşma ağzı hizasında; cisim kısmen batmış yüzer.
Optik: ışın diyagramı, odak noktaları. Grafik: eksen etiketleri ve birimler.`;
  }
  if (/geometri|trigonometri|matematik/i.test(d)) {
    ek += `
Geometri/grafik: ölçüler soru metniyle birebir tutarlı; etiketler kısa, çakışmasız.
Koordinat grafiğinde eksen çizgileri ve ölçek net olsun.
${OSYM_CIZGI_GRAFIK_SVG_YONERGESI}
${OSYM_CIZGI_GRAFIK_SVG_ORNEK}`;
  }
  if (/fizik|fen bilim/i.test(d)) {
    ek += `
Grafik (v-t, x-t, s-t): ${OSYM_CIZGI_GRAFIK_SVG_YONERGESI.trim()}`;
  }
  if (/kimya|biyoloji/i.test(d)) {
    ek += `
Kimya/biyoloji: deney düzeni veya şema sade; semboller okunaklı, dekorasyon yok.`;
  }
  if (/coğrafya|cografya|harita/i.test(d)) {
    ek += `
Coğrafya: harita/grafik net sınırlar; lejant kısa; veriler soru metniyle uyumlu.`;
  }
  if (/tarih|inkılap|sosyal|felsefe/i.test(d)) {
    ek += `
Sözel görsel: zaman çizelgesi, tablo veya şema düzenli; metin yığını svg içine yazma.`;
  }
  if (/ingilizce|english/i.test(d)) {
    ek += `
English layout: speech bubbles with ≥130px gap, table as rect grid (not a circle), character heads in a row; labels in English; no overlapping text.`;
  }

  const talimat = ogretmenTalimatKirp(ogretmenTalimat).slice(0, 800);
  if (talimat) {
    ek += `\nÖĞRETMEN KISITI (svg buna uymalı):\n${talimat}\n`;
  }
  return ek;
}
