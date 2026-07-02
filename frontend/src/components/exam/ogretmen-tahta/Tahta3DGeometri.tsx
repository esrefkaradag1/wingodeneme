'use client';

import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import type { CizimEleman } from '@/lib/hataAciklaTahta';
import { normToBoard3D, segmentOran } from '@/lib/tahta3DKoordinat';

const TEBeŞIR = '#fffef0';

function elemanOran(i: number, toplam: number, progress: number): number {
  const bas = i / toplam;
  const bit = (i + 1) / toplam;
  if (progress <= bas) return 0;
  return Math.min(1, (progress - bas) / Math.max(0.08, bit - bas));
}

function Segment3D({
  x1,
  y1,
  x2,
  y2,
  renk,
  oran,
  boardW,
  boardH,
  hologram,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  renk?: string;
  oran: number;
  boardW: number;
  boardH: number;
  hologram?: boolean;
}) {
  if (oran <= 0) return null;
  const [a, b] = segmentOran(x1, y1, x2, y2, oran, boardW, boardH);
  const renkVal = renk || (hologram ? '#22d3ee' : TEBeŞIR);
  return (
    <Line
      points={[a, b]}
      color={renkVal}
      lineWidth={hologram ? 5 : 3.5}
      transparent
      opacity={hologram ? 0.95 : 1}
    />
  );
}

function Ok3D({
  x1,
  y1,
  x2,
  y2,
  renk,
  oran,
  boardW,
  boardH,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  renk?: string;
  oran: number;
  boardW: number;
  boardH: number;
}) {
  if (oran <= 0) return null;
  const [a, b] = segmentOran(x1, y1, x2, y2, oran, boardW, boardH);
  const renkVal = renk || TEBeŞIR;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const angle = Math.atan2(dy, dx);
  return (
    <group>
      <Line points={[a, b]} color={renkVal} lineWidth={3.5} />
      {oran > 0.85 && (
        <mesh position={b} rotation={[0, 0, angle - Math.PI / 2]}>
          <coneGeometry args={[0.045, 0.12, 8]} />
          <meshStandardMaterial color={renkVal} emissive={renkVal} emissiveIntensity={0.25} />
        </mesh>
      )}
    </group>
  );
}

function Cember3D({
  cx,
  cy,
  r,
  renk,
  oran,
  boardW,
  boardH,
}: {
  cx: number;
  cy: number;
  r: number;
  renk?: string;
  oran: number;
  boardW: number;
  boardH: number;
}) {
  if (oran <= 0) return null;
  const p = normToBoard3D(cx, cy, boardW, boardH, 0.16);
  const radius = r * Math.min(boardW, boardH) * 0.95;
  const renkVal = renk || '#c4b5fd';
  return (
    <mesh position={p} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.018, 10, 48, Math.PI * 2 * Math.min(1, oran)]} />
      <meshStandardMaterial color={renkVal} emissive={renkVal} emissiveIntensity={0.2} />
    </mesh>
  );
}

function Etiket3D({
  x,
  y,
  metin,
  renk,
  oran,
  boardW,
  boardH,
}: {
  x: number;
  y: number;
  metin: string;
  renk?: string;
  oran: number;
  boardW: number;
  boardH: number;
}) {
  if (oran < 0.82) return null;
  const p = normToBoard3D(x, y, boardW, boardH, 0.2);
  return (
    <Html position={p} center distanceFactor={5.5} style={{ pointerEvents: 'none' }}>
      <span
        style={{
          color: renk || TEBeŞIR,
          fontWeight: 700,
          fontSize: '15px',
          fontFamily: 'Georgia, serif',
          textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        {metin}
      </span>
    </Html>
  );
}

function Eleman3D({
  el,
  oran,
  boardW,
  boardH,
  hologram,
}: {
  el: CizimEleman;
  oran: number;
  boardW: number;
  boardH: number;
  hologram?: boolean;
}) {
  switch (el.tur) {
    case 'segment':
      return (
        <Segment3D
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          renk={el.renk}
          oran={oran}
          boardW={boardW}
          boardH={boardH}
          hologram={hologram}
        />
      );
    case 'arrow':
      return (
        <Ok3D
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          renk={el.renk}
          oran={oran}
          boardW={boardW}
          boardH={boardH}
        />
      );
    case 'circle':
      return (
        <Cember3D
          cx={el.cx}
          cy={el.cy}
          r={el.r}
          renk={el.renk}
          oran={oran}
          boardW={boardW}
          boardH={boardH}
        />
      );
    case 'label':
      return (
        <Etiket3D
          x={el.x}
          y={el.y}
          metin={el.metin}
          renk={el.renk}
          oran={oran}
          boardW={boardW}
          boardH={boardH}
        />
      );
    case 'triangle': {
      const [x1, y1, x2, y2, x3, y3] = el.noktalar;
      return (
        <group>
          <Segment3D x1={x1} y1={y1} x2={x2} y2={y2} renk={el.renk} oran={oran} boardW={boardW} boardH={boardH} />
          {oran > 0.35 && (
            <Segment3D
              x1={x2}
              y1={y2}
              x2={x3}
              y2={y3}
              renk={el.renk}
              oran={Math.min(1, (oran - 0.35) / 0.65)}
              boardW={boardW}
              boardH={boardH}
            />
          )}
          {oran > 0.7 && (
            <Segment3D
              x1={x3}
              y1={y3}
              x2={x1}
              y2={y1}
              renk={el.renk}
              oran={Math.min(1, (oran - 0.7) / 0.3)}
              boardW={boardW}
              boardH={boardH}
            />
          )}
        </group>
      );
    }
    case 'angle':
      return (
        <group>
          <Segment3D x1={el.vx} y1={el.vy} x2={el.x1} y2={el.y1} renk={TEBeŞIR} oran={oran} boardW={boardW} boardH={boardH} />
          <Segment3D x1={el.vx} y1={el.vy} x2={el.x2} y2={el.y2} renk={TEBeŞIR} oran={oran} boardW={boardW} boardH={boardH} />
          {el.etiket && oran > 0.88 && (
            <Etiket3D x={el.vx} y={el.vy - 0.06} metin={el.etiket} renk={el.renk} oran={1} boardW={boardW} boardH={boardH} />
          )}
        </group>
      );
    case 'dikAci': {
      const b = el.boy ?? 0.08;
      return (
        <group>
          <Segment3D x1={el.x} y1={el.y} x2={el.x + b} y2={el.y} renk={el.renk} oran={oran} boardW={boardW} boardH={boardH} />
          {oran > 0.5 && (
            <Segment3D
              x1={el.x + b}
              y1={el.y}
              x2={el.x + b}
              y2={el.y - b}
              renk={el.renk}
              oran={Math.min(1, (oran - 0.5) * 2)}
              boardW={boardW}
              boardH={boardH}
            />
          )}
        </group>
      );
    }
    default:
      return null;
  }
}

/** Sabit makara — ekstra 3D derinlik */
export function Makara3D({ progress }: { progress: number }) {
  if (progress < 0.15) return null;
  return (
    <group position={[0.15, 0.05, 0.22]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.035, 12, 32]} />
        <meshStandardMaterial color="#fde68a" metalness={0.35} roughness={0.4} emissive="#fde68a" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.5} />
      </mesh>
    </group>
  );
}

/** Atık pil — 3D kutu modeli */
export function Pil3D({ progress }: { progress: number }) {
  if (progress < 0.1) return null;
  const s = Math.min(1, progress * 1.2);
  return (
    <group position={[0.05, -0.05, 0.25]} scale={[s, s, s]}>
      <mesh>
        <boxGeometry args={[0.32, 0.48, 0.18]} />
        <meshStandardMaterial color="#475569" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0.18, 0.02, 0]}>
        <boxGeometry args={[0.05, 0.14, 0.1]} />
        <meshStandardMaterial color="#fde68a" metalness={0.6} emissive="#fde68a" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

export default function Tahta3DGeometri({
  elemanlar,
  progress,
  boardW,
  boardH,
  konuTipi,
  hologram = false,
}: {
  elemanlar: CizimEleman[];
  progress: number;
  boardW: number;
  boardH: number;
  konuTipi?: 'makine' | 'cevre' | 'geometri' | 'genel';
  hologram?: boolean;
}) {
  const toplam = Math.max(1, elemanlar.length);

  const elemanNodes = useMemo(
    () =>
      elemanlar.map((el, i) => (
        <Eleman3D key={`${i}-${JSON.stringify(el).slice(0, 40)}`} el={el} oran={elemanOran(i, toplam, progress)} boardW={boardW} boardH={boardH} hologram={hologram} />
      )),
    [elemanlar, toplam, progress, boardW, boardH]
  );

  return (
    <group>
      {!hologram && konuTipi === 'makine' && <Makara3D progress={progress} />}
      {!hologram && konuTipi === 'cevre' && <Pil3D progress={progress} />}
      {elemanNodes}
    </group>
  );
}
