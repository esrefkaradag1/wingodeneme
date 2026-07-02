'use client';

import { useEffect } from 'react';
import { useSiteIcerik } from '@/contexts/SiteIcerikContext';

const ID_FAV = 'wingo-site-favicon';
const ID_APPLE = 'wingo-site-apple-touch';

/**
 * Sistem ikonunu günceller. framework'ün (Next.js) ürettiği link etiketlerine dokunulmaz —
 * bunları silmek React hydration ile "removeChild" çakışmasına yol açabiliyor.
 */
export function FaviconUygulayici() {
  const site = useSiteIcerik();
  const faviconUrl = site.marka.faviconUrl?.trim();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const kaldirWingo = () => {
      document.getElementById(ID_FAV)?.remove();
      document.getElementById(ID_APPLE)?.remove();
    };

    if (!faviconUrl) {
      kaldirWingo();
      return;
    }

    const sFav = String(faviconUrl);
    const mime = sFav.startsWith('data:image/png')
      ? 'image/png'
      : sFav.startsWith('data:image/svg')
        ? 'image/svg+xml'
        : sFav.startsWith('data:image/x-icon')
          ? 'image/x-icon'
          : 'image/png';

    const fav = (() => {
      let el = document.getElementById(ID_FAV) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.id = ID_FAV;
        el.rel = 'icon';
        document.head.appendChild(el);
      }
      return el;
    })();
    fav.type = mime;
    fav.href = sFav;

    const apple = (() => {
      let el = document.getElementById(ID_APPLE) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.id = ID_APPLE;
        el.rel = 'apple-touch-icon';
        document.head.appendChild(el);
      }
      return el;
    })();
    apple.href = sFav;
  }, [faviconUrl]);

  return null;
}
