/** Tahta sağ yarısı: normalize 0–1 → tahta yerel 3D (metre) */
export function normToBoard3D(
  nx: number,
  ny: number,
  boardW: number,
  boardH: number,
  z = 0.14
): [number, number, number] {
  const x = -boardW / 2 + boardW * 0.54 + nx * boardW * 0.42;
  const y = boardH * 0.46 - ny * boardH * 0.82;
  return [x, y, z];
}

export function segmentOran(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  oran: number,
  boardW: number,
  boardH: number
): [[number, number, number], [number, number, number]] {
  const a = normToBoard3D(x1, y1, boardW, boardH);
  const b = normToBoard3D(x2, y2, boardW, boardH);
  const t = Math.min(1, Math.max(0, oran));
  return [a, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2]]];
}
