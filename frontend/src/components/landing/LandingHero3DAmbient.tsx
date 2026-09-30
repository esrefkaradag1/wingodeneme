'use client';

import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';

function SoftOrb({
  position,
  color,
  scale = 1,
  speed = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime() * speed;
    mesh.current.position.y = position[1] + Math.sin(t * 0.7) * 0.15;
  });

  return (
    <Float speed={1.2 * speed} rotationIntensity={0.4} floatIntensity={0.9}>
      <Sphere ref={mesh} args={[1, 48, 48]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={0.25}
          metalness={0.35}
          distort={0.28}
          speed={1.4}
          transparent
          opacity={0.55}
        />
      </Sphere>
    </Float>
  );
}

function WireRing({ position, color }: { position: [number, number, number]; color: string }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.x = t * 0.18;
    mesh.current.rotation.y = t * 0.12;
  });

  return (
    <Float speed={0.9} rotationIntensity={0.8} floatIntensity={0.5}>
      <Torus ref={mesh} args={[1.05, 0.03, 16, 96]} position={position}>
        <meshStandardMaterial color={color} wireframe transparent opacity={0.45} />
      </Torus>
    </Float>
  );
}

function Particles({ count = 48 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    points.current.rotation.y = state.clock.getElapsedTime() * 0.03;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#0D9488" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function Sahne() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 3]} intensity={0.85} color="#ffffff" />
      <pointLight position={[-3, 2, 2]} intensity={0.6} color="#14B8A6" />
      <pointLight position={[3, -1, 1]} intensity={0.35} color="#EA580C" />

      <SoftOrb position={[2.4, 0.6, -1.2]} color="#14B8A6" scale={1.15} speed={0.9} />
      <SoftOrb position={[-2.8, -0.5, -1.6]} color="#2DD4BF" scale={0.75} speed={1.2} />
      <SoftOrb position={[0.2, 1.4, -2.2]} color="#F97316" scale={0.45} speed={1.4} />
      <WireRing position={[-1.6, 0.8, -0.8]} color="#0D9488" />
      <Particles />
    </>
  );
}

export function LandingHero3DAmbient() {
  const [hazir, setHazir] = useState(false);
  const [azalt, setAzalt] = useState(false);

  useEffect(() => {
    setHazir(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAzalt(mq.matches);
    const fn = () => setAzalt(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  if (!hazir || azalt) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-0 opacity-70" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Sahne />
        </Suspense>
      </Canvas>
    </div>
  );
}
