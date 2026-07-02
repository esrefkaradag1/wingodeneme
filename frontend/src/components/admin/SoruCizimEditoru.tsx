'use client';

/**
 * SoruCizimEditoru — vektör tabanlı zengin çizim editörü.
 * Her şekil bir nesnedir; canvas her render'da yeniden çizilir.
 * Bu sayede undo/redo, seçim/silme, yeniden boyutlandırma kolayca eklenir.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pencil, Eraser, Type, Square, Circle, Triangle, Minus, MoveRight,
  Undo2, Redo2, Trash2, Download, Grid3x3, Plus, Minus as MinusSign,
  Image as ImageIcon, MousePointer2,
} from 'lucide-react';

type Pt = { x: number; y: number };
type Renk = string;

type Sekil =
  | { id: string; tip: 'kalem'; noktalar: Pt[]; renk: Renk; kalinlik: number }
  | { id: string; tip: 'cizgi'; baslangic: Pt; bitis: Pt; renk: Renk; kalinlik: number }
  | { id: string; tip: 'ok'; baslangic: Pt; bitis: Pt; renk: Renk; kalinlik: number }
  | { id: string; tip: 'dikdortgen'; x: number; y: number; w: number; h: number; renk: Renk; dolgu?: Renk; kalinlik: number }
  | { id: string; tip: 'daire'; cx: number; cy: number; rx: number; ry: number; renk: Renk; dolgu?: Renk; kalinlik: number }
  | { id: string; tip: 'ucgen'; noktalar: [Pt, Pt, Pt]; renk: Renk; dolgu?: Renk; kalinlik: number }
  | { id: string; tip: 'metin'; x: number; y: number; metin: string; renk: Renk; boyut: number }
  | { id: string; tip: 'resim'; x: number; y: number; w: number; h: number; src: string; oran?: number };

type Arac = 'sec' | 'kalem' | 'silgi' | 'cizgi' | 'ok' | 'dikdortgen' | 'daire' | 'ucgen' | 'metin';
type ArkaPlan = 'bos' | 'kareli' | 'noktali' | 'koordinat';

const RENK_PALETI = [
  '#111827', '#e11d48', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7',
  '#06b6d4', '#ef4444', '#14b8a6', '#f97316', '#ffffff',
];

function yeniId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function sekilBBox(s: Sekil): { x: number; y: number; w: number; h: number } | null {
  switch (s.tip) {
    case 'resim':
    case 'dikdortgen':
      return { x: s.x, y: s.y, w: s.w, h: s.h };
    case 'daire':
      return {
        x: s.cx - Math.abs(s.rx),
        y: s.cy - Math.abs(s.ry),
        w: Math.abs(s.rx) * 2,
        h: Math.abs(s.ry) * 2,
      };
    case 'metin':
      return {
        x: s.x,
        y: s.y,
        w: Math.max(24, s.metin.length * s.boyut * 0.52),
        h: s.boyut * 1.25,
      };
    case 'ucgen': {
      const xs = s.noktalar.map((p) => p.x);
      const ys = s.noktalar.map((p) => p.y);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      };
    }
    case 'cizgi':
    case 'ok':
      return {
        x: Math.min(s.baslangic.x, s.bitis.x),
        y: Math.min(s.baslangic.y, s.bitis.y),
        w: Math.abs(s.bitis.x - s.baslangic.x) || 4,
        h: Math.abs(s.bitis.y - s.baslangic.y) || 4,
      };
    case 'kalem': {
      if (s.noktalar.length === 0) return null;
      const xs = s.noktalar.map((p) => p.x);
      const ys = s.noktalar.map((p) => p.y);
      const pad = s.kalinlik + 4;
      return {
        x: Math.min(...xs) - pad,
        y: Math.min(...ys) - pad,
        w: Math.max(...xs) - Math.min(...xs) + pad * 2,
        h: Math.max(...ys) - Math.min(...ys) + pad * 2,
      };
    }
    default:
      return null;
  }
}

function sekilTasi(s: Sekil, dx: number, dy: number): Sekil {
  if (s.tip === 'kalem')
    return { ...s, noktalar: s.noktalar.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  if (s.tip === 'cizgi' || s.tip === 'ok')
    return {
      ...s,
      baslangic: { x: s.baslangic.x + dx, y: s.baslangic.y + dy },
      bitis: { x: s.bitis.x + dx, y: s.bitis.y + dy },
    };
  if (s.tip === 'dikdortgen' || s.tip === 'resim' || s.tip === 'metin')
    return { ...s, x: s.x + dx, y: s.y + dy };
  if (s.tip === 'daire') return { ...s, cx: s.cx + dx, cy: s.cy + dy };
  if (s.tip === 'ucgen')
    return {
      ...s,
      noktalar: s.noktalar.map((p) => ({ x: p.x + dx, y: p.y + dy })) as [Pt, Pt, Pt],
    };
  return s;
}

interface Props {
  ilkPng?: string;
  onPngDegisti: (png: string | null) => void;
  yukseklik?: number;
}

export default function SoruCizimEditoru({ ilkPng, onPngDegisti, yukseklik = 380 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dosyaInputRef = useRef<HTMLInputElement | null>(null);
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const tasimaRef = useRef<{
    id: string;
    baslangicFare: Pt;
    baslangicSekil: Sekil;
  } | null>(null);

  const [arac, setArac] = useState<Arac>('kalem');
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [oranKilit, setOranKilit] = useState(true);
  const [assetVersiyon, setAssetVersiyon] = useState(0);
  const [renk, setRenk] = useState<Renk>('#111827');
  const [dolguAcik, setDolguAcik] = useState(false);
  const [dolguRengi, setDolguRengi] = useState<Renk>('#3b82f6');
  const [kalinlik, setKalinlik] = useState(3);
  const [yaziBoyut, setYaziBoyut] = useState(18);
  const [arkaPlan, setArkaPlan] = useState<ArkaPlan>('bos');

  // Şekil yığını + tarih (undo/redo)
  const [sekiller, setSekiller] = useState<Sekil[]>([]);
  const [redoYigin, setRedoYigin] = useState<Sekil[][]>([]);
  const [taslakSekil, setTaslakSekil] = useState<Sekil | null>(null);

  const cizimAktifRef = useRef(false);
  const baslangicNoktaRef = useRef<Pt | null>(null);

  // ── Canvas ölçüsü ve DPR ───────────────────────────────────────
  const canvasOlcuAyarla = useCallback(() => {
    const c = canvasRef.current;
    const cont = containerRef.current;
    if (!c || !cont) return;
    const cssW = cont.clientWidth || 640;
    const cssH = yukseklik;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.floor(cssW * dpr) || c.height !== Math.floor(cssH * dpr)) {
      c.width = Math.floor(cssW * dpr);
      c.height = Math.floor(cssH * dpr);
      c.style.height = `${cssH}px`;
      const ctx = c.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, [yukseklik]);

  useEffect(() => {
    canvasOlcuAyarla();
    const handler = () => { canvasOlcuAyarla(); cizdir(); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasOlcuAyarla]);

  // ── Arka plan çizimi ────────────────────────────────────────────
  const arkaPlanCiz = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    if (arkaPlan === 'bos') return;

    if (arkaPlan === 'kareli') {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      const adim = 24;
      for (let x = 0; x <= w; x += adim) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += adim) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      return;
    }
    if (arkaPlan === 'noktali') {
      ctx.fillStyle = '#cbd5e1';
      const adim = 22;
      for (let x = adim / 2; x < w; x += adim) {
        for (let y = adim / 2; y < h; y += adim) {
          ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      return;
    }
    if (arkaPlan === 'koordinat') {
      const cx = w / 2, cy = h / 2;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const adim = 24;
      for (let x = (cx % adim); x <= w; x += adim) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = (cy % adim); y <= h; y += adim) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      // Eksenler
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
      // Ok başları
      ctx.fillStyle = '#475569';
      ctx.beginPath(); ctx.moveTo(w, cy); ctx.lineTo(w - 8, cy - 4); ctx.lineTo(w - 8, cy + 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx - 4, 8); ctx.lineTo(cx + 4, 8); ctx.closePath(); ctx.fill();
    }
  };

  // ── Şekil çizimi ────────────────────────────────────────────────
  const sekilCiz = (ctx: CanvasRenderingContext2D, s: Sekil) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (s.tip === 'kalem') {
      ctx.strokeStyle = s.renk;
      ctx.lineWidth = s.kalinlik;
      ctx.beginPath();
      s.noktalar.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      return;
    }
    if (s.tip === 'cizgi' || s.tip === 'ok') {
      ctx.strokeStyle = s.renk; ctx.lineWidth = s.kalinlik;
      ctx.beginPath();
      ctx.moveTo(s.baslangic.x, s.baslangic.y);
      ctx.lineTo(s.bitis.x, s.bitis.y);
      ctx.stroke();
      if (s.tip === 'ok') {
        const dx = s.bitis.x - s.baslangic.x, dy = s.bitis.y - s.baslangic.y;
        const aci = Math.atan2(dy, dx);
        const okBoy = Math.max(8, s.kalinlik * 3);
        ctx.fillStyle = s.renk;
        ctx.beginPath();
        ctx.moveTo(s.bitis.x, s.bitis.y);
        ctx.lineTo(s.bitis.x - okBoy * Math.cos(aci - Math.PI / 6), s.bitis.y - okBoy * Math.sin(aci - Math.PI / 6));
        ctx.lineTo(s.bitis.x - okBoy * Math.cos(aci + Math.PI / 6), s.bitis.y - okBoy * Math.sin(aci + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
    if (s.tip === 'dikdortgen') {
      ctx.lineWidth = s.kalinlik;
      if (s.dolgu) { ctx.fillStyle = s.dolgu; ctx.globalAlpha = 0.35; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.globalAlpha = 1; }
      ctx.strokeStyle = s.renk; ctx.strokeRect(s.x, s.y, s.w, s.h);
      return;
    }
    if (s.tip === 'daire') {
      ctx.lineWidth = s.kalinlik;
      ctx.beginPath();
      ctx.ellipse(s.cx, s.cy, Math.abs(s.rx), Math.abs(s.ry), 0, 0, Math.PI * 2);
      if (s.dolgu) { ctx.fillStyle = s.dolgu; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = s.renk; ctx.stroke();
      return;
    }
    if (s.tip === 'ucgen') {
      ctx.lineWidth = s.kalinlik;
      ctx.beginPath();
      ctx.moveTo(s.noktalar[0].x, s.noktalar[0].y);
      ctx.lineTo(s.noktalar[1].x, s.noktalar[1].y);
      ctx.lineTo(s.noktalar[2].x, s.noktalar[2].y);
      ctx.closePath();
      if (s.dolgu) { ctx.fillStyle = s.dolgu; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = s.renk; ctx.stroke();
      return;
    }
    if (s.tip === 'metin') {
      ctx.fillStyle = s.renk;
      ctx.font = `${s.boyut}px 'Inter', system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      // beyaz halo
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(s.metin, s.x, s.y);
      ctx.fillText(s.metin, s.x, s.y);
      return;
    }
    if (s.tip === 'resim') {
      const img = imgCacheRef.current.get(s.id);
      if (img && img.complete && img.naturalWidth > 0) {
        try {
          ctx.drawImage(img, s.x, s.y, s.w, s.h);
        } catch {
          /* boş */
        }
      } else {
        ctx.strokeStyle = '#cbd5e1';
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(s.x, s.y, s.w, s.h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#64748b';
        ctx.font = '12px system-ui,sans-serif';
        ctx.fillText('Resim…', s.x + 8, s.y + Math.min(22, s.h / 2));
      }
    }
  };

  // ── Tüm sahneyi yeniden çiz ─────────────────────────────────────
  const cizdir = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const cssW = c.clientWidth, cssH = c.clientHeight;
    arkaPlanCiz(ctx, cssW, cssH);
    sekiller.forEach((s) => sekilCiz(ctx, s));
    if (taslakSekil) sekilCiz(ctx, taslakSekil);
    if (seciliId) {
      const s = sekiller.find((x) => x.id === seciliId);
      const bb = s ? sekilBBox(s) : null;
      if (bb) {
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4);
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekiller, taslakSekil, arkaPlan, seciliId, assetVersiyon]);

  useEffect(() => { cizdir(); }, [cizdir]);

  // ── İlk PNG (varsa) yükle: bir defalık background image olarak ekle ─
  useEffect(() => {
    if (!ilkPng) return;
    // ilkPng'yi background olarak değil, bilgi amaçlı ekleme dışında bırakıyoruz
    // (kullanıcı yeni çizimi sıfırdan yapıyor; öncesini kaybetmemek isterse manuel ekler)
  }, [ilkPng]);

  // ── PNG'yi parent'a yansıt ──────────────────────────────────────
  const pngVer = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    if (sekiller.length === 0) {
      onPngDegisti(null);
      return;
    }
    try {
      const png = c.toDataURL('image/png');
      onPngDegisti(png);
    } catch {
      onPngDegisti(null);
    }
  }, [sekiller, onPngDegisti]);

  useEffect(() => { pngVer(); }, [pngVer]);

  useEffect(() => {
    sekiller.forEach((s) => {
      if (s.tip !== 'resim') return;
      if (imgCacheRef.current.has(s.id)) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgCacheRef.current.set(s.id, img);
        setAssetVersiyon((v) => v + 1);
      };
      img.onerror = () => setAssetVersiyon((v) => v + 1);
      img.src = s.src;
    });
  }, [sekiller]);

  const seciliSekil = useMemo(
    () => (seciliId ? sekiller.find((s) => s.id === seciliId) : undefined),
    [sekiller, seciliId]
  );

  const guncelleSecili = (fn: (s: Sekil) => Sekil) => {
    if (!seciliId) return;
    setSekiller((esk) => esk.map((sh) => (sh.id === seciliId ? fn(sh) : sh)));
  };

  const seciliyiSil = () => {
    if (!seciliId) return;
    kayitTarihe();
    setSekiller((esk) => esk.filter((sh) => sh.id !== seciliId));
    setSeciliId(null);
  };

  const resimDosyaSecildi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f?.type.startsWith('image/')) {
      if (f) alert('Lütfen bir görsel dosyası seçin.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current;
        const cssW = c?.clientWidth || 640;
        const cssH = yukseklik;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const maxW = Math.min(cssW * 0.88, 560);
        if (w > maxW) {
          h = (h * maxW) / w;
          w = maxW;
        }
        const maxH = cssH * 0.78;
        if (h > maxH) {
          w = (w * maxH) / h;
          h = maxH;
        }
        const x = Math.max(6, (cssW - w) / 2);
        const y = Math.max(6, (cssH - h) / 2);
        const oran = w > 0 ? h / w : 1;
        kayitTarihe();
        const nid = yeniId();
        imgCacheRef.current.set(nid, img);
        setSekiller((eski) => [...eski, { id: nid, tip: 'resim', x, y, w, h, src, oran }]);
        setSeciliId(nid);
        setArac('sec');
        setAssetVersiyon((v) => v + 1);
      };
      img.src = src;
    };
    reader.readAsDataURL(f);
  };

  // ── Pointer olayları ────────────────────────────────────────────
  const noktaCoz = (e: React.PointerEvent): Pt => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = noktaCoz(e);

    if (arac === 'sec') {
      const idx = sekilUstunde(p);
      if (idx < 0) {
        setSeciliId(null);
        tasimaRef.current = null;
        cizimAktifRef.current = false;
        return;
      }
      const secilen = sekiller[idx];
      setSeciliId(secilen.id);
      kayitTarihe();
      tasimaRef.current = {
        id: secilen.id,
        baslangicFare: p,
        baslangicSekil: JSON.parse(JSON.stringify(secilen)) as Sekil,
      };
      cizimAktifRef.current = true;
      baslangicNoktaRef.current = p;
      return;
    }

    cizimAktifRef.current = true;
    baslangicNoktaRef.current = p;

    if (arac === 'kalem') {
      setTaslakSekil({ id: yeniId(), tip: 'kalem', noktalar: [p], renk, kalinlik });
      return;
    }
    if (arac === 'silgi') {
      // En üstteki şekli bul ve sil
      const idx = sekilUstunde(p);
      if (idx >= 0) {
        kayitTarihe();
        setSekiller((eski) => eski.filter((_, i) => i !== idx));
      }
      return;
    }
    if (arac === 'metin') {
      const metin = window.prompt('Metni yazın:', '');
      if (metin && metin.trim()) {
        kayitTarihe();
        setSekiller((eski) => [...eski, { id: yeniId(), tip: 'metin', x: p.x, y: p.y, metin: metin.trim(), renk, boyut: yaziBoyut }]);
      }
      cizimAktifRef.current = false;
      return;
    }
    // Geometrik şekiller — taslak başlat
    if (arac === 'cizgi' || arac === 'ok') {
      setTaslakSekil({ id: yeniId(), tip: arac, baslangic: p, bitis: p, renk, kalinlik });
    } else if (arac === 'dikdortgen') {
      setTaslakSekil({ id: yeniId(), tip: 'dikdortgen', x: p.x, y: p.y, w: 0, h: 0, renk, dolgu: dolguAcik ? dolguRengi : undefined, kalinlik });
    } else if (arac === 'daire') {
      setTaslakSekil({ id: yeniId(), tip: 'daire', cx: p.x, cy: p.y, rx: 0, ry: 0, renk, dolgu: dolguAcik ? dolguRengi : undefined, kalinlik });
    } else if (arac === 'ucgen') {
      setTaslakSekil({ id: yeniId(), tip: 'ucgen', noktalar: [p, p, p], renk, dolgu: dolguAcik ? dolguRengi : undefined, kalinlik });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!cizimAktifRef.current) return;
    const p = noktaCoz(e);

    const tr = tasimaRef.current;
    if (arac === 'sec' && tr) {
      const dx = p.x - tr.baslangicFare.x;
      const dy = p.y - tr.baslangicFare.y;
      setSekiller((esk) =>
        esk.map((sh) => (sh.id === tr.id ? sekilTasi(tr.baslangicSekil, dx, dy) : sh))
      );
      return;
    }

    const start = baslangicNoktaRef.current!;
    setTaslakSekil((eski) => {
      if (!eski) return eski;
      if (eski.tip === 'kalem') return { ...eski, noktalar: [...eski.noktalar, p] };
      if (eski.tip === 'cizgi' || eski.tip === 'ok') return { ...eski, bitis: p };
      if (eski.tip === 'dikdortgen') return { ...eski, x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
      if (eski.tip === 'daire') return { ...eski, cx: (start.x + p.x) / 2, cy: (start.y + p.y) / 2, rx: Math.abs(p.x - start.x) / 2, ry: Math.abs(p.y - start.y) / 2 };
      if (eski.tip === 'ucgen') {
        const top: Pt = { x: (start.x + p.x) / 2, y: start.y };
        const sol: Pt = { x: start.x, y: p.y };
        const sag: Pt = { x: p.x, y: p.y };
        return { ...eski, noktalar: [top, sol, sag] };
      }
      return eski;
    });
  };

  const onPointerUp = () => {
    if (arac === 'sec') {
      tasimaRef.current = null;
      cizimAktifRef.current = false;
      return;
    }
    if (!cizimAktifRef.current) return;
    cizimAktifRef.current = false;
    if (taslakSekil) {
      const ekle = taslakSekil;
      setTaslakSekil(null);
      // Sıfır boyutlu şekilleri ekleme
      const cokKucuk =
        (ekle.tip === 'cizgi' || ekle.tip === 'ok')
          ? Math.hypot(ekle.bitis.x - ekle.baslangic.x, ekle.bitis.y - ekle.baslangic.y) < 4
          : ekle.tip === 'dikdortgen' ? (ekle.w < 4 || ekle.h < 4)
          : ekle.tip === 'daire' ? (ekle.rx < 4 && ekle.ry < 4)
          : ekle.tip === 'ucgen' ? false
          : ekle.tip === 'kalem' ? ekle.noktalar.length < 2
          : false;
      if (!cokKucuk) {
        kayitTarihe();
        setSekiller((eski) => [...eski, ekle]);
      }
    }
  };

  // ── Şekil tıklama tespiti (silgi için) ─────────────────────────
  const sekilUstunde = (p: Pt): number => {
    for (let i = sekiller.length - 1; i >= 0; i--) {
      const s = sekiller[i];
      if (s.tip === 'kalem') {
        if (s.noktalar.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < 8)) return i;
      } else if (s.tip === 'cizgi' || s.tip === 'ok') {
        const d = noktaCizgiMesafesi(p, s.baslangic, s.bitis);
        if (d < 8) return i;
      } else if (s.tip === 'resim') {
        if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return i;
      } else if (s.tip === 'dikdortgen') {
        if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return i;
      } else if (s.tip === 'daire') {
        const dx = (p.x - s.cx) / Math.max(1, s.rx);
        const dy = (p.y - s.cy) / Math.max(1, s.ry);
        if (dx * dx + dy * dy <= 1) return i;
      } else if (s.tip === 'ucgen') {
        if (noktaUcgenIcinde(p, s.noktalar)) return i;
      } else if (s.tip === 'metin') {
        // Yaklaşık bbox
        if (p.x >= s.x && p.x <= s.x + s.metin.length * (s.boyut * 0.6) && p.y >= s.y && p.y <= s.y + s.boyut) return i;
      }
    }
    return -1;
  };

  // ── Geri al / İleri al ─────────────────────────────────────────
  const kayitTarihe = () => {
    setRedoYigin([]);
    // sekiller mevcut state olduğu için onu kayıt etmeye ihtiyaç yok; pop yaparken
    // kullanılan tarih yığını "öncekini geri yüklemek için" tutmalı.
    // Basit yaklaşım: undo yığınını sekiller'in snapshot'larıyla tut.
    // Burada geri alma için önceki sekiller listesini "redoYigin" değil, ayrı bir
    // history stack'e koymalıyız. Sade tutmak için sekiller'i dondurup tarihe koyuyoruz.
    setTarihYigin((t) => [...t.slice(-50), sekiller]);
  };
  const [tarihYigin, setTarihYigin] = useState<Sekil[][]>([]);
  const geriAl = () => {
    if (tarihYigin.length === 0) return;
    const onceki = tarihYigin[tarihYigin.length - 1];
    setRedoYigin((r) => [...r, sekiller]);
    setSekiller(onceki);
    setTarihYigin((t) => t.slice(0, -1));
  };
  const ileriAl = () => {
    if (redoYigin.length === 0) return;
    const sonraki = redoYigin[redoYigin.length - 1];
    setTarihYigin((t) => [...t, sekiller]);
    setSekiller(sonraki);
    setRedoYigin((r) => r.slice(0, -1));
  };

  const tumunuTemizle = () => {
    if (sekiller.length === 0) return;
    if (!confirm('Tüm çizimi silmek istiyor musun?')) return;
    kayitTarihe();
    setSekiller([]);
  };

  const pngIndir = () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `cizim-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch { /* yoksay */ }
  };

  // Klavye kısayolları
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); if (e.shiftKey) ileriAl(); else geriAl(); }
      if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); ileriAl(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarihYigin, redoYigin, sekiller]);

  const aracTuslari: { tip: Arac; ikon: typeof Pencil; etiket: string }[] = useMemo(() => ([
    { tip: 'sec',        ikon: MousePointer2, etiket: 'Seç / taşı' },
    { tip: 'kalem',      ikon: Pencil,    etiket: 'Kalem' },
    { tip: 'cizgi',      ikon: Minus,     etiket: 'Çizgi' },
    { tip: 'ok',         ikon: MoveRight, etiket: 'Ok' },
    { tip: 'dikdortgen', ikon: Square,    etiket: 'Dikdörtgen' },
    { tip: 'daire',      ikon: Circle,    etiket: 'Daire' },
    { tip: 'ucgen',      ikon: Triangle,  etiket: 'Üçgen' },
    { tip: 'metin',      ikon: Type,      etiket: 'Metin' },
    { tip: 'silgi',      ikon: Eraser,    etiket: 'Silgi' },
  ]), []);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Üst toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        {aracTuslari.map((a) => (
          <button
            key={a.tip}
            type="button"
            title={a.etiket}
            onClick={() => setArac(a.tip)}
            className={`p-2 rounded-lg transition ${arac === a.tip ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            <a.ikon className="w-4 h-4" />
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <input ref={dosyaInputRef} type="file" accept="image/*" className="hidden" onChange={resimDosyaSecildi} />
        <button
          type="button"
          title="Resim yükle"
          onClick={() => dosyaInputRef.current?.click()}
          className="p-2 rounded-lg bg-white text-gray-700 hover:bg-indigo-50 border border-indigo-200"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Renk paleti */}
        <div className="flex items-center gap-1">
          {RENK_PALETI.slice(0, 7).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setRenk(c)}
              title={c}
              className={`w-6 h-6 rounded-full border-2 ${renk === c ? 'border-gray-900' : 'border-gray-200'}`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={renk}
            onChange={(e) => setRenk(e.target.value)}
            className="w-7 h-7 p-0.5 rounded border border-gray-200 cursor-pointer"
            title="Özel renk"
          />
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Kalınlık */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-gray-200">
          <button type="button" onClick={() => setKalinlik((v) => Math.max(1, v - 1))} className="text-gray-500 hover:text-gray-900"><MinusSign className="w-3.5 h-3.5" /></button>
          <span className="text-xs font-bold w-5 text-center">{kalinlik}</span>
          <button type="button" onClick={() => setKalinlik((v) => Math.min(20, v + 1))} className="text-gray-500 hover:text-gray-900"><Plus className="w-3.5 h-3.5" /></button>
        </div>

        {/* Yazı boyutu (sadece metin aracında) */}
        {arac === 'metin' && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-gray-200">
            <span className="text-[10px] font-semibold text-gray-500">Tx</span>
            <input
              type="number" min={10} max={48}
              value={yaziBoyut}
              onChange={(e) => setYaziBoyut(Math.max(10, Math.min(48, Number(e.target.value) || 18)))}
              className="w-12 text-xs font-bold text-center outline-none"
            />
          </div>
        )}

        {/* Dolgu */}
        {(arac === 'dikdortgen' || arac === 'daire' || arac === 'ucgen') && (
          <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-gray-200 cursor-pointer">
            <input type="checkbox" checked={dolguAcik} onChange={(e) => setDolguAcik(e.target.checked)} />
            <span className="text-[10px] font-bold uppercase text-gray-500">Dolgu</span>
            {dolguAcik && (
              <input type="color" value={dolguRengi} onChange={(e) => setDolguRengi(e.target.value)} className="w-5 h-5 p-0 rounded" />
            )}
          </label>
        )}

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Arka plan */}
        <select
          value={arkaPlan}
          onChange={(e) => setArkaPlan(e.target.value as ArkaPlan)}
          className="text-xs px-2 py-1.5 rounded-lg bg-white border border-gray-200 outline-none"
          title="Arka plan"
        >
          <option value="bos">Boş</option>
          <option value="kareli">Kareli</option>
          <option value="noktali">Noktalı</option>
          <option value="koordinat">Koordinat</option>
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={geriAl} disabled={tarihYigin.length === 0} title="Geri al (Ctrl+Z)" className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40">
            <Undo2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={ileriAl} disabled={redoYigin.length === 0} title="İleri al (Ctrl+Shift+Z)" className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40">
            <Redo2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={pngIndir} title="PNG indir" className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100">
            <Download className="w-4 h-4" />
          </button>
          <button type="button" onClick={tumunuTemizle} title="Tümünü temizle" className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100">
            <Trash2 className="w-4 h-4" />
          </button>
          <span className="hidden md:inline-flex items-center gap-1 ml-2 text-[10px] font-semibold text-gray-400">
            <Grid3x3 className="w-3 h-3" /> {sekiller.length} şekil
          </span>
        </div>
      </div>

      {seciliSekil && (
        <div className="px-3 py-2 border-b border-gray-100 bg-indigo-50/50 flex flex-wrap gap-3 items-end">
          <div className="text-[11px] font-bold text-indigo-900 shrink-0">
            Seçili: <span className="uppercase">{seciliSekil.tip}</span>
          </div>

          {(seciliSekil.tip === 'resim' || seciliSekil.tip === 'dikdortgen') && (
            <>
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-600">
                Genişlik (px)
                <input
                  type="number"
                  min={16}
                  max={2000}
                  className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold"
                  value={Math.round(seciliSekil.w)}
                  onChange={(e) => {
                    const nw = Math.max(16, parseInt(e.target.value, 10) || 16);
                    guncelleSecili((s) => {
                      if (s.tip === 'dikdortgen') return { ...s, w: nw };
                      if (s.tip === 'resim') {
                        if (oranKilit && s.oran) return { ...s, w: nw, h: Math.max(16, Math.round(nw * s.oran)) };
                        return { ...s, w: nw };
                      }
                      return s;
                    });
                  }}
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-600">
                Yükseklik (px)
                <input
                  type="number"
                  min={16}
                  max={2000}
                  className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold"
                  value={Math.round(seciliSekil.h)}
                  onChange={(e) => {
                    const nh = Math.max(16, parseInt(e.target.value, 10) || 16);
                    guncelleSecili((s) => {
                      if (s.tip === 'dikdortgen') return { ...s, h: nh };
                      if (s.tip === 'resim') {
                        if (oranKilit && s.w > 0) return { ...s, h: nh, oran: nh / s.w };
                        return { ...s, h: nh };
                      }
                      return s;
                    });
                  }}
                />
              </label>
              {seciliSekil.tip === 'resim' && (
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" checked={oranKilit} onChange={(e) => setOranKilit(e.target.checked)} />
                  Oranı koru
                </label>
              )}
            </>
          )}

          {seciliSekil.tip === 'daire' && (
            <>
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-600">
                Yatay yarıçap
                <input
                  type="number"
                  min={4}
                  max={800}
                  className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold"
                  value={Math.round(seciliSekil.rx)}
                  onChange={(e) =>
                    guncelleSecili((s) =>
                      s.tip === 'daire' ? { ...s, rx: Math.max(4, parseInt(e.target.value, 10) || 4) } : s
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-600">
                Dikey yarıçap
                <input
                  type="number"
                  min={4}
                  max={800}
                  className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold"
                  value={Math.round(seciliSekil.ry)}
                  onChange={(e) =>
                    guncelleSecili((s) =>
                      s.tip === 'daire' ? { ...s, ry: Math.max(4, parseInt(e.target.value, 10) || 4) } : s
                    )
                  }
                />
              </label>
            </>
          )}

          {seciliSekil.tip === 'metin' && (
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-600">
              Yazı boyutu
              <input
                type="number"
                min={10}
                max={72}
                className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold"
                value={seciliSekil.boyut}
                onChange={(e) =>
                  guncelleSecili((s) =>
                    s.tip === 'metin'
                      ? {
                          ...s,
                          boyut: Math.max(10, Math.min(72, parseInt(e.target.value, 10) || 18)),
                        }
                      : s
                  )
                }
              />
            </label>
          )}

          {(seciliSekil.tip === 'kalem' ||
            seciliSekil.tip === 'cizgi' ||
            seciliSekil.tip === 'ok' ||
            seciliSekil.tip === 'dikdortgen' ||
            seciliSekil.tip === 'daire' ||
            seciliSekil.tip === 'ucgen') && (
            <label className="flex flex-col gap-0.5 text-[10px] font-semibold text-slate-600">
              Çizgi kalınlığı
              <input
                type="number"
                min={1}
                max={24}
                className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold"
                value={seciliSekil.kalinlik}
                onChange={(e) => {
                  const k = Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 3));
                  guncelleSecili((s) => ('kalinlik' in s ? { ...s, kalinlik: k } : s));
                }}
              />
            </label>
          )}

          <button
            type="button"
            onClick={seciliyiSil}
            className="ml-auto px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-bold hover:bg-rose-200"
          >
            Seçileni sil
          </button>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="bg-white">
        <canvas
          ref={canvasRef}
          className="w-full block touch-none cursor-crosshair"
          style={{ height: yukseklik }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}

// ── yardımcılar ────────────────────────────────────────────────
function noktaCizgiMesafesi(p: Pt, a: Pt, b: Pt): number {
  const A = p.x - a.x, B = p.y - a.y, C = b.x - a.x, D = b.y - a.y;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D || 1;
  let t = dot / lenSq;
  t = Math.max(0, Math.min(1, t));
  const xx = a.x + t * C, yy = a.y + t * D;
  return Math.hypot(p.x - xx, p.y - yy);
}

function noktaUcgenIcinde(p: Pt, ucgen: [Pt, Pt, Pt]): boolean {
  const [a, b, c] = ucgen;
  const d1 = isaret(p, a, b);
  const d2 = isaret(p, b, c);
  const d3 = isaret(p, c, a);
  const negVar = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const posVar = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(negVar && posVar);
}

function isaret(p1: Pt, p2: Pt, p3: Pt): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}
