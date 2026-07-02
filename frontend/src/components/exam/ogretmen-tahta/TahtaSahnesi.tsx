'use client';

import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  cizimAdimiGetir,
  hataAciklaToTahtaAdimlari,
  konuTipiGetir,
  veriMetni,
  type HataAciklaVeri,
} from '@/lib/hataAciklaTahta';
import { useTahtaCizimAnimasyonu } from '@/hooks/useTahtaCizimAnimasyonu';
import { tahtaMetinCiz } from '@/lib/tahtaCanvasCizim';
import Tahta3DGeometri from './Tahta3DGeometri';

const W = 5.6;
const H = 3.1;

function TahtaMetinDoku({
  adim,
  gorunenSatir,
}: {
  adim: ReturnType<typeof hataAciklaToTahtaAdimlari>[number];
  gorunenSatir: number;
}) {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, tex: t };
  }, []);

  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    tahtaMetinCiz(ctx, canvas.width, canvas.height, adim, gorunenSatir);
    tex.needsUpdate = true;
  }, [adim, gorunenSatir, canvas, tex]);

  return (
    <mesh position={[0, 0, 0.06]}>
      <planeGeometry args={[W, H]} />
      <meshStandardMaterial map={tex} roughness={0.88} emissive="#0a2e1a" emissiveIntensity={0.08} />
    </mesh>
  );
}

function SinifOrtami({
  adim,
  gorunenSatir,
  elemanlar,
  progress,
  konuTipi,
}: {
  adim: ReturnType<typeof hataAciklaToTahtaAdimlari>[number];
  gorunenSatir: number;
  elemanlar: ReturnType<typeof cizimAdimiGetir>;
  progress: number;
  konuTipi: ReturnType<typeof konuTipiGetir>;
}) {
  return (
    <>
      <color attach="background" args={['#1e293b']} />

      <ambientLight intensity={0.72} />
      <directionalLight position={[2, 5, 6]} intensity={1.35} color="#ffffff" />
      <pointLight position={[0, 1.5, 4]} intensity={1.1} color="#fffbeb" distance={18} />
      <spotLight
        position={[0, 3.5, 5]}
        angle={0.55}
        penumbra={0.4}
        intensity={1.6}
        color="#fef9c3"
        target-position={[0, 0, 0]}
      />

      {/* Arka duvar — sade, tahtayı öne çıkarır */}
      <mesh position={[0, 0.5, -1.8]}>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Tahta grubu — odak noktası */}
      <group position={[0, 0.1, 0]}>
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[W + 0.24, H + 0.24, 0.08]} />
          <meshStandardMaterial color="#6b4423" roughness={0.75} />
        </mesh>
        <mesh position={[0, -H / 2 - 0.12, 0.02]}>
          <boxGeometry args={[W + 0.08, 0.12, 0.16]} />
          <meshStandardMaterial color="#5c3d1e" />
        </mesh>

        <TahtaMetinDoku adim={adim} gorunenSatir={gorunenSatir} />

        <Tahta3DGeometri
          elemanlar={elemanlar}
          progress={progress}
          boardW={W}
          boardH={H}
          konuTipi={konuTipi}
        />

        {progress < 1 && (
          <mesh position={[0.8 + progress * 0.7, 0.05, 0.2]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={0.7} />
          </mesh>
        )}
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={4.5}
        maxDistance={7.5}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.1, 0]}
      />
    </>
  );
}

export default function TahtaSahnesi({
  veri,
  adimIdx,
  gorunenSatirSayisi,
  ders,
  konu,
  konusuyor,
  oynatiliyor,
}: {
  veri: HataAciklaVeri;
  adimIdx: number;
  gorunenSatirSayisi: number;
  ders?: string;
  konu?: string;
  altMetin?: string;
  konusuyor: boolean;
  oynatiliyor: boolean;
}) {
  const adimlar = useMemo(() => hataAciklaToTahtaAdimlari(veri), [veri]);
  const adim = adimlar[Math.min(adimIdx, adimlar.length - 1)] ?? adimlar[0]!;
  const metin = useMemo(() => veriMetni(veri), [veri]);
  const konuTipi = useMemo(() => konuTipiGetir(ders, konu, metin), [ders, konu, metin]);
  const elemanlar = useMemo(() => cizimAdimiGetir(veri, adimIdx, ders, konu), [veri, adimIdx, ders, konu]);
  const progress = useTahtaCizimAnimasyonu(
    adimIdx,
    elemanlar.length,
    konusuyor,
    oynatiliyor
  );

  return (
    <Canvas
      camera={{ position: [0, 0.25, 5.4], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.25;
      }}
    >
      <SinifOrtami
        adim={adim}
        gorunenSatir={gorunenSatirSayisi}
        elemanlar={elemanlar}
        progress={progress}
        konuTipi={konuTipi}
      />
    </Canvas>
  );
}
