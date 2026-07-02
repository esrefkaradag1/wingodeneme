'use client';

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const KAYIT_GENISLIK = 1280;
export const KAYIT_YUKSEKLIK = 720;

function TahtaDoku() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1920;
    c.height = 1080;
    const ctx = c.getContext('2d');
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 1080);
      g.addColorStop(0, '#0c1929');
      g.addColorStop(1, '#162032');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.moveTo(100 + i * 90, 60);
        ctx.bezierCurveTo(200 + i * 80, 400, 50 + i * 100, 700, 150 + i * 85, 1000);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.font = 'italic 42px Georgia, serif';
      ['A₁ = ½ab·sinC', 'a² + b² = c²', 'k : 2k : 3k', 'Benzerlik: a/b = c/d', 'Alan = k²·S'].forEach((f, i) => {
        ctx.fillText(f, 80 + (i % 2) * 820, 120 + Math.floor(i / 2) * 160);
      });
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, 1860, 1020);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  return (
    <mesh position={[0, 2.1, -4.8]}>
      <planeGeometry args={[16, 7.5]} />
      <meshStandardMaterial map={tex} emissive="#0c4a6e" emissiveIntensity={0.18} />
    </mesh>
  );
}

function SinifDuvarlari() {
  return (
    <group>
      <mesh position={[0, 1.5, -5.5]} rotation={[0, 0, 0]}>
        <planeGeometry args={[22, 8]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>
      <mesh position={[-6, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[6, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

function SinifMobilya() {
  const masalar: [number, number, number][] = [
    [-3.8, -0.55, -2.2], [-3.8, -0.55, -0.3], [-3.8, -0.55, 1.6],
    [3.8, -0.55, -2.2], [3.8, -0.55, -0.3], [3.8, -0.55, 1.6],
  ];
  return (
    <group>
      {masalar.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 0.38, 0]} castShadow>
            <boxGeometry args={[1.2, 0.07, 0.75]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.18, 0.24]}>
            <boxGeometry args={[0.5, 0.38, 0.05]} />
            <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={0.2} metalness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PencereIsigi() {
  return (
    <group position={[-5.8, 1.4, 0]}>
      <mesh>
        <planeGeometry args={[2.8, 4.2]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#bae6fd" emissiveIntensity={0.55} transparent opacity={0.35} />
      </mesh>
      <pointLight position={[1, 0, 2]} intensity={2.5} color="#f0f9ff" distance={12} />
    </group>
  );
}

function TavanIsiklari() {
  return (
    <group position={[0, 3.6, -0.5]}>
      {[-3, -1, 1, 3].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, 10]} />
          <meshStandardMaterial color="#a5f3fc" emissive="#22d3ee" emissiveIntensity={1.5} />
        </mesh>
      ))}
      <pointLight position={[0, 2.5, 1]} intensity={1.8} color="#e0f2fe" distance={10} />
    </group>
  );
}

function HologramIsini({ progress }: { progress: number }) {
  const s = Math.min(1, progress * 1.2);
  return (
    <group scale={[s, s, s]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.55, 1.6, 32, 1, true]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={0.9}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.04, 0]}>
        <ringGeometry args={[0.7, 1.15, 6]} />
        <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={1.1} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function HudCerceve() {
  const c = '#22d3ee';
  const kose = (px: number, py: number, rx: number, ry: number) => (
    <group position={[px, py, 0.5]}>
      <mesh position={[0, ry * 0.5, 0]}>
        <boxGeometry args={[0.04, ry, 0.02]} />
        <meshBasicMaterial color={c} transparent opacity={0.7} />
      </mesh>
      <mesh position={[rx * 0.5, 0, 0]}>
        <boxGeometry args={[rx, 0.04, 0.02]} />
        <meshBasicMaterial color={c} transparent opacity={0.7} />
      </mesh>
    </group>
  );
  return (
    <group>
      {kose(-1.1, 0.9, 0.5, 0.35)}
      {kose(1.1, 0.9, -0.5, 0.35)}
      {kose(-1.1, -0.5, 0.5, -0.35)}
      {kose(1.1, -0.5, -0.5, -0.35)}
    </group>
  );
}

export function FormulaPanel3D({ formul }: { formul?: string }) {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 200;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, tex: t };
  }, []);

  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 800, 200);
    if (!formul?.trim()) {
      tex.needsUpdate = true;
      return;
    }
    const grad = ctx.createLinearGradient(0, 0, 800, 0);
    grad.addColorStop(0, 'rgba(8, 47, 73, 0.92)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.88)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(10, 10, 780, 180, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('FORMÜL', 28, 48);
    ctx.fillStyle = '#f0f9ff';
    ctx.font = '600 28px Georgia, serif';
    ctx.fillText(formul.slice(0, 42), 28, 110);
    tex.needsUpdate = true;
  }, [formul, canvas, tex]);

  if (!formul?.trim()) return null;

  return (
    <mesh position={[-1.85, 1.15, 0.55]} renderOrder={10}>
      <planeGeometry args={[1.75, 0.42]} />
      <meshBasicMaterial map={tex} transparent depthTest={false} />
    </mesh>
  );
}

export function KayitRenderAyar({ aktif }: { aktif: boolean }) {
  const { gl, camera, size } = useThree();

  useEffect(() => {
    if (!aktif) return;
    gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    gl.setSize(KAYIT_GENISLIK, KAYIT_YUKSEKLIK, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = KAYIT_GENISLIK / KAYIT_YUKSEKLIK;
      camera.updateProjectionMatrix();
    }
  }, [aktif, gl, camera]);

  useEffect(() => {
    if (aktif) return;
    gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    gl.setSize(size.width, size.height);
  }, [aktif, gl, size.width, size.height]);

  return null;
}

export default function SinifHologramOrtami({ progress = 1 }: { progress?: number }) {
  return (
    <group>
      <SinifDuvarlari />
      <TahtaDoku />
      <SinifMobilya />
      <PencereIsigi />
      <TavanIsiklari />
      <HologramIsini progress={progress} />
      <HudCerceve />
      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.15} roughness={0.75} />
      </mesh>
    </group>
  );
}
