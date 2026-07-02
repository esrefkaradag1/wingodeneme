'use client';

import { useSiteIcerik } from '@/contexts/SiteIcerikContext';
import { VARSAYILAN_SITE_ICERIK } from '@/lib/site-icerik-defaults';

type Props = {
  /** Daha koyu arka plan için (footer) */
  koyu?: boolean;
  className?: string;
};

export function OdemeGuvenRozetleri({ koyu = false, className = '' }: Props) {
  const site = useSiteIcerik();
  const og = site.odemeGostergeleri ?? VARSAYILAN_SITE_ICERIK.odemeGostergeleri;

  const logolar: { src: string; alt: string }[] = [];
  if (og.visaGoster && og.visaLogoUrl?.trim()) {
    logolar.push({ src: og.visaLogoUrl.trim(), alt: 'Visa' });
  }
  if (og.mastercardGoster && og.mastercardLogoUrl?.trim()) {
    logolar.push({ src: og.mastercardLogoUrl.trim(), alt: 'Mastercard' });
  }
  if (og.iyzicoGoster && og.iyzicoLogoUrl?.trim()) {
    logolar.push({ src: og.iyzicoLogoUrl.trim(), alt: 'iyzico ile Öde' });
  }

  if (logolar.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <span
        className={`text-xs font-semibold ${koyu ? 'text-slate-500' : 'text-gray-500'}`}
      >
        Güvenli ödeme:
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {logolar.map((l) => (
          <div
            key={l.alt}
            className="bg-white rounded-md px-2 py-1 shadow-sm border border-gray-100/80"
          >
            <img src={l.src} alt={l.alt} className="h-6 w-auto max-w-[300px] object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}
