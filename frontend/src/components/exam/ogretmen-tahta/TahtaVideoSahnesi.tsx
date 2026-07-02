'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import {
  cizimAdimiGetir,
  type HataAciklaVeri,
  videoCizimGetir,
  videoModuAktif,
} from '@/lib/hataAciklaTahta';
import { useTahtaCizimAnimasyonu } from '@/hooks/useTahtaCizimAnimasyonu';
import Tahta3DGeometri from './Tahta3DGeometri';
import SinifHologramOrtami, { FormulaPanel3D, KayitRenderAyar, KAYIT_GENISLIK, KAYIT_YUKSEKLIK } from './SinifHologramOrtami';

const W = 4.2;
const H = 3.4;

function formulOkunur(metin: string): string {
  return metin
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\left|\\right/g, '')
    .replace(/\\\(/g, '')
    .replace(/\\\)/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function HologramPlatform({ progress }: { progress: number }) {
  const s = Math.min(1, progress * 1.4);
  return (
    <group position={[0, -1.05, 0]} scale={[s, s, s]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.95, 6]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.1} transparent opacity={0.65} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[0.48, 32]} />
        <meshStandardMaterial color="#0c4a6e" emissive="#0284c7" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      <pointLight position={[0, 0.5, 0.3]} intensity={3} color="#67e8f9" distance={5} />
    </group>
  );
}

function VideoOrtami({
  elemanlar,
  progress,
  formul,
}: {
  elemanlar: ReturnType<typeof cizimAdimiGetir>;
  progress: number;
  formul?: string;
}) {
  return (
    <>
      <color attach="background" args={['#e8f4fc']} />
      <fog attach="fog" args={['#dbeafe', 14, 26]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 10, 6]} intensity={1.4} color="#ffffff" castShadow />
      <directionalLight position={[-5, 4, 3]} intensity={0.55} color="#bae6fd" />
      <spotLight position={[0, 5, 4]} angle={0.45} penumbra={0.8} intensity={1.2} color="#e0f2fe" />

      <SinifHologramOrtami progress={progress} />

      <Grid
        position={[0, -1.2, 0]}
        args={[16, 16]}
        cellSize={0.35}
        cellThickness={0.3}
        cellColor="#cbd5e1"
        sectionSize={1.4}
        sectionThickness={0.55}
        sectionColor="#0ea5e9"
        fadeDistance={18}
        infiniteGrid
      />

      <group position={[0, 0.15, 0]}>
        <HologramPlatform progress={progress} />
        <Tahta3DGeometri
          elemanlar={elemanlar}
          progress={progress}
          boardW={W}
          boardH={H}
          konuTipi="geometri"
          hologram
        />
        <FormulaPanel3D formul={formul ? formulOkunur(formul) : undefined} />
      </group>
    </>
  );
}

export default function TahtaVideoSahnesi({
  veri,
  adimIdx,
  ders,
  konu,
  konusuyor,
  oynatiliyor,
  formul,
  kayitModu,
  kayitSegmentIdx,
  onCanvasReady,
}: {
  veri: HataAciklaVeri;
  adimIdx: number;
  ders?: string;
  konu?: string;
  konusuyor: boolean;
  oynatiliyor: boolean;
  formul?: string;
  kayitModu?: boolean;
  kayitSegmentIdx?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}) {
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const videoMod = videoModuAktif(veri);
  const aktifAdim = kayitModu && kayitSegmentIdx !== undefined
    ? (veri.videoAdimlari?.[kayitSegmentIdx]?.adimIdx ?? kayitSegmentIdx)
    : adimIdx;

  const elemanlar = useMemo(
    () => (videoMod ? videoCizimGetir(veri, aktifAdim, ders, konu) : cizimAdimiGetir(veri, aktifAdim, ders, konu)),
    [veri, aktifAdim, ders, konu, videoMod]
  );

  const progress = useTahtaCizimAnimasyonu(
    aktifAdim,
    elemanlar.length,
    konusuyor || Boolean(kayitModu),
    oynatiliyor || Boolean(kayitModu),
    kayitModu ? 3200 : undefined
  );

  useEffect(() => {
    if (canvasEl.current) onCanvasReady?.(canvasEl.current);
  }, [onCanvasReady, kayitModu]);

  const kameraPos: [number, number, number] = kayitModu ? [0, 0.75, 5.4] : [0, 0.55, 6.0];

  return (
    <div
      className={kayitModu ? 'mx-auto overflow-hidden rounded-xl bg-slate-900' : 'relative w-full h-full bg-slate-100'}
      style={kayitModu ? { width: KAYIT_GENISLIK, height: KAYIT_YUKSEKLIK } : undefined}
    >
      <Canvas
        frameloop="always"
        camera={{ position: kameraPos, fov: kayitModu ? 40 : 42 }}
        dpr={kayitModu ? [1, 2] : [1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        shadows
        onCreated={({ gl }) => {
          canvasEl.current = gl.domElement;
          onCanvasReady?.(gl.domElement);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = kayitModu ? 1.3 : 1.35;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        {kayitModu && <KayitRenderAyar aktif />}
        <VideoOrtami elemanlar={elemanlar} progress={progress} formul={formul} />
      </Canvas>
    </div>
  );
}
