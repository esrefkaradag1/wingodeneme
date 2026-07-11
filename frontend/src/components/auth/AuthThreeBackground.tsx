'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Icosahedron, Torus } from '@react-three/drei';
import * as THREE from 'three';

type Palet = {
  ana: string;
  ikincil: string;
  vurgu: string;
};

const PALETLER: Record<'kpss' | 'yks_lgs', Palet> = {
  yks_lgs: { ana: '#6366f1', ikincil: '#8b5cf6', vurgu: '#22d3ee' },
  kpss: { ana: '#10b981', ikincil: '#0ea5e9', vurgu: '#a3e635' },
};

/** İmleç konumuna göre yumuşak parallax uygulayan sahne kökü. */
function SahneParallax({ children }: { children: React.ReactNode }) {
  const grup = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame(() => {
    if (!grup.current) return;
    grup.current.rotation.y = THREE.MathUtils.lerp(grup.current.rotation.y, pointer.x * 0.35, 0.04);
    grup.current.rotation.x = THREE.MathUtils.lerp(grup.current.rotation.x, -pointer.y * 0.25, 0.04);
  });

  return <group ref={grup}>{children}</group>;
}

/** Yavaşça dönen, morph eden ana küre. */
function DistortKure({ renk, renkVurgu }: { renk: string; renkVurgu: string }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.y = t * 0.15;
    mesh.current.rotation.z = t * 0.05;
  });

  return (
    <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
      <Icosahedron ref={mesh} args={[1.6, 16]} position={[2.1, 0.4, -1]}>
        <MeshDistortMaterial
          color={renk}
          emissive={renkVurgu}
          emissiveIntensity={0.35}
          roughness={0.15}
          metalness={0.8}
          distort={0.4}
          speed={1.8}
        />
      </Icosahedron>
    </Float>
  );
}

/** Tel kafes torus — derinlik hissi için. */
function TelTorus({ renk }: { renk: string }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.x = t * 0.2;
    mesh.current.rotation.y = t * 0.12;
  });

  return (
    <Float speed={1} rotationIntensity={1} floatIntensity={0.8}>
      <Torus ref={mesh} args={[1.1, 0.34, 24, 80]} position={[-2.6, -0.8, -1.5]}>
        <meshStandardMaterial color={renk} wireframe transparent opacity={0.5} />
      </Torus>
    </Float>
  );
}

/** Yavaşça sürüklenen yıldız/parçacık alanı. */
function Parcaciklar({ renk }: { renk: string }) {
  const noktalar = useRef<THREE.Points>(null);

  const geometri = useMemo(() => {
    const adet = 900;
    const konumlar = new Float32Array(adet * 3);
    for (let i = 0; i < adet; i++) {
      konumlar[i * 3] = (Math.random() - 0.5) * 18;
      konumlar[i * 3 + 1] = (Math.random() - 0.5) * 12;
      konumlar[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(konumlar, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!noktalar.current) return;
    const t = state.clock.getElapsedTime();
    noktalar.current.rotation.y = t * 0.03;
  });

  return (
    <points ref={noktalar} geometry={geometri}>
      <pointsMaterial size={0.035} color={renk} transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Sahne({ palet }: { palet: Palet }) {
  return (
    <>
      <color attach="background" args={['#070713']} />
      <fog attach="fog" args={['#070713', 6, 16]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} color={palet.vurgu} />
      <pointLight position={[-5, -3, 2]} intensity={2.2} color={palet.ikincil} />
      <pointLight position={[3, 2, 4]} intensity={1.6} color={palet.ana} />

      <SahneParallax>
        <DistortKure renk={palet.ana} renkVurgu={palet.vurgu} />
        <TelTorus renk={palet.ikincil} />
        <Parcaciklar renk={palet.vurgu} />
      </SahneParallax>
    </>
  );
}

export default function AuthThreeBackground({ mode = 'yks_lgs' }: { mode?: 'kpss' | 'yks_lgs' }) {
  const palet = PALETLER[mode];
  const [hareketAzalt, setHareketAzalt] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setHareketAzalt(mq.matches);
    const dinle = (e: MediaQueryListEvent) => setHareketAzalt(e.matches);
    mq.addEventListener('change', dinle);
    return () => mq.removeEventListener('change', dinle);
  }, []);

  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        frameloop={hareketAzalt ? 'demand' : 'always'}
      >
        <Sahne palet={palet} />
      </Canvas>
    </div>
  );
}
