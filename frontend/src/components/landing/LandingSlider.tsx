'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { useKpssLanding } from '@/contexts/LandingThemeContext';

type Slayt = {
  id: string;
  gorselUrl: string;
  baslik: string;
  aciklama: string;
  butonMetin: string;
  butonHref: string;
  hedef: 'hepsi' | 'yks' | 'kpss';
  aktif: boolean;
};

export function useLandingSlaytlari(): Slayt[] {
  const site = useSiteIcerik();
  const kpss = useKpssLanding();
  const hedef = kpss ? 'kpss' : 'yks';
  return ((site.slider?.slaytlar ?? []) as Slayt[]).filter(
    (s) => s.aktif !== false && s.gorselUrl?.trim() && (s.hedef === 'hepsi' || s.hedef === hedef)
  );
}

/** Başlığın altındaki panel kartını doldurur. Yazı boşsa yalnızca görsel gösterilir. */
export function LandingSlider({
  fallbackSrc,
  fallbackAlt,
}: {
  fallbackSrc: string;
  fallbackAlt: string;
}) {
  const slaytlar = useLandingSlaytlari();
  const [index, setIndex] = useState(0);
  const [duraklat, setDuraklat] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [slaytlar.length]);

  useEffect(() => {
    if (slaytlar.length < 2 || duraklat) return;
    const azalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (azalt) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slaytlar.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [slaytlar.length, duraklat]);

  if (slaytlar.length === 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackSrc}
        alt={fallbackAlt}
        decoding="async"
        fetchPriority="high"
        className="mx-auto block h-auto w-full object-contain object-top pt-10"
        draggable={false}
      />
    );
  }

  const aktif = slaytlar[index] ?? slaytlar[0];
  const git = (yon: number) => setIndex((i) => (i + yon + slaytlar.length) % slaytlar.length);
  const yazili = Boolean(aktif.baslik?.trim() || aktif.aciklama?.trim());
  const buton = Boolean(aktif.butonMetin?.trim() && aktif.butonHref?.trim());
  const tumGorselLink = Boolean(aktif.butonHref?.trim() && !aktif.butonMetin?.trim());

  const gorsel = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={aktif.gorselUrl}
      alt={aktif.baslik?.trim() || ''}
      className="absolute inset-0 h-full w-full object-cover object-top"
    />
  );

  return (
    <div
      className="relative h-full w-full bg-white"
      aria-roledescription="carousel"
      aria-label="Ana sayfa slider"
      onMouseEnter={() => setDuraklat(true)}
      onMouseLeave={() => setDuraklat(false)}
    >
      {tumGorselLink ? (
        <Link href={aktif.butonHref} className="absolute inset-0 block" aria-label={aktif.baslik?.trim() || 'Slayt'}>
          {gorsel}
        </Link>
      ) : (
        gorsel
      )}

      {yazili || buton ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/35 to-transparent p-5 sm:p-8 pb-16">
          <div className="max-w-xl">
            {aktif.baslik?.trim() ? (
              <p className="text-xl sm:text-3xl font-black text-white tracking-tight">{aktif.baslik}</p>
            ) : null}
            {aktif.aciklama?.trim() ? (
              <p className="mt-2 text-sm sm:text-base text-white/90 leading-relaxed">{aktif.aciklama}</p>
            ) : null}
            {buton ? (
              <Link
                href={aktif.butonHref}
                className="pointer-events-auto mt-4 inline-flex w-fit items-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
              >
                {aktif.butonMetin}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {slaytlar.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-2 py-1.5 shadow-lg">
          <button
            type="button"
            aria-label="Önceki slayt"
            onClick={() => git(-1)}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {slaytlar.map((s, i) => (
            <button
              key={s.id || i}
              type="button"
              aria-label={`Slayt ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-5 bg-slate-800' : 'w-2 bg-slate-300'}`}
            />
          ))}
          <button
            type="button"
            aria-label="Sonraki slayt"
            onClick={() => git(1)}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
