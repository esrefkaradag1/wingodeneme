/** Küçük gerçek katılımı, sabit havuz (ör. 2000) üzerinden tahmini sıraya çevirir. */

export const SIRALAMA_HAVUZ_BOYUTU = 2000;

function ortalama(dizi: number[]): number {
  if (dizi.length === 0) return 0;
  return dizi.reduce((a, b) => a + b, 0) / dizi.length;
}

function stdSapma(dizi: number[], ort: number): number {
  if (dizi.length < 2) return Math.max(4, Math.abs(ort) * 0.2 || 4);
  const varyans = dizi.reduce((s, x) => s + (x - ort) ** 2, 0) / (dizi.length - 1);
  return Math.max(3, Math.sqrt(varyans));
}

/** Standart normal CDF yaklaşık (Abramowitz & Stegun) */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Yaklaşık normal quantile (probit) — üst sıralar için eşik net */
function normalQuantile(p: number): number {
  const clipped = Math.min(0.999, Math.max(0.001, p));
  // Beasley-Springer-Moro benzeri basit yaklaşım
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (clipped < pLow) {
    q = Math.sqrt(-2 * Math.log(clipped));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (clipped <= pHigh) {
    q = clipped - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - clipped));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

function clampSira(sira: number, havuz: number): number {
  return Math.max(1, Math.min(havuz, Math.round(sira)));
}

export type TahminiSiralamaSonuc = {
  sira: number;
  havuz: number;
  gercekKatilim: number;
  ortalamaNet: number;
  ogrenciNet: number;
  yuzdelik: number;
  /** Gösterim için 1–2–3 tahmini net eşikleri */
  ilkUc: Array<{ sira: number; tahminiNet: number }>;
};

/**
 * Gerçek katılanların net ortalaması / sapması ile öğrencinin skorunu
 * `havuz` kişilik (varsayılan 2000) dağılımda sıraya çevirir.
 */
export function tahminiSiralamaHesapla(
  ogrenciNet: number,
  katilimNetleri: number[],
  havuz: number = SIRALAMA_HAVUZ_BOYUTU,
): TahminiSiralamaSonuc | null {
  if (!Number.isFinite(ogrenciNet) || katilimNetleri.length === 0) return null;

  const nets = katilimNetleri.filter((n) => Number.isFinite(n));
  if (nets.length === 0) return null;

  const ort = ortalama(nets);
  const std = stdSapma(nets, ort);
  const z = (ogrenciNet - ort) / std;
  const p = normalCdf(z); // skorundan düşük veya eşit olma olasılığı
  const sira = clampSira(havuz * (1 - p) + 0.5, havuz);
  const yuzdelik = parseFloat(((1 - (sira - 1) / havuz) * 100).toFixed(1));

  const ilkUc = [1, 2, 3].map((r) => {
    const hedefP = 1 - (r - 0.5) / havuz;
    const net = ort + normalQuantile(hedefP) * std;
    return { sira: r, tahminiNet: parseFloat(net.toFixed(2)) };
  });

  return {
    sira,
    havuz,
    gercekKatilim: nets.length,
    ortalamaNet: parseFloat(ort.toFixed(2)),
    ogrenciNet: parseFloat(ogrenciNet.toFixed(2)),
    yuzdelik,
    ilkUc,
  };
}
