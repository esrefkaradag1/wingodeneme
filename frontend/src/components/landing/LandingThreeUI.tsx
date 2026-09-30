'use client';

import { CloudField } from '@designcodeio/threeui/components/CloudField';
import { EmeraldHorizonBackground } from '@designcodeio/threeui/components/EmeraldHorizonBackground';
import { BrandOrbs } from '@designcodeio/threeui/components/BrandOrbs';
import { MorphingGlyphCloud } from '@designcodeio/threeui/components/MorphingGlyphCloud';

/** Hero arka planı — teal ufuk + bulut alanı (eğitim / SaaS hissi) */
export function LandingThreeHeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 [&_*]:!max-w-none">
        <EmeraldHorizonBackground
          className="!absolute inset-0 h-full w-full"
          speed={0.85}
          waveScale={1.05}
          glow={1.15}
          vignette={0.75}
          hue={-8}
          variation={1}
        />
      </div>
      <div className="absolute inset-0 opacity-55 mix-blend-soft-light [&_*]:!max-w-none">
        <CloudField
          mode="light"
          hue={160}
          saturation={0.85}
          brightness={1.1}
          className="!absolute inset-0 h-full w-full"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-transparent to-white/80 pointer-events-none" />
    </div>
  );
}

/** Özellik / güven şeridi için 3D marka orb’ları */
export function LandingThreeOrbRow() {
  const orbs: Array<{ variant: 'react' | 'ui' | 'ux' | 'css' | 'figma' | 'framer'; label: string }> = [
    { variant: 'react', label: 'Online' },
    { variant: 'ui', label: 'Analiz' },
    { variant: 'ux', label: 'TYT' },
    { variant: 'css', label: 'AYT' },
    { variant: 'figma', label: 'LGS' },
    { variant: 'framer', label: 'Net' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-2">
      {orbs.map((o) => (
        <div key={o.variant} className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 sm:h-16 sm:w-16">
            <BrandOrbs variant={o.variant} size="small" mode="light" speed={1.1} aria-label={o.label} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-edu-muted">{o.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Bölüm arası 3D tipografi / glyph alanı */
export function LandingThreeGlyphBand({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-40 sm:h-52 overflow-hidden rounded-3xl ${className}`} aria-hidden>
      <MorphingGlyphCloud
        mode="light"
        hue={155}
        saturation={0.9}
        brightness={1.05}
        opacity={0.95}
        scale={1.05}
        className="!absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-edu-bg via-transparent to-edu-bg pointer-events-none" />
    </div>
  );
}
