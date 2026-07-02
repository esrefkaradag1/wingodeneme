/**
 * ÖSYM tarzı çizgi grafik — deterministik SVG üretimi.
 * LLM hatalı SVG ürettiğinde veya lineer grafik sorularında fallback.
 */

export type LineerGrafikVeri = {
  baslik: string;
  xEtiket: string;
  yEtiket: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** En az 2 nokta — çizgi bunlardan geçer */
  noktalar: Array<[number, number]>;
  vurgu?: { x: number; y: number };
};

const CIZGI_GRAFIK_ANAHTAR =
  /grafik|koordinat|doğrusal|dogrusal|lineer|oran.?orant|eğim|egim|v-t|x-t|s-t|hız.?zaman|hiz.?zaman|mesafe.?zaman|depo|su miktar|sıcaklık.?zaman|sicaklik.?zaman|nüfus|nufus|satış|satis|tüketim|tuketim/i;

const ZAMAN_BIRIM = /(?:dk\.?|dakika|saat|sn\.?|saniye|s\.?|dak\.?)/i;
const MIKTAR_BIRIM = /(?:L|litre|kg|m|km|cm|°C|derece|adet|birim|TL|₺|metre)/i;

/** Soru metni lineer grafik gerektiriyor mu? */
export function lineerGrafikSorusuMu(metin: string): boolean {
  const t = metin.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!CIZGI_GRAFIK_ANAHTAR.test(t)) return false;
  if (/pasta|dilim|çubuk grafik|sütun grafik|histogram|bar chart|pie chart/i.test(t)) return false;
  return true;
}

function sayiBul(metin: string, pattern: RegExp): number | null {
  const m = metin.match(pattern);
  if (!m?.[1]) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function ciftBul(metin: string): Array<[number, number]> {
  const ciftler: Array<[number, number]> = [];
  const regex =
    /(\d+(?:[.,]\d+)?)\s*(?:dk\.?|dakika|saat|sn\.?|saniye|dak\.?|s\.?)\s*(?:sonra|da|de|içinde|icinde| sonra)?[^0-9]{0,40}?(\d+(?:[.,]\d+)?)\s*(?:L|litre|kg|m\b|km|cm|°C|derece|adet|birim|TL|₺|metre)?/gi;
  for (const m of metin.matchAll(regex)) {
    const x = parseFloat(m[1].replace(',', '.'));
    const y = parseFloat(m[2].replace(',', '.'));
    if (Number.isFinite(x) && Number.isFinite(y)) ciftler.push([x, y]);
  }
  return ciftler;
}

function eksenEtiketleri(metin: string): { x: string; y: string; baslik: string } {
  const t = metin.toLowerCase();
  let xEtiket = 'x';
  let yEtiket = 'y';
  let baslik = 'Grafik';

  if (/zaman|dk\.?|dakika|saat|sn/i.test(t)) xEtiket = /saat/i.test(t) ? 'Zaman (saat)' : 'Zaman (dk.)';
  if (/su miktar|depo|litre|\bL\b/i.test(t)) yEtiket = 'Depodaki Su Miktarı (L)';
  else if (/sıcaklık|sicaklik|°C|derece/i.test(t)) yEtiket = 'Sıcaklık (°C)';
  else if (/hız|hiz|km\/s|m\/s/i.test(t)) yEtiket = 'Hız (m/s)';
  else if (/mesafe|konum|yol/i.test(t)) yEtiket = 'Mesafe (m)';
  else if (/nüfus|nufus/i.test(t)) yEtiket = 'Nüfus';
  else if (/satış|satis|tüketim|tuketim|gelir|gider/i.test(t)) yEtiket = 'Miktar';
  else if (/sıcaklık|sicaklik/i.test(t)) yEtiket = 'Sıcaklık (°C)';

  if (/su miktar.*zaman|zaman.*su|depo/i.test(t)) {
    baslik = 'Grafik: Depodaki Su Miktarı ile Zaman Arasındaki İlişki';
  } else if (/hız.*zaman|hiz.*zaman/i.test(t)) {
    baslik = 'Grafik: Hız ile Zaman Arasındaki İlişki';
  } else if (/mesafe.*zaman|konum.*zaman/i.test(t)) {
    baslik = 'Grafik: Mesafe ile Zaman Arasındaki İlişki';
  } else if (/grafik:/i.test(metin)) {
    const m = metin.match(/[Gg]rafik\s*:\s*([^.\n"]+)/);
    if (m?.[1]) baslik = `Grafik: ${m[1].trim().slice(0, 80)}`;
  }

  return { x: xEtiket, y: yEtiket, baslik };
}

/** Soru metninden lineer grafik verisi çıkar */
export function lineerGrafikVerisiCikar(metin: string): LineerGrafikVeri | null {
  const t = metin.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!lineerGrafikSorusuMu(t)) return null;

  const { x: xEtiket, y: yEtiket, baslik } = eksenEtiketleri(t);
  const ciftler = ciftBul(t);

  const litreEslesme = t.match(/(\d+(?:[.,]\d+)?)\s*litre/i);
  let yBaslangic = litreEslesme ? parseFloat(litreEslesme[1].replace(',', '.')) : null;

  const sifirZaman =
    sayiBul(t, /(\d+(?:[.,]\d+)?)\s*(?:dk\.?|dakika|dakikada|saat)[^0-9]{0,40}(?:su\s*)?(?:kalmaz|biter|boşal|bosal|bosalm|sıfır|sifir|tamamen)/i) ??
    sayiBul(t, /(\d+(?:[.,]\d+)?)\s*(?:dk\.?|dakika|dakikada|saat)\s*(?:içinde|icinde|sonunda)[^0-9]{0,20}(?:boşal|bosal|biter)/i);

  const sorulanZaman = sayiBul(t, /(\d+(?:[.,]\d+)?)\s*(?:dk\.?|dakika)\s*sonra/i);

  let vurgu: { x: number; y: number } | undefined;
  if (sorulanZaman != null && yBaslangic != null && sifirZaman != null && sorulanZaman < sifirZaman) {
    vurgu = { x: sorulanZaman, y: Math.round(yBaslangic * (1 - sorulanZaman / sifirZaman)) };
  } else if (ciftler.length >= 1) {
    const orta = ciftler.find((c) => c[0] > 0 && c[0] < (sifirZaman ?? c[0] + 1));
    vurgu = orta ? { x: orta[0], y: orta[1] } : { x: ciftler[0][0], y: ciftler[0][1] };
  }

  if (yBaslangic != null && sifirZaman != null) {
    return {
      baslik,
      xEtiket,
      yEtiket,
      xMin: 0,
      xMax: Math.ceil(sifirZaman * 1.05),
      yMin: 0,
      yMax: Math.ceil(yBaslangic * 1.1),
      noktalar: [
        [0, yBaslangic],
        [sifirZaman, 0],
      ],
      vurgu,
    };
  }

  if (ciftler.length >= 2) {
    const xs = ciftler.map((c) => c[0]);
    const ys = ciftler.map((c) => c[1]);
    const xMax = Math.ceil(Math.max(...xs, 1) * 1.05);
    const yMax = Math.ceil(Math.max(...ys, yBaslangic ?? 0, 1) * 1.1);
    return {
      baslik,
      xEtiket,
      yEtiket,
      xMin: 0,
      xMax,
      yMin: 0,
      yMax,
      noktalar: ciftler.slice(0, 2),
      vurgu,
    };
  }

  if (ciftler.length === 1 && yBaslangic != null) {
    const [vx, vy] = ciftler[0];
    return {
      baslik,
      xEtiket,
      yEtiket,
      xMin: 0,
      xMax: Math.ceil(Math.max(vx * 2, sifirZaman ?? vx * 2, 1) * 1.05),
      yMin: 0,
      yMax: Math.ceil(Math.max(yBaslangic, vy, 1) * 1.1),
      noktalar: [
        [0, yBaslangic],
        [sifirZaman ?? vx * 2, 0],
      ],
      vurgu: { x: vx, y: vy },
    };
  }

  return null;
}

function veriKoordinat(
  x: number,
  y: number,
  veri: LineerGrafikVeri,
  plot: { x0: number; y0: number; w: number; h: number },
): { px: number; py: number } {
  const { xMin, xMax, yMin, yMax } = veri;
  const px = plot.x0 + ((x - xMin) / (xMax - xMin || 1)) * plot.w;
  const py = plot.y0 + plot.h - ((y - yMin) / (yMax - yMin || 1)) * plot.h;
  return { px, py };
}

function guzelTick(max: number, adet = 4): number[] {
  if (max <= 0) return [0];
  const ham = max / adet;
  const mag = Math.pow(10, Math.floor(Math.log10(ham)));
  const adim = Math.ceil(ham / mag) * mag;
  const ticks: number[] = [0];
  for (let v = adim; v <= max * 1.01; v += adim) ticks.push(Math.round(v));
  if (!ticks.includes(Math.round(max))) ticks.push(Math.round(max));
  return [...new Set(ticks)].sort((a, b) => a - b);
}

/** ÖSYM tarzı çizgi grafik SVG */
export function lineerGrafikSvgOlustur(veri: LineerGrafikVeri): string {
  const plot = { x0: 90, y0: 55, w: 430, h: 280 };
  const parcalar: string[] = [];

  parcalar.push(
    `<text x="300" y="28" font-size="15" font-weight="600" text-anchor="middle" fill="#111827" font-family="Arial,sans-serif">${escapeXml(veri.baslik)}</text>`,
  );

  const xTicks = guzelTick(veri.xMax);
  const yTicks = guzelTick(veri.yMax);

  const origin = veriKoordinat(veri.xMin, veri.yMin, veri, plot);
  const xEnd = veriKoordinat(veri.xMax, veri.yMin, veri, plot);
  const yTop = veriKoordinat(veri.xMin, veri.yMax, veri, plot);

  parcalar.push(
    `<line x1="${origin.px}" y1="${origin.py}" x2="${xEnd.px + 18}" y2="${origin.py}" stroke="#111827" stroke-width="2"/>`,
  );
  parcalar.push(
    `<polygon points="${xEnd.px + 18},${origin.py} ${xEnd.px + 8},${origin.py - 5} ${xEnd.px + 8},${origin.py + 5}" fill="#111827"/>`,
  );
  parcalar.push(
    `<line x1="${origin.px}" y1="${origin.py}" x2="${origin.px}" y2="${yTop.py - 18}" stroke="#111827" stroke-width="2"/>`,
  );
  parcalar.push(
    `<polygon points="${origin.px},${yTop.py - 18} ${origin.px - 5},${yTop.py - 8} ${origin.px + 5},${yTop.py - 8}" fill="#111827"/>`,
  );

  parcalar.push(
    `<text x="${(origin.px + xEnd.px) / 2}" y="${origin.py + 38}" font-size="14" text-anchor="middle" fill="#111827" font-family="Arial,sans-serif">${escapeXml(veri.xEtiket)}</text>`,
  );
  parcalar.push(
    `<text x="28" y="${(origin.py + yTop.py) / 2}" font-size="14" text-anchor="middle" fill="#111827" font-family="Arial,sans-serif" transform="rotate(-90 28 ${(origin.py + yTop.py) / 2})">${escapeXml(veri.yEtiket)}</text>`,
  );

  for (const xv of xTicks) {
    const p = veriKoordinat(xv, veri.yMin, veri, plot);
    parcalar.push(`<line x1="${p.px}" y1="${p.py}" x2="${p.px}" y2="${p.py + 6}" stroke="#111827" stroke-width="1.5"/>`);
    parcalar.push(
      `<text x="${p.px}" y="${p.py + 22}" font-size="13" text-anchor="middle" fill="#111827" font-family="Arial,sans-serif">${xv}</text>`,
    );
  }

  for (const yv of yTicks) {
    if (yv === 0) continue;
    const p = veriKoordinat(veri.xMin, yv, veri, plot);
    parcalar.push(`<line x1="${p.px - 6}" y1="${p.py}" x2="${p.px}" y2="${p.py}" stroke="#111827" stroke-width="1.5"/>`);
    parcalar.push(
      `<text x="${p.px - 12}" y="${p.py + 5}" font-size="13" text-anchor="end" fill="#111827" font-family="Arial,sans-serif">${yv}</text>`,
    );
  }

  parcalar.push(
    `<text x="${origin.px - 8}" y="${origin.py + 18}" font-size="13" text-anchor="end" fill="#111827" font-family="Arial,sans-serif">0</text>`,
  );

  const pts = veri.noktalar.map(([x, y]) => veriKoordinat(x, y, veri, plot));
  if (pts.length >= 2) {
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ');
    parcalar.push(`<path d="${path}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/>`);
  }

  if (veri.vurgu) {
    const vp = veriKoordinat(veri.vurgu.x, veri.vurgu.y, veri, plot);
    const xp = veriKoordinat(veri.vurgu.x, veri.yMin, veri, plot);
    const yp = veriKoordinat(veri.xMin, veri.vurgu.y, veri, plot);
    parcalar.push(
      `<line x1="${vp.px}" y1="${vp.py}" x2="${xp.px}" y2="${xp.py}" stroke="#111827" stroke-width="1.5" stroke-dasharray="5,4"/>`,
    );
    parcalar.push(
      `<line x1="${vp.px}" y1="${vp.py}" x2="${yp.px}" y2="${yp.py}" stroke="#111827" stroke-width="1.5" stroke-dasharray="5,4"/>`,
    );
    parcalar.push(`<circle cx="${vp.px}" cy="${vp.py}" r="5" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>`);
    if (veri.vurgu.x > 0) {
      parcalar.push(
        `<text x="${xp.px}" y="${xp.py + 22}" font-size="13" font-weight="600" text-anchor="middle" fill="#2563eb" font-family="Arial,sans-serif">${veri.vurgu.x}</text>`,
      );
    }
    if (veri.vurgu.y > 0) {
      parcalar.push(
        `<text x="${yp.px - 12}" y="${yp.py + 5}" font-size="13" font-weight="600" text-anchor="end" fill="#2563eb" font-family="Arial,sans-serif">${veri.vurgu.y}</text>`,
      );
    }
  }

  return `<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;max-height:360px;display:block;margin:0 auto;">${parcalar.join('')}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Metinden lineer grafik SVG üret (parse başarılıysa) */
export function lineerGrafikSvgSablonuOlustur(metin: string): string | null {
  const veri = lineerGrafikVerisiCikar(metin);
  if (!veri || veri.noktalar.length < 2) return null;
  return lineerGrafikSvgOlustur(veri);
}

/** Prompt'a eklenecek ÖSYM çizgi grafik yönergesi */
export const OSYM_CIZGI_GRAFIK_SVG_YONERGESI = `
📈 ÖSYM ÇİZGİ GRAFİK KURALLARI (ZORUNLU — pasta/sütun DEĞİL, koordinat düzleminde çizgi):
- Üstte grafik başlığı: <text font-size="15" font-weight="600" text-anchor="middle">Grafik: …</text>
- X ve Y eksenleri kalın çizgi + ok ucu; eksen etiketleri birimli (ör. "Zaman (dk.)", "Depodaki Su Miktarı (L)").
- Önemli x ve y değerlerinde tick işareti + sayı etiketi; köken "0" yaz.
- Veri çizgisi: stroke="#2563eb" stroke-width="2.5" — tek mavi çizgi, dolgu yok.
- Soru metninde ara nokta varsa (ör. 90 dk → 120 L): mavi <circle r="5"> + eksenlere kesik çizgi (stroke-dasharray="5,4").
- Grafikteki TÜM sayılar soru kökündeki verilerle birebir tutarlı; rastgele nokta YASAK.
- Dekoratif grid, 3D efekt, gölgelendirme YASAK; sade ÖSYM baskı stili.
`;

/** Prompt referans örneği — su deposu lineer azalış */
export const OSYM_CIZGI_GRAFIK_SVG_ORNEK = `
ÖRNEK — Depodaki su / lineer azalış (referans al, verileri soruya göre değiştir):
<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <text x="300" y="28" font-size="15" font-weight="600" text-anchor="middle" fill="#111827">Grafik: Depodaki Su Miktarı ile Zaman Arasındaki İlişki</text>
  <line x1="90" y1="335" x2="538" y2="335" stroke="#111827" stroke-width="2"/>
  <line x1="90" y1="335" x2="90" y2="57" stroke="#111827" stroke-width="2"/>
  <path d="M90,95 L520,335" fill="none" stroke="#2563eb" stroke-width="2.5"/>
  <circle cx="305" cy="215" r="5" fill="#2563eb"/>
  <line x1="305" y1="215" x2="305" y2="335" stroke="#111827" stroke-width="1.5" stroke-dasharray="5,4"/>
  <line x1="305" y1="215" x2="90" y2="215" stroke="#111827" stroke-width="1.5" stroke-dasharray="5,4"/>
  <text x="305" y="357" font-size="13" text-anchor="middle" fill="#2563eb">90</text>
  <text x="78" y="220" font-size="13" text-anchor="end" fill="#2563eb">120</text>
  <text x="300" y="373" font-size="14" text-anchor="middle" fill="#111827">Zaman (dk.)</text>
</svg>
`;
