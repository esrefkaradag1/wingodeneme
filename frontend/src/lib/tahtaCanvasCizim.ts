import type { CizimEleman, TahtaAdim } from '@/lib/hataAciklaTahta';

const TEBeŞIR = '#fef9c3';
const TEBeŞIR_SOLUK = 'rgba(254,249,195,0.55)';

function normToCanvas(nx: number, ny: number, w: number, h: number) {
  return {
    x: w * 0.56 + nx * (w * 0.38),
    y: h * 0.14 + ny * (h * 0.72),
  };
}

function tebeşirStil(ctx: CanvasRenderingContext2D, renk = TEBeŞIR, kalin = 3.5) {
  ctx.strokeStyle = renk;
  ctx.fillStyle = renk;
  ctx.lineWidth = kalin;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,255,255,0.25)';
  ctx.shadowBlur = 3;
}

function cizgi(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  renk?: string,
  oran = 1
) {
  const a = normToCanvas(x1, y1, w, h);
  const b = normToCanvas(x2, y2, w, h);
  const bx = a.x + (b.x - a.x) * Math.min(1, Math.max(0, oran));
  const by = a.y + (b.y - a.y) * Math.min(1, Math.max(0, oran));
  tebeşirStil(ctx, renk);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function etiket(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  x: number,
  y: number,
  metin: string,
  renk = TEBeŞIR
) {
  const p = normToCanvas(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillStyle = renk;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(metin, p.x, p.y);
}

function aciCiz(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  el: Extract<CizimEleman, { tur: 'angle' }>,
  oran: number
) {
  cizgi(ctx, w, h, el.vx, el.vy, el.x1, el.y1, TEBeŞIR, oran);
  cizgi(ctx, w, h, el.vx, el.vy, el.x2, el.y2, TEBeŞIR, oran);
  if (oran < 0.55) return;

  const k = normToCanvas(el.vx, el.vy, w, h);
  const p1 = normToCanvas(el.x1, el.y1, w, h);
  const p2 = normToCanvas(el.x2, el.y2, w, h);
  const a1 = Math.atan2(p1.y - k.y, p1.x - k.x);
  const a2 = Math.atan2(p2.y - k.y, p2.x - k.x);
  let bas = a1;
  let bit = a2;
  if (bit < bas) bit += Math.PI * 2;
  if (bit - bas > Math.PI) [bas, bit] = [bit, bas + Math.PI * 2];
  const r = 28;
  const arcOran = Math.min(1, (oran - 0.55) / 0.45);
  const son = bas + (bit - bas) * arcOran;
  tebeşirStil(ctx, el.renk || '#fca5a5', 2.5);
  ctx.beginPath();
  ctx.arc(k.x, k.y, r, bas, son);
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (el.etiket && oran > 0.88) {
    const t = (bas + son) / 2;
    etiket(ctx, w, h, el.vx + Math.cos(t) * 0.08, el.vy + Math.sin(t) * 0.08, el.etiket, el.renk || '#fca5a5');
  }
}

function elemanCiz(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  el: CizimEleman,
  oran: number
) {
  if (oran <= 0) return;

  switch (el.tur) {
    case 'segment':
      cizgi(ctx, w, h, el.x1, el.y1, el.x2, el.y2, el.renk, oran);
      break;
    case 'angle':
      aciCiz(ctx, w, h, el, oran);
      break;
    case 'triangle': {
      const [x1, y1, x2, y2, x3, y3] = el.noktalar;
      cizgi(ctx, w, h, x1, y1, x2, y2, el.renk, oran);
      if (oran > 0.35) cizgi(ctx, w, h, x2, y2, x3, y3, el.renk, Math.min(1, (oran - 0.35) / 0.65));
      if (oran > 0.7) cizgi(ctx, w, h, x3, y3, x1, y1, el.renk, Math.min(1, (oran - 0.7) / 0.3));
      break;
    }
    case 'circle': {
      const m = normToCanvas(el.cx, el.cy, w, h);
      const r = el.r * Math.min(w, h) * 0.34;
      tebeşirStil(ctx, el.renk || '#c4b5fd', 2.5);
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2 * Math.min(1, oran));
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case 'arrow': {
      cizgi(ctx, w, h, el.x1, el.y1, el.x2, el.y2, el.renk, oran);
      if (oran > 0.88) {
        const a = normToCanvas(el.x1, el.y1, w, h);
        const b = normToCanvas(el.x2, el.y2, w, h);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const s = 12;
        tebeşirStil(ctx, el.renk || TEBeŞIR, 2.5);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - s * Math.cos(ang - 0.45), b.y - s * Math.sin(ang - 0.45));
        ctx.lineTo(b.x - s * Math.cos(ang + 0.45), b.y - s * Math.sin(ang + 0.45));
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      break;
    }
    case 'dikAci': {
      const b = el.boy ?? 0.08;
      cizgi(ctx, w, h, el.x, el.y, el.x + b, el.y, el.renk || '#fef08a', oran);
      if (oran > 0.5) cizgi(ctx, w, h, el.x + b, el.y, el.x + b, el.y - b, el.renk || '#fef08a', Math.min(1, (oran - 0.5) * 2));
      break;
    }
    case 'label':
      if (oran > 0.82) etiket(ctx, w, h, el.x, el.y, el.metin, el.renk);
      break;
  }
}

export function tahtaMetinCiz(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  adim: TahtaAdim,
  gorunenSatirSayisi: number
) {
  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#2d6a4f');
  gradient.addColorStop(0.5, '#1b5e40');
  gradient.addColorStop(1, '#145a32');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let y = 48; y < h; y += 42) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(w * 0.5, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.52, 16);
  ctx.lineTo(w * 0.52, h - 16);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Georgia, serif';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.fillText(adim.baslik, 28, 28);
  ctx.shadowBlur = 0;

  const baslikNorm = adim.baslik.replace(/^\d+\.\s*/, '').trim().toLowerCase();
  const gorunenSatirlar = adim.satirlar.filter((satir) => {
    const satirNorm = satir.replace(/^\d+\.\s*/, '').trim().toLowerCase();
    if (!satirNorm) return false;
    return satirNorm !== baslikNorm && !baslikNorm.includes(satirNorm) && !satirNorm.includes(baslikNorm);
  });

  ctx.font = '23px Georgia, serif';
  ctx.fillStyle = '#f0fdf4';
  gorunenSatirlar.slice(0, gorunenSatirSayisi).forEach((satir, i) => {
    const metin = satir.length > 58 ? `${satir.slice(0, 55)}…` : satir;
    ctx.fillText(`• ${metin}`, 32, 84 + i * 44);
  });

  ctx.strokeStyle = 'rgba(254,249,195,0.45)';
  ctx.strokeRect(w * 0.545, h * 0.08, w * 0.42, h * 0.84);
}

export function tahtaCanvasCiz(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  adim: TahtaAdim,
  gorunenSatirSayisi: number,
  elemanlar: CizimEleman[],
  cizimProgress: number,
  altMetin?: string
) {
  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#245a42');
  gradient.addColorStop(0.55, '#1a4533');
  gradient.addColorStop(1, '#163628');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let y = 48; y < h; y += 42) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(w * 0.5, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.52, 16);
  ctx.lineTo(w * 0.52, h - 16);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(adim.baslik, 28, 28);

  const baslikNorm = adim.baslik.replace(/^\d+\.\s*/, '').trim().toLowerCase();
  const gorunenSatirlar = adim.satirlar.filter((satir) => {
    const satirNorm = satir.replace(/^\d+\.\s*/, '').trim().toLowerCase();
    if (!satirNorm) return false;
    return satirNorm !== baslikNorm && !baslikNorm.includes(satirNorm) && !satirNorm.includes(baslikNorm);
  });

  ctx.font = '22px Georgia, serif';
  ctx.fillStyle = 'rgba(245,250,255,0.93)';
  gorunenSatirlar.slice(0, gorunenSatirSayisi).forEach((satir, i) => {
    const metin = satir.length > 58 ? `${satir.slice(0, 55)}…` : satir;
    ctx.fillText(`• ${metin}`, 32, 82 + i * 44);
  });

  ctx.strokeStyle = TEBeŞIR_SOLUK;
  ctx.strokeRect(w * 0.545, h * 0.1, w * 0.42, h * 0.8);

  const toplam = Math.max(1, elemanlar.length);
  elemanlar.forEach((el, i) => {
    const bas = i / toplam;
    const bit = (i + 1) / toplam;
    if (cizimProgress <= bas) return;
    const oran = Math.min(1, (cizimProgress - bas) / Math.max(0.08, bit - bas));
    elemanCiz(ctx, w, h, el, oran);
  });

  if (altMetin && /[=+\-×x*/0-9]/.test(altMetin)) {
    ctx.shadowBlur = 0;
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const kisa = altMetin.length > 55 ? `${altMetin.slice(0, 52)}…` : altMetin;
    ctx.fillText(kisa, w * 0.76, h - 24);
  }
}
