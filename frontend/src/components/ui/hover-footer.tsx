'use client';

import React, { useRef, useEffect, useState, useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Marka stroke — tema CSS değişkeni */
const BRAND_STROKE = 'var(--landing-brand-stroke, #14B8A6)';

export const TextHoverEffect = ({
  text,
  duration,
  className,
  fullBleed = false,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
  className?: string;
  /** Yazıyı SVG genişliğine yay (kenardan kenara) */
  fullBleed?: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, '');
  const gradientId = `textGradient-${uid}`;
  const revealId = `revealMask-${uid}`;
  const maskId = `textMask-${uid}`;

  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: '50%', cy: '50%' });

  const textSizeClass = fullBleed
    ? undefined
    : text.length > 7
      ? 'text-4xl md:text-5xl'
      : 'text-7xl';

  const textX = fullBleed ? 1 : '50%';
  const textAnchor = fullBleed ? ('start' as const) : ('middle' as const);

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={cn('select-none uppercase cursor-pointer', className)}
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
          {hovered && (
            <>
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="35%" stopColor="#14B8A6" />
              <stop offset="70%" stopColor="#2DD4BF" />
              <stop offset="100%" stopColor="#F59E0B" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id={revealId}
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: '50%', cy: '50%' }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: 'easeOut' }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#${revealId})`} />
        </mask>
      </defs>
      <text
        x={textX}
        y="50%"
        textAnchor={textAnchor}
        dominantBaseline="middle"
        strokeWidth={fullBleed ? 0.45 : 0.3}
        className={cn(
          'fill-transparent stroke-neutral-200 font-[helvetica] font-bold dark:stroke-neutral-800',
          textSizeClass
        )}
        style={{
          opacity: hovered ? 0.7 : 0,
          ...(fullBleed ? { fontSize: 56 } : {}),
        }}
        {...(fullBleed
          ? { textLength: 298, lengthAdjust: 'spacingAndGlyphs' as const }
          : {})}
      >
        {text}
      </text>
      <motion.text
        x={textX}
        y="50%"
        textAnchor={textAnchor}
        dominantBaseline="middle"
        strokeWidth={fullBleed ? 0.45 : 0.3}
        className={cn('fill-transparent font-[helvetica] font-bold', textSizeClass)}
        style={{
          stroke: BRAND_STROKE,
          ...(fullBleed ? { fontSize: 56 } : {}),
        }}
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: 'easeInOut',
        }}
        {...(fullBleed
          ? { textLength: 298, lengthAdjust: 'spacingAndGlyphs' as const }
          : {})}
      >
        {text}
      </motion.text>
      <text
        x={textX}
        y="50%"
        textAnchor={textAnchor}
        dominantBaseline="middle"
        stroke={`url(#${gradientId})`}
        strokeWidth={fullBleed ? 0.45 : 0.3}
        mask={`url(#${maskId})`}
        className={cn('fill-transparent font-[helvetica] font-bold', textSizeClass)}
        style={fullBleed ? { fontSize: 56 } : undefined}
        {...(fullBleed
          ? { textLength: 298, lengthAdjust: 'spacingAndGlyphs' as const }
          : {})}
      >
        {text}
      </text>
    </svg>
  );
};

export const FooterBackgroundGradient = () => {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(125% 125% at 50% 10%, color-mix(in srgb, var(--surface-darkest) 55%, transparent) 40%, color-mix(in srgb, var(--wingo-500) 22%, transparent) 100%)',
      }}
    />
  );
};
