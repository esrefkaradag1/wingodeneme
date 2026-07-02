'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type AuthGorselProps = {
  src: string;
  alt?: string;
  className?: string;
};

/** JWT gerektiren yerel dosya URL'leri için blob önizleme */
export function AuthGorsel({ src, alt = '', className }: AuthGorselProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    let iptal = false;
    let olusturulan: string | null = null;

    if (!src) {
      setBlobUrl(null);
      return;
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
      setBlobUrl(src);
      setHata(false);
      return;
    }

    const yol = src.startsWith('/api/v1') ? src.replace(/^\/api\/v1/, '') : src;

    api
      .get(yol, { responseType: 'blob' })
      .then((res) => {
        if (iptal) return;
        olusturulan = URL.createObjectURL(res.data);
        setBlobUrl(olusturulan);
        setHata(false);
      })
      .catch(() => {
        if (!iptal) setHata(true);
      });

    return () => {
      iptal = true;
      if (olusturulan) URL.revokeObjectURL(olusturulan);
    };
  }, [src]);

  if (hata) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-[11px] text-slate-400 ${className || ''}`}>
        Görsel yüklenemedi
      </div>
    );
  }

  if (!blobUrl) {
    return <div className={`animate-pulse bg-slate-100 ${className || ''}`} />;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
