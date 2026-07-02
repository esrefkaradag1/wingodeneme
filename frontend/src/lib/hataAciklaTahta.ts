export interface TahtaAdim {
  baslik: string;
  satirlar: string[];
}

export type CizimEleman =
  | { tur: 'segment'; x1: number; y1: number; x2: number; y2: number; renk?: string }
  | { tur: 'angle'; vx: number; vy: number; x1: number; y1: number; x2: number; y2: number; etiket?: string; renk?: string }
  | { tur: 'triangle'; noktalar: [number, number, number, number, number, number]; renk?: string }
  | { tur: 'circle'; cx: number; cy: number; r: number; renk?: string }
  | { tur: 'label'; x: number; y: number; metin: string; renk?: string }
  | { tur: 'arrow'; x1: number; y1: number; x2: number; y2: number; renk?: string }
  | { tur: 'dikAci'; x: number; y: number; boy?: number; renk?: string };

export interface CizimAdim {
  adimIdx: number;
  elemanlar: CizimEleman[];
}

export interface VideoAdim {
  adimIdx: number;
  baslik: string;
  anlatim: string;
  formul?: string;
  elemanlar?: CizimEleman[];
}

export interface HataAciklaVeri {
  ogretmenSozu?: string;
  neden: string;
  neYapmali: string;
  miniIpucu: string;
  tahtaAdimlari?: TahtaAdim[];
  cizimAdimlari?: CizimAdim[];
  videoAdimlari?: VideoAdim[];
  model?: string;
}

function cumlelereBol(metin: string, maxSatir = 2): string[] {
  const temiz = String(metin || '').trim();
  if (!temiz) return [];
  const parcalar = temiz
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parcalar.length <= maxSatir) return parcalar;
  return [parcalar.slice(0, maxSatir - 1).join(' '), parcalar.slice(maxSatir - 1).join(' ')];
}

export function hataAciklaToTahtaAdimlari(veri: HataAciklaVeri): TahtaAdim[] {
  if (veri.tahtaAdimlari?.length) {
    return veri.tahtaAdimlari.filter((a) => a.baslik || a.satirlar?.length);
  }
  return [
    { baslik: '1. Neden hata yaptın?', satirlar: cumlelereBol(veri.neden, 3) },
    { baslik: '2. Ne yapmalısın?', satirlar: cumlelereBol(veri.neYapmali, 2) },
    { baslik: '3. Mini ipucu', satirlar: cumlelereBol(veri.miniIpucu, 2) },
  ];
}

const GEOMETRI_ANAHTAR = /geometri|açı|aci|üçgen|ucgen|çember|cember|alan|hacim|vektör|vektor|trigonometri|sin|cos|tan|kot|prizma|cisim|yüzey|yuzey|kare|dikdörtgen|prizması/i;

function varsayilanPrizmaCizimi(adimIdx: number): CizimEleman[] {
  const kutu: CizimEleman[] = [
    { tur: 'segment', x1: 0.26, y1: 0.74, x2: 0.5, y2: 0.74, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.5, y1: 0.74, x2: 0.5, y2: 0.5, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.5, y1: 0.5, x2: 0.26, y2: 0.5, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.26, y1: 0.5, x2: 0.26, y2: 0.74, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.5, y1: 0.74, x2: 0.72, y2: 0.64, renk: '#bae6fd' },
    { tur: 'segment', x1: 0.72, y1: 0.64, x2: 0.72, y2: 0.4, renk: '#bae6fd' },
    { tur: 'segment', x1: 0.72, y1: 0.4, x2: 0.5, y2: 0.5, renk: '#bae6fd' },
    { tur: 'segment', x1: 0.26, y1: 0.5, x2: 0.48, y2: 0.4, renk: '#bae6fd' },
    { tur: 'segment', x1: 0.48, y1: 0.4, x2: 0.72, y2: 0.4, renk: '#bae6fd' },
    { tur: 'label', x: 0.36, y: 0.78, metin: 'a' },
    { tur: 'label', x: 0.53, y: 0.64, metin: 'b' },
    { tur: 'label', x: 0.64, y: 0.54, metin: 'c' },
  ];
  if (adimIdx === 1) {
    return [
      ...kutu,
      { tur: 'label', x: 0.5, y: 0.32, metin: '6 yüzey → 3 çift', renk: '#fca5a5' },
      { tur: 'arrow', x1: 0.35, y1: 0.38, x2: 0.65, y2: 0.38, renk: '#fde68a' },
    ];
  }
  if (adimIdx >= 2) {
    return [
      ...kutu,
      { tur: 'label', x: 0.5, y: 0.32, metin: '2(ab+ac+bc)', renk: '#fde68a' },
    ];
  }
  return kutu;
}

function kumulatifElemanlar(adimIdx: number, adimSablonu: (idx: number) => CizimEleman[]): CizimEleman[] {
  const birlesik: CizimEleman[] = [];
  const anahtarlar = new Set<string>();
  for (let i = 0; i <= adimIdx; i++) {
    for (const el of adimSablonu(i)) {
      const key = JSON.stringify(el);
      if (anahtarlar.has(key)) continue;
      anahtarlar.add(key);
      birlesik.push(el);
    }
  }
  return birlesik;
}

const GORSEL_CIZIM_TURLERI = new Set(['segment', 'angle', 'triangle', 'circle', 'arrow', 'dikAci']);

function cizimGorselYeterliMi(elemanlar: CizimEleman[]): boolean {
  return elemanlar.some((el) => GORSEL_CIZIM_TURLERI.has(el.tur));
}

function aiCizimGuvenilirMi(elemanlar: CizimEleman[]): boolean {
  if (elemanlar.length < 2) return false;
  if (!cizimGorselYeterliMi(elemanlar)) return false;
  const gecerliTur = new Set(['segment', 'angle', 'triangle', 'circle', 'arrow', 'label', 'dikAci']);
  return elemanlar.every((el) => {
    if (!gecerliTur.has(el.tur)) return false;
    const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
    if (el.tur === 'segment') return n(el.x1) && n(el.y1) && n(el.x2) && n(el.y2);
    if (el.tur === 'label') return n(el.x) && n(el.y) && Boolean(el.metin?.trim());
    if (el.tur === 'triangle') return Array.isArray(el.noktalar) && el.noktalar.length === 6;
    return true;
  });
}

function prizmaKonusuMu(ders?: string, konu?: string): boolean {
  return /prizma|cisim|yüzey|yuzey|alan|hacim/i.test(`${ders || ''} ${konu || ''}`);
}

export function geometriDersMi(ders?: string, konu?: string): boolean {
  const metin = `${ders || ''} ${konu || ''}`;
  return GEOMETRI_ANAHTAR.test(metin);
}

function aiElemanNormalize(raw: unknown): CizimEleman | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const tur = String(e.tur || '').trim();
  if (!tur) return null;
  const n = (v: unknown) => {
    const x = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(x) ? x : null;
  };
  const renk = typeof e.renk === 'string' ? e.renk : undefined;

  switch (tur) {
    case 'segment': {
      const x1 = n(e.x1); const y1 = n(e.y1); const x2 = n(e.x2); const y2 = n(e.y2);
      if ([x1, y1, x2, y2].some((v) => v === null)) return null;
      return { tur: 'segment', x1: x1!, y1: y1!, x2: x2!, y2: y2!, renk };
    }
    case 'label': {
      const x = n(e.x); const y = n(e.y);
      const metin = String(e.metin || '').trim();
      if (x === null || y === null || !metin) return null;
      return { tur: 'label', x, y, metin, renk };
    }
    case 'circle': {
      const cx = n(e.cx); const cy = n(e.cy); const r = n(e.r);
      if ([cx, cy, r].some((v) => v === null)) return null;
      return { tur: 'circle', cx: cx!, cy: cy!, r: r!, renk };
    }
    case 'arrow': {
      const x1 = n(e.x1); const y1 = n(e.y1); const x2 = n(e.x2); const y2 = n(e.y2);
      if ([x1, y1, x2, y2].some((v) => v === null)) return null;
      return { tur: 'arrow', x1: x1!, y1: y1!, x2: x2!, y2: y2!, renk };
    }
    case 'angle': {
      const vx = n(e.vx); const vy = n(e.vy);
      const x1 = n(e.x1); const y1 = n(e.y1); const x2 = n(e.x2); const y2 = n(e.y2);
      if ([vx, vy, x1, y1, x2, y2].some((v) => v === null)) return null;
      return {
        tur: 'angle', vx: vx!, vy: vy!, x1: x1!, y1: y1!, x2: x2!, y2: y2!,
        etiket: typeof e.etiket === 'string' ? e.etiket : undefined, renk,
      };
    }
    case 'triangle': {
      const pts = Array.isArray(e.noktalar) ? e.noktalar.map((v) => n(v)) : [];
      if (pts.length !== 6 || pts.some((v) => v === null)) return null;
      return { tur: 'triangle', noktalar: pts as [number, number, number, number, number, number], renk };
    }
    case 'dikAci': {
      const x = n(e.x); const y = n(e.y);
      if (x === null || y === null) return null;
      return { tur: 'dikAci', x, y, boy: n(e.boy) ?? undefined, renk };
    }
    default:
      return null;
  }
}

function aiCizimKumulatif(veri: HataAciklaVeri, adimIdx: number): CizimEleman[] {
  const adimlar = veri.cizimAdimlari;
  if (!adimlar?.length) return [];

  const birlesik: CizimEleman[] = [];
  const anahtarlar = new Set<string>();

  for (let i = 0; i <= adimIdx; i++) {
    const kayit = adimlar.find((c) => c.adimIdx === i) ?? adimlar[i];
    if (!kayit?.elemanlar?.length) continue;
    for (const raw of kayit.elemanlar) {
      const el = aiElemanNormalize(raw);
      if (!el) continue;
      const key = JSON.stringify(el);
      if (anahtarlar.has(key)) continue;
      anahtarlar.add(key);
      birlesik.push(el);
    }
  }

  if (birlesik.length < 2) return [];
  if (!aiCizimGuvenilirMi(birlesik)) return [];
  return birlesik;
}

function dikUcgenHipotenusCizimi(adimIdx: number): CizimEleman[] {
  const temel: CizimEleman[] = [
    { tur: 'triangle', noktalar: [0.24, 0.76, 0.76, 0.76, 0.24, 0.26], renk: '#bae6fd' },
    { tur: 'dikAci', x: 0.24, y: 0.76, boy: 0.07, renk: '#fef08a' },
    { tur: 'label', x: 0.5, y: 0.82, metin: 'a (dik kenar)', renk: '#fef9c3' },
    { tur: 'label', x: 0.14, y: 0.52, metin: 'b (dik kenar)', renk: '#fef9c3' },
    { tur: 'label', x: 0.52, y: 0.46, metin: 'c = hip.', renk: '#fca5a5' },
  ];
  if (adimIdx === 0) return temel;
  if (adimIdx === 1) {
    return [
      ...temel,
      { tur: 'segment', x1: 0.24, y1: 0.76, x2: 0.76, y2: 0.76, renk: '#fde68a' },
      { tur: 'segment', x1: 0.24, y1: 0.76, x2: 0.24, y2: 0.26, renk: '#fde68a' },
      { tur: 'label', x: 0.5, y: 0.16, metin: 'En uzun kenar: hipotenüs', renk: '#fde68a' },
    ];
  }
  return [
    ...temel,
    { tur: 'label', x: 0.5, y: 0.14, metin: 'a² + b² = c²', renk: '#fde68a' },
    { tur: 'arrow', x1: 0.35, y1: 0.22, x2: 0.65, y2: 0.22, renk: '#86efac' },
  ];
}

function varsayilanUcgenCizimi(adimIdx: number): CizimEleman[] {
  const temel: CizimEleman[] = [
    { tur: 'triangle', noktalar: [0.2, 0.78, 0.8, 0.78, 0.5, 0.22], renk: '#bae6fd' },
    { tur: 'label', x: 0.2, y: 0.84, metin: 'A' },
    { tur: 'label', x: 0.8, y: 0.84, metin: 'B' },
    { tur: 'label', x: 0.5, y: 0.16, metin: 'C' },
  ];
  if (adimIdx >= 1) {
    return [...temel, { tur: 'label', x: 0.5, y: 0.55, metin: 'Kenarları kontrol et', renk: '#fde68a' }];
  }
  return temel;
}

function varsayilanAciCizimi(adimIdx: number): CizimEleman[] {
  const temel: CizimEleman[] = [
    { tur: 'segment', x1: 0.18, y1: 0.75, x2: 0.82, y2: 0.75, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.18, y1: 0.75, x2: 0.55, y2: 0.25, renk: '#fde68a' },
    { tur: 'angle', vx: 0.18, vy: 0.75, x1: 0.82, y1: 0.75, x2: 0.55, y2: 0.25, etiket: 'α', renk: '#fca5a5' },
  ];
  if (adimIdx >= 1) {
    return [...temel, { tur: 'label', x: 0.5, y: 0.14, metin: 'Açı ölçüsü', renk: '#fde68a' }];
  }
  return temel;
}

function varsayilanCemberCizimi(adimIdx: number): CizimEleman[] {
  const temel: CizimEleman[] = [
    { tur: 'circle', cx: 0.5, cy: 0.48, r: 0.2, renk: '#c4b5fd' },
    { tur: 'segment', x1: 0.5, y1: 0.48, x2: 0.7, y2: 0.48, renk: '#fef9c3' },
    { tur: 'label', x: 0.62, y: 0.44, metin: 'r' },
  ];
  if (adimIdx >= 1) {
    return [...temel, { tur: 'label', x: 0.5, y: 0.16, metin: 'Çevre = 2πr', renk: '#fde68a' }];
  }
  return temel;
}

function varsayilanTrigonometriCizimi(adimIdx: number): CizimEleman[] {
  const temel: CizimEleman[] = [
    { tur: 'triangle', noktalar: [0.22, 0.78, 0.78, 0.78, 0.22, 0.28], renk: '#bae6fd' },
    { tur: 'dikAci', x: 0.22, y: 0.78, boy: 0.07, renk: '#fef08a' },
    { tur: 'angle', vx: 0.22, vy: 0.78, x1: 0.78, y1: 0.78, x2: 0.22, y2: 0.28, etiket: 'θ', renk: '#fca5a5' },
    { tur: 'label', x: 0.5, y: 0.84, metin: 'karşın', renk: '#fef9c3' },
    { tur: 'label', x: 0.12, y: 0.54, metin: 'komşu', renk: '#fef9c3' },
    { tur: 'label', x: 0.52, y: 0.44, metin: 'hip.', renk: '#fca5a5' },
  ];
  if (adimIdx === 0) return temel;
  if (adimIdx === 1) {
    return [
      ...temel,
      { tur: 'label', x: 0.5, y: 0.14, metin: 'sinθ = karşın/hip', renk: '#fde68a' },
      { tur: 'arrow', x1: 0.5, y1: 0.2, x2: 0.5, y2: 0.32, renk: '#fde68a' },
    ];
  }
  return [
    ...temel,
    { tur: 'label', x: 0.5, y: 0.12, metin: 'cosθ = komşu/hip', renk: '#fde68a' },
    { tur: 'label', x: 0.5, y: 0.2, metin: 'tanθ = karşın/komşu', renk: '#86efac' },
    { tur: 'arrow', x1: 0.35, y1: 0.26, x2: 0.65, y2: 0.26, renk: '#86efac' },
  ];
}

/** Metin ve konuya göre en uygun yerel şablon */
function sablonSecici(birlesik: string, ders?: string, konu?: string): ((adimIdx: number) => CizimEleman[]) | null {
  const konuMetin = `${ders || ''} ${konu || ''} ${birlesik}`;
  if (/trigonometri|sinüs|sinus|kosinüs|kosinus|tanjant|birim çember|birim cember/i.test(konuMetin)) {
    return varsayilanTrigonometriCizimi;
  }
  if (analitikGeometriKonusuMu(konuMetin)) return varsayilanAnalitikGeometriCizimi;
  if (/hipoten|pisagor|pythag|dik üçgen|dik ucgen/i.test(birlesik)) return dikUcgenHipotenusCizimi;
  if (ruzgarEnerjisiKonusuMu(birlesik)) return varsayilanRuzgarEnerjisiCizimi;
  if (/makara|palanga|basit makine|kaldıraç|kaldirac/i.test(birlesik)) return (i) => varsayilanMakineCizimi(i, birlesik);
  if (/pil|batarya|atık pil|atik pil|çevre kirl|cevre kirl/i.test(birlesik)) return (i) => varsayilanCevreCizimi(i, birlesik);
  if (/\bprizma\b|\bcisim\b|\bgeometrik\b|yüzey alan|yuzey alan|\bhacim\b|\bküp\b|\bkup\b|\bsilindir\b|\bkoni\b/i.test(birlesik)) {
    return varsayilanPrizmaCizimi;
  }
  if (/üçgen|ucgen/i.test(birlesik)) return varsayilanUcgenCizimi;
  if (/çember|cember|daire|yarıçap|yaricap/i.test(birlesik)) return varsayilanCemberCizimi;
  if (/\baçı\b|\baci\b| derece|°/i.test(birlesik)) return varsayilanAciCizimi;
  if (cevreKonusuMu(undefined, undefined, birlesik)) return (i) => varsayilanCografyaCevreCizimi(i, birlesik);
  return null;
}

function varsayilanGenelCizimi(adimIdx: number): CizimEleman[] {
  return [
    { tur: 'arrow', x1: 0.2, y1: 0.5, x2: 0.75, y2: 0.5, renk: '#fde68a' },
    { tur: 'label', x: 0.48, y: 0.42, metin: adimIdx === 0 ? 'Hata' : adimIdx === 1 ? 'Kural' : 'İpucu' },
  ];
}

const CEVRE_ANAHTAR = /çevre|cevre|kirlilik|kirlen|hava|toprak|su|pil|batarya|atık|atik|enerji|dönüşüm|donusum|iklim|gaz|sera/i;
const RUZGAR_ANAHTAR = /rüzgar|ruzgar|türbin|turbin|yenilenebilir|güneş enerji|gunes enerji|hidroelektrik|enerji potansiyel|enerji kaynak/i;
const COGRAFYA_ANAHTAR = /coğrafya|cografya|harita|bölge|bolge|iklim|izmir|ege|anadolu|kıyı|kiyi|kıta|kita/i;

function ruzgarEnerjisiKonusuMu(birlesik: string): boolean {
  if (RUZGAR_ANAHTAR.test(birlesik)) return true;
  return COGRAFYA_ANAHTAR.test(birlesik) && /enerji|maden|kaynak|rüzgar|ruzgar/i.test(birlesik);
}

function varsayilanRuzgarEnerjisiCizimi(adimIdx: number): CizimEleman[] {
  const temel: CizimEleman[] = [
    { tur: 'segment', x1: 0.14, y1: 0.84, x2: 0.86, y2: 0.84, renk: '#86efac' },
    { tur: 'segment', x1: 0.5, y1: 0.78, x2: 0.5, y2: 0.42, renk: '#94a3b8' },
    { tur: 'circle', cx: 0.5, cy: 0.38, r: 0.045, renk: '#fde68a' },
    { tur: 'segment', x1: 0.5, y1: 0.38, x2: 0.66, y2: 0.24, renk: '#bae6fd' },
    { tur: 'segment', x1: 0.5, y1: 0.38, x2: 0.34, y2: 0.24, renk: '#bae6fd' },
    { tur: 'segment', x1: 0.5, y1: 0.38, x2: 0.5, y2: 0.18, renk: '#bae6fd' },
    { tur: 'label', x: 0.32, y: 0.76, metin: 'Ege kıyısı', renk: '#fef9c3' },
    { tur: 'label', x: 0.58, y: 0.3, metin: 'Türbin', renk: '#bae6fd' },
  ];
  if (adimIdx === 0) return temel;
  if (adimIdx === 1) {
    return [
      ...temel,
      { tur: 'arrow', x1: 0.76, y1: 0.58, x2: 0.62, y2: 0.44, renk: '#fde68a' },
      { tur: 'arrow', x1: 0.8, y1: 0.52, x2: 0.66, y2: 0.38, renk: '#fde68a' },
      { tur: 'label', x: 0.8, y: 0.5, metin: 'Rüzgâr', renk: '#fde68a' },
    ];
  }
  return [
    ...temel,
    { tur: 'arrow', x1: 0.76, y1: 0.58, x2: 0.62, y2: 0.44, renk: '#fde68a' },
    { tur: 'label', x: 0.5, y: 0.1, metin: 'Yenilenebilir enerji', renk: '#86efac' },
    { tur: 'label', x: 0.78, y: 0.48, metin: 'İzmir ✓', renk: '#fde68a' },
  ];
}

function varsayilanCografyaCevreCizimi(adimIdx: number, metin: string): CizimEleman[] {
  if (ruzgarEnerjisiKonusuMu(metin)) return varsayilanRuzgarEnerjisiCizimi(adimIdx);
  const temel: CizimEleman[] = [
    { tur: 'segment', x1: 0.18, y1: 0.78, x2: 0.82, y2: 0.78, renk: '#86efac' },
    { tur: 'circle', cx: 0.35, cy: 0.55, r: 0.08, renk: '#bae6fd' },
    { tur: 'circle', cx: 0.65, cy: 0.5, r: 0.06, renk: '#fde68a' },
    { tur: 'label', x: 0.35, y: 0.68, metin: 'Kaynak A', renk: '#fef9c3' },
    { tur: 'label', x: 0.65, y: 0.62, metin: 'Kaynak B', renk: '#fef9c3' },
  ];
  if (adimIdx >= 1) {
    return [...temel, { tur: 'arrow', x1: 0.5, y1: 0.42, x2: 0.5, y2: 0.22, renk: '#fca5a5' }, { tur: 'label', x: 0.5, y: 0.16, metin: 'Bölgesel fark', renk: '#fde68a' }];
  }
  return temel;
}
const MAKINE_ANAHTAR = /basit makine|makara|palanga|kaldıraç|kaldirac|volan|eğik|egik düzlem|vida|cırcır|cırcir|kuvvet|newton|n\s*=/i;

function makineKonusuMu(ders?: string, konu?: string, metin?: string): boolean {
  return MAKINE_ANAHTAR.test(`${ders || ''} ${konu || ''} ${metin || ''}`);
}

function sabitMakaraSembolu(): CizimEleman[] {
  return [
    { tur: 'segment', x1: 0.32, y1: 0.2, x2: 0.68, y2: 0.2, renk: '#94a3b8' },
    { tur: 'circle', cx: 0.5, cy: 0.32, r: 0.09, renk: '#fde68a' },
    { tur: 'segment', x1: 0.41, y1: 0.32, x2: 0.41, y2: 0.7, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.59, y1: 0.32, x2: 0.59, y2: 0.5, renk: '#bae6fd' },
    { tur: 'segment', x1: 0.32, y1: 0.7, x2: 0.5, y2: 0.7, renk: '#fca5a5' },
    { tur: 'segment', x1: 0.5, y1: 0.7, x2: 0.5, y2: 0.56, renk: '#fca5a5' },
    { tur: 'segment', x1: 0.5, y1: 0.56, x2: 0.32, y2: 0.56, renk: '#fca5a5' },
    { tur: 'segment', x1: 0.32, y1: 0.56, x2: 0.32, y2: 0.7, renk: '#fca5a5' },
    { tur: 'label', x: 0.38, y: 0.78, metin: 'Yük (Y)', renk: '#fca5a5' },
    { tur: 'label', x: 0.62, y: 0.44, metin: 'F', renk: '#bae6fd' },
    { tur: 'arrow', x1: 0.59, y1: 0.48, x2: 0.59, y2: 0.38, renk: '#bae6fd' },
  ];
}

function varsayilanMakineCizimi(adimIdx: number, metin: string): CizimEleman[] {
  const sabit = /sabit|sabit makara/i.test(metin);
  const temel = sabitMakaraSembolu();

  if (adimIdx === 0) {
    return [
      ...temel,
      { tur: 'label', x: 0.5, y: 0.12, metin: sabit ? 'Sabit makara' : 'Basit makine', renk: '#fef9c3' },
    ];
  }
  if (adimIdx === 1) {
    return [
      ...temel,
      { tur: 'label', x: 0.5, y: 0.12, metin: sabit ? 'Sabit makara' : 'Basit makine', renk: '#fef9c3' },
      { tur: 'label', x: 0.72, y: 0.55, metin: 'F = ?', renk: '#bae6fd' },
      { tur: 'label', x: 0.22, y: 0.65, metin: 'Y = 40 N', renk: '#fca5a5' },
    ];
  }
  return [
    ...temel,
    { tur: 'label', x: 0.5, y: 0.12, metin: 'Sabit makara: F = Y', renk: '#fde68a' },
    { tur: 'label', x: 0.72, y: 0.55, metin: 'F = 40 N', renk: '#86efac' },
    { tur: 'label', x: 0.22, y: 0.65, metin: 'Y = 40 N', renk: '#fca5a5' },
    { tur: 'arrow', x1: 0.35, y1: 0.48, x2: 0.65, y2: 0.48, renk: '#fde68a' },
    { tur: 'label', x: 0.5, y: 0.44, metin: 'F = Y', renk: '#fde68a' },
  ];
}

function cevreKonusuMu(ders?: string, konu?: string, metin?: string): boolean {
  const birlesik = `${ders || ''} ${konu || ''} ${metin || ''}`;
  return /fen|sosyal|coğrafya|cografya/i.test(ders || '') && CEVRE_ANAHTAR.test(birlesik);
}

function pilSembolu(): CizimEleman[] {
  return [
    { tur: 'segment', x1: 0.42, y1: 0.48, x2: 0.58, y2: 0.48, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.58, y1: 0.48, x2: 0.58, y2: 0.62, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.58, y1: 0.62, x2: 0.42, y2: 0.62, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.42, y1: 0.62, x2: 0.42, y2: 0.48, renk: '#fef9c3' },
    { tur: 'segment', x1: 0.6, y1: 0.52, x2: 0.63, y2: 0.52, renk: '#fde68a' },
    { tur: 'segment', x1: 0.63, y1: 0.52, x2: 0.63, y2: 0.58, renk: '#fde68a' },
    { tur: 'segment', x1: 0.63, y1: 0.58, x2: 0.6, y2: 0.58, renk: '#fde68a' },
    { tur: 'label', x: 0.5, y: 0.55, metin: 'Pil', renk: '#fef9c3' },
  ];
}

function varsayilanCevreCizimi(adimIdx: number, metin: string): CizimEleman[] {
  const havaVurgu = /hava|kirlen|atmosfer|gaz/i.test(metin);
  const pil = pilSembolu();

  if (adimIdx === 0) {
    return [
      ...pil,
      { tur: 'label', x: 0.5, y: 0.32, metin: 'Atık pil → çevre', renk: '#bae6fd' },
    ];
  }

  if (adimIdx === 1) {
    return [
      ...pil,
      { tur: 'arrow', x1: 0.46, y1: 0.64, x2: 0.26, y2: 0.76, renk: '#86efac' },
      { tur: 'label', x: 0.2, y: 0.82, metin: 'Toprak ✓', renk: '#86efac' },
      { tur: 'arrow', x1: 0.54, y1: 0.64, x2: 0.74, y2: 0.76, renk: '#93c5fd' },
      { tur: 'label', x: 0.8, y: 0.82, metin: 'Su ✓', renk: '#93c5fd' },
      { tur: 'circle', cx: 0.22, cy: 0.78, r: 0.04, renk: '#86efac' },
      { tur: 'circle', cx: 0.78, cy: 0.78, r: 0.04, renk: '#93c5fd' },
    ];
  }

  return [
    ...pil,
    { tur: 'arrow', x1: 0.46, y1: 0.64, x2: 0.26, y2: 0.76, renk: '#86efac' },
    { tur: 'label', x: 0.2, y: 0.82, metin: 'Toprak ✓', renk: '#86efac' },
    { tur: 'arrow', x1: 0.54, y1: 0.64, x2: 0.74, y2: 0.76, renk: '#93c5fd' },
    { tur: 'label', x: 0.8, y: 0.82, metin: 'Su ✓', renk: '#93c5fd' },
    { tur: 'arrow', x1: 0.5, y1: 0.46, x2: 0.5, y2: 0.24, renk: havaVurgu ? '#fca5a5' : '#fde68a' },
    { tur: 'label', x: 0.5, y: 0.16, metin: havaVurgu ? 'Hava ✗' : 'Hava ?', renk: '#fca5a5' },
    { tur: 'segment', x1: 0.44, y1: 0.22, x2: 0.56, y2: 0.3, renk: '#fca5a5' },
    { tur: 'segment', x1: 0.56, y1: 0.22, x2: 0.44, y2: 0.3, renk: '#fca5a5' },
    { tur: 'label', x: 0.5, y: 0.36, metin: 'Doğrudan değil', renk: '#fca5a5' },
  ];
}

function fenDersMi(ders?: string): boolean {
  return /fen|fizik|kimya|biyoloji/i.test(ders || '');
}

export function veriMetni(veri: HataAciklaVeri): string {
  const adimMetin = (veri.tahtaAdimlari || [])
    .flatMap((a) => [a.baslik, ...(a.satirlar || [])])
    .join(' ');
  return [veri.neden, veri.neYapmali, veri.miniIpucu, adimMetin].join(' ');
}

export function cizimAdimiGetir(
  veri: HataAciklaVeri,
  adimIdx: number,
  ders?: string,
  konu?: string
): CizimEleman[] {
  const metin = veriMetni(veri);
  const birlesik = `${ders || ''} ${konu || ''} ${metin}`;

  const geometriSablonOncelikli =
    geometriDersMi(ders, konu) ||
    prizmaKonusuMu(ders, konu) ||
    /hipoten|üçgen|ucgen|makara|palanga|trigonometri/i.test(birlesik);

  if (!geometriSablonOncelikli) {
    const aiOnce = aiCizimKumulatif(veri, adimIdx);
    if (aiOnce.length) return aiOnce;
  }

  const sablon = sablonSecici(birlesik, ders, konu);
  if (sablon) return kumulatifElemanlar(adimIdx, sablon);

  const aiCizim = aiCizimKumulatif(veri, adimIdx);
  if (aiCizim.length) return aiCizim;

  return kumulatifElemanlar(adimIdx, varsayilanGenelCizimi);
}

export type AnlatimSegment =
  | { tur: 'giris'; metin: string }
  | { tur: 'baslik'; adimIdx: number; metin: string }
  | { tur: 'satir'; adimIdx: number; satirIdx: number; metin: string }
  | { tur: 'video'; adimIdx: number; metin: string; baslik?: string; formul?: string };

const HOLO_CIZGI = '#22d3ee';
const HOLO_ETIKET = '#e0f2fe';
const HOLO_VURGU = '#fde68a';

function videoBenzerlikCizimi(adimIdx: number): CizimEleman[] {
  const abc: CizimEleman[] = [
    { tur: 'triangle', noktalar: [0.5, 0.16, 0.2, 0.84, 0.8, 0.84], renk: HOLO_CIZGI },
    { tur: 'label', x: 0.5, y: 0.1, metin: 'A', renk: HOLO_ETIKET },
    { tur: 'label', x: 0.16, y: 0.88, metin: 'B', renk: HOLO_ETIKET },
    { tur: 'label', x: 0.84, y: 0.88, metin: 'C', renk: HOLO_ETIKET },
  ];
  if (adimIdx === 0) return abc;
  if (adimIdx === 1) {
    return [
      ...abc,
      { tur: 'segment', x1: 0.34, y1: 0.84, x2: 0.5, y2: 0.16, renk: '#67e8f9' },
      { tur: 'segment', x1: 0.66, y1: 0.84, x2: 0.5, y2: 0.16, renk: '#67e8f9' },
      { tur: 'label', x: 0.32, y: 0.86, metin: 'D', renk: HOLO_ETIKET },
      { tur: 'label', x: 0.68, y: 0.86, metin: 'E', renk: HOLO_ETIKET },
    ];
  }
  if (adimIdx === 2) {
    return [
      ...abc,
      { tur: 'segment', x1: 0.34, y1: 0.84, x2: 0.5, y2: 0.16, renk: '#67e8f9' },
      { tur: 'segment', x1: 0.66, y1: 0.84, x2: 0.5, y2: 0.16, renk: '#67e8f9' },
      { tur: 'label', x: 0.32, y: 0.86, metin: 'D', renk: HOLO_ETIKET },
      { tur: 'label', x: 0.68, y: 0.86, metin: 'E', renk: HOLO_ETIKET },
      { tur: 'label', x: 0.42, y: 0.72, metin: 'k', renk: HOLO_VURGU },
      { tur: 'label', x: 0.5, y: 0.52, metin: '2k', renk: HOLO_VURGU },
      { tur: 'label', x: 0.58, y: 0.72, metin: '3k', renk: HOLO_VURGU },
    ];
  }
  if (adimIdx === 3) {
    return [
      ...videoBenzerlikCizimi(2),
      { tur: 'segment', x1: 0.34, y1: 0.84, x2: 0.66, y2: 0.84, renk: '#38bdf8' },
      { tur: 'segment', x1: 0.42, y1: 0.5, x2: 0.58, y2: 0.5, renk: '#38bdf8' },
    ];
  }
  if (adimIdx === 4) {
    const alanKareleri: CizimEleman[] = [];
    const basX = 0.38;
    const basY = 0.58;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const x = basX + col * 0.08;
        const y = basY + row * 0.08;
        alanKareleri.push(
          { tur: 'segment', x1: x, y1: y, x2: x + 0.07, y2: y, renk: '#38bdf8' },
          { tur: 'segment', x1: x + 0.07, y1: y, x2: x + 0.07, y2: y + 0.07, renk: '#38bdf8' },
          { tur: 'segment', x1: x + 0.07, y1: y + 0.07, x2: x, y2: y + 0.07, renk: '#38bdf8' },
          { tur: 'segment', x1: x, y1: y + 0.07, x2: x, y2: y, renk: '#38bdf8' },
          { tur: 'label', x: x + 0.02, y: y + 0.04, metin: '4S', renk: '#86efac' }
        );
      }
    }
    return [
      ...videoBenzerlikCizimi(3),
      ...alanKareleri,
      { tur: 'label', x: 0.44, y: 0.52, metin: 'Alan Oranı: 4/9', renk: '#fde68a' },
    ];
  }
  return videoBenzerlikCizimi(4);
}

function videoTrigonometriCizimi(adimIdx: number): CizimEleman[] {
  return varsayilanTrigonometriCizimi(adimIdx).map((el) => ({
    ...el,
    renk: el.renk?.includes('#fef') ? HOLO_ETIKET : el.renk?.includes('#fde') ? HOLO_VURGU : HOLO_CIZGI,
  }));
}

/** Analitik geometri: koordinat eksenleri, çember, teğet, OT */
function videoAnalitikGeometriCizimi(adimIdx: number): CizimEleman[] {
  const ox = 0.3;
  const oy = 0.72;
  const tx = 0.52;
  const ty = 0.42;
  const r = 0.32;

  const eksenler: CizimEleman[] = [
    { tur: 'segment', x1: 0.12, y1: oy, x2: 0.88, y2: oy, renk: HOLO_CIZGI },
    { tur: 'segment', x1: ox, y1: 0.88, x2: ox, y2: 0.14, renk: HOLO_CIZGI },
    { tur: 'arrow', x1: 0.84, y1: oy, x2: 0.88, y2: oy, renk: HOLO_CIZGI },
    { tur: 'arrow', x1: ox, y1: 0.18, x2: ox, y2: 0.14, renk: HOLO_CIZGI },
    { tur: 'label', x: ox - 0.04, y: oy + 0.06, metin: 'O(0,0)', renk: HOLO_ETIKET },
    { tur: 'label', x: 0.9, y: oy + 0.02, metin: 'x', renk: HOLO_ETIKET },
    { tur: 'label', x: ox + 0.03, y: 0.1, metin: 'y', renk: HOLO_ETIKET },
  ];

  if (adimIdx === 0) return eksenler;

  if (adimIdx === 1) {
    return [
      ...eksenler,
      { tur: 'circle', cx: ox, cy: oy, r, renk: HOLO_CIZGI },
      { tur: 'label', x: 0.5, y: 0.2, metin: 'Çember', renk: HOLO_VURGU },
    ];
  }

  if (adimIdx === 2) {
    return [
      ...videoAnalitikGeometriCizimi(1),
      { tur: 'segment', x1: ox, y1: oy, x2: tx, y2: ty, renk: '#67e8f9' },
      { tur: 'label', x: tx + 0.04, y: ty - 0.04, metin: 'T(3,4)', renk: HOLO_ETIKET },
      { tur: 'label', x: 0.38, y: 0.54, metin: 'OT', renk: HOLO_VURGU },
    ];
  }

  if (adimIdx === 3) {
    return [
      ...videoAnalitikGeometriCizimi(2),
      { tur: 'segment', x1: 0.68, y1: 0.28, x2: 0.36, y2: 0.56, renk: '#f472b6' },
      { tur: 'label', x: 0.7, y: 0.24, metin: 'Teğet', renk: '#f9a8d4' },
    ];
  }

  if (adimIdx === 4) {
    return [
      ...videoAnalitikGeometriCizimi(3),
      { tur: 'dikAci', x: tx - 0.04, y: ty + 0.02, boy: 0.06, renk: '#fde68a' },
      { tur: 'label', x: 0.5, y: 0.12, metin: 'Teğet ⊥ yarıçap', renk: HOLO_VURGU },
    ];
  }

  return [
    ...videoAnalitikGeometriCizimi(4),
    { tur: 'label', x: 0.5, y: 0.08, metin: 'y - 4 = -(3/4)(x - 3)', renk: '#86efac' },
  ];
}

function varsayilanAnalitikGeometriCizimi(adimIdx: number): CizimEleman[] {
  return videoAnalitikGeometriCizimi(adimIdx).map((el) => ({
    ...el,
    renk: el.renk === HOLO_CIZGI ? '#bae6fd' : el.renk,
  }));
}

function analitikGeometriKonusuMu(birlesik: string): boolean {
  return /analitik|koordinat|teğet|teget|doğru denklem|dogru denklem|nokta[- ]?eğim|nokta[- ]?egim|merkez.*çember|cember.*merkez|eğim.*doğru|egim.*dogru/i.test(birlesik);
}

function videoSablonSecici(birlesik: string): ((adimIdx: number) => CizimEleman[]) | null {
  if (analitikGeometriKonusuMu(birlesik)) return videoAnalitikGeometriCizimi;
  if (/benzerlik|orant|oran|k\s*=\s*|2k|3k|alan oran/i.test(birlesik)) return videoBenzerlikCizimi;
  if (/trigonometri|sin|cos|tan/i.test(birlesik)) return videoTrigonometriCizimi;
  if (/üçgen|ucgen|geometri|açı|aci|hipoten/i.test(birlesik)) return varsayilanTrigonometriCizimi;
  return null;
}

function videoAdimlariUret(veri: HataAciklaVeri, ders?: string, konu?: string): VideoAdim[] {
  const birlesik = `${ders || ''} ${konu || ''} ${veriMetni(veri)}`;
  const sablon = videoSablonSecici(birlesik);

  if (/benzerlik|orant|alan oran|2k|3k/i.test(birlesik)) {
    return [
      { adimIdx: 0, baslik: 'Üçgeni kur', anlatim: 'Önce ABC üçgenini hologramda kuralım. A tepe, B ve C taban köşeleri.', formul: undefined },
      { adimIdx: 1, baslik: 'Yardımcı doğrular', anlatim: 'D ve E noktalarından A\'ya giden doğruları çizelim; benzerlik için yapı hazır.', formul: undefined },
      { adimIdx: 2, baslik: 'Kenar oranları', anlatim: 'Parçaları k, 2k ve 3k olarak etiketleyelim. Oranları karıştırmamaya dikkat.', formul: 'k : 2k : 3k' },
      { adimIdx: 3, baslik: 'Benzerlik', anlatim: 'Benzer üçgenlerde karşılıklı kenarlar orantılıdır.', formul: 'Benzerlik Oranı: 2k/3k = 2/3' },
      { adimIdx: 4, baslik: 'Alan oranı', anlatim: 'Benzerlik oranı k ise alan oranı k² olur. Küçük alan 4S, büyük alan 9S.', formul: 'Alan Oranı: (2/3)² = 4/9' },
      { adimIdx: 5, baslik: 'Sonuç', anlatim: veri.miniIpucu || 'Oranı bulduktan sonra istenen büyüklüğü hesapla.', formul: undefined },
    ];
  }

  if (analitikGeometriKonusuMu(birlesik)) {
    return [
      { adimIdx: 0, baslik: 'Koordinat düzlemi', anlatim: 'Önce x ve y eksenlerini çizelim; merkez O(0,0) noktası.', formul: undefined },
      { adimIdx: 1, baslik: 'Çember', anlatim: 'Merkezi O olan çemberi hologramda gösterelim.', formul: 'x² + y² = r²' },
      { adimIdx: 2, baslik: 'Teğet noktası', anlatim: 'T(3,4) noktası çember üzerinde; OT yarıçapını çizelim.', formul: undefined },
      { adimIdx: 3, baslik: 'Teğet doğrusu', anlatim: 'Teğet, yarıçapa T noktasında diktir. Teğet doğrusunu çizelim.', formul: 'm_teğet · m_yarıçap = -1' },
      { adimIdx: 4, baslik: 'Diklik', anlatim: 'Teğet ile yarıçap arasındaki dik açıyı işaretleyelim.', formul: undefined },
      { adimIdx: 5, baslik: 'Teğet denklemi', anlatim: veri.neYapmali || 'Nokta-eğim formülüyle teğet denklemini yaz.', formul: 'y - y₁ = m(x - x₁)' },
      { adimIdx: 6, baslik: 'Sonuç', anlatim: veri.miniIpucu || 'Denklemi sadeleştirip doğru şıkkı bul.', formul: undefined },
    ];
  }

  if (/trigonometri|sin|cos|tan/i.test(birlesik)) {
    return [
      { adimIdx: 0, baslik: 'Dik üçgen', anlatim: 'Trigonometride önce dik üçgeni çizelim ve açıyı işaretleyelim.', formul: undefined },
      { adimIdx: 1, baslik: 'Kenarlar', anlatim: 'Karşı, komşu ve hipotenüs kenarlarını ayırt edelim.', formul: 'sinθ = karşın/hip' },
      { adimIdx: 2, baslik: 'Oran seçimi', anlatim: 'Soruda hangi trigonometrik oran isteniyorsa onu kullan.', formul: 'cosθ = komşu/hip' },
      { adimIdx: 3, baslik: 'Hesap', anlatim: veri.neYapmali || 'Değerleri yerine koy ve doğru şıkkı bul.', formul: 'tanθ = karşın/komşu' },
      { adimIdx: 4, baslik: 'Kontrol', anlatim: veri.miniIpucu || 'Sonucu mantıklı mı diye kontrol et.', formul: undefined },
    ];
  }

  if (sablon) {
    return [
      { adimIdx: 0, baslik: '1. Adım', anlatim: veri.ogretmenSozu || veri.neden.slice(0, 120), formul: undefined },
      { adimIdx: 1, baslik: '2. Adım', anlatim: veri.neYapmali.slice(0, 140), formul: undefined },
      { adimIdx: 2, baslik: '3. Adım', anlatim: veri.miniIpucu.slice(0, 120), formul: undefined },
      { adimIdx: 3, baslik: '4. Adım', anlatim: 'Şimdi çözümü adım adım tamamlayalım.', formul: undefined },
    ];
  }

  return [
    { adimIdx: 0, baslik: 'Soruyu anla', anlatim: veri.neden, formul: undefined },
    { adimIdx: 1, baslik: 'Strateji', anlatim: veri.neYapmali, formul: undefined },
    { adimIdx: 2, baslik: 'İpucu', anlatim: veri.miniIpucu, formul: undefined },
  ];
}

export function videoModuAktif(veri: HataAciklaVeri): boolean {
  return Boolean(veri.videoAdimlari?.length);
}

export function videoAdimlariZenginlestir(veri: HataAciklaVeri, ders?: string, konu?: string): HataAciklaVeri {
  if (veri.videoAdimlari?.length) return veri;
  return { ...veri, videoAdimlari: videoAdimlariUret(veri, ders, konu) };
}

export function videoCizimGetir(
  veri: HataAciklaVeri,
  adimIdx: number,
  ders?: string,
  konu?: string
): CizimEleman[] {
  const birlesik = `${ders || ''} ${konu || ''} ${veriMetni(veri)}`;
  const adim = veri.videoAdimlari?.find((a) => a.adimIdx === adimIdx);
  if (veri.videoAdimlari?.some((a) => a.elemanlar?.length)) {
    const birlesik: CizimEleman[] = [];
    const anahtarlar = new Set<string>();
    for (let i = 0; i <= adimIdx; i++) {
      const kayit = veri.videoAdimlari?.find((a) => a.adimIdx === i);
      for (const raw of kayit?.elemanlar || []) {
        const el = aiElemanNormalize(raw);
        if (!el) continue;
        const key = JSON.stringify(el);
        if (anahtarlar.has(key)) continue;
        anahtarlar.add(key);
        birlesik.push(el);
      }
    }
    if (birlesik.length >= 2 && cizimGorselYeterliMi(birlesik)) return birlesik;
  }

  const aiAdim = veri.cizimAdimlari?.find((c) => c.adimIdx === adimIdx);
  if (aiAdim?.elemanlar?.length) {
    const ai = aiCizimKumulatif({ ...veri, cizimAdimlari: veri.cizimAdimlari }, adimIdx);
    if (ai.length) return ai;
  }

  const sablon = videoSablonSecici(birlesik) || sablonSecici(birlesik, ders, konu);
  if (sablon) return kumulatifElemanlar(adimIdx, sablon);

  return kumulatifElemanlar(adimIdx, varsayilanGenelCizimi);
}

export function anlatimSegmentleriOlustur(veri: HataAciklaVeri): AnlatimSegment[] {
  if (veri.videoAdimlari?.length) {
    const segmentler: AnlatimSegment[] = [];
    const giris = veri.ogretmenSozu?.trim();
    if (giris) segmentler.push({ tur: 'giris', metin: giris });
    veri.videoAdimlari.forEach((adim) => {
      segmentler.push({
        tur: 'video',
        adimIdx: adim.adimIdx,
        metin: adim.anlatim,
        baslik: adim.baslik,
        formul: adim.formul,
      });
    });
    return segmentler;
  }

  const adimlar = hataAciklaToTahtaAdimlari(veri);
  const segmentler: AnlatimSegment[] = [];
  const giris = veri.ogretmenSozu?.trim() || 'Şimdi tahtada birlikte hatayı inceleyelim.';
  segmentler.push({ tur: 'giris', metin: giris });
  adimlar.forEach((adim, adimIdx) => {
    if (adim.baslik) segmentler.push({ tur: 'baslik', adimIdx, metin: adim.baslik });
    adim.satirlar.forEach((satir, satirIdx) => {
      segmentler.push({ tur: 'satir', adimIdx, satirIdx, metin: satir });
    });
  });
  return segmentler;
}

export function segmentTahtaDurumu(segment: AnlatimSegment): { adimIdx: number; gorunenSatir: number } {
  if (segment.tur === 'giris') return { adimIdx: 0, gorunenSatir: 0 };
  if (segment.tur === 'video') return { adimIdx: segment.adimIdx, gorunenSatir: 1 };
  if (segment.tur === 'baslik') return { adimIdx: segment.adimIdx, gorunenSatir: 0 };
  return { adimIdx: segment.adimIdx, gorunenSatir: segment.satirIdx + 1 };
}
export function konuTipiGetir(ders?: string, konu?: string, metin?: string): 'makine' | 'cevre' | 'geometri' | 'genel' {
  const birlesik = `${ders || ''} ${konu || ''} ${metin || ''}`;
  if (/basit makine|makara|palanga|kaldıraç|kaldirac|kuvvet|newton/i.test(birlesik)) return 'makine';
  if (/pil|batarya|atık pil|atik pil|çevre kirl|cevre kirl/i.test(birlesik)) return 'cevre';
  if (/hipoten|üçgen|ucgen|geometri|prizma|açı|aci|çember|alan|trigonometri/i.test(birlesik)) return 'geometri';
  return 'genel';
}
