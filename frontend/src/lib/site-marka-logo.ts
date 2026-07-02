import type { CSSProperties } from 'react';
import type { SiteGenelIcerik } from '@/lib/site-icerik-defaults';
import { VARSAYILAN_SITE_ICERIK } from '@/lib/site-icerik-defaults';

/** Panelden gelen px değerleriyle navbar/footer logo görünümü (yüklenen dosya boyutundan bağımsız). */
export function siteLogoGorunum(marka: SiteGenelIcerik['marka']): {
  className: string;
  style: CSSProperties;
} {
  const d = VARSAYILAN_SITE_ICERIK.marka;
  const hRaw = marka.logoYukseklikPx ?? d.logoYukseklikPx;
  const wRaw = marka.logoMaxGenislikPx ?? d.logoMaxGenislikPx;
  const h = Math.min(120, Math.max(16, Number(hRaw) || 36));
  const w = Math.min(400, Math.max(48, Number(wRaw) || 220));
  return {
    className: 'w-auto shrink-0 object-contain',
    style: { height: h, maxWidth: w },
  };
}
