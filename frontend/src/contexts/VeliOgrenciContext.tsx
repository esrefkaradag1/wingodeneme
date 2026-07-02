'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { veliApi } from '@/lib/api';

export interface VeliOgrenciOzet {
  id: string;
  ad: string;
  soyad: string;
  sinif: string | null;
  okul: string | null;
  ogretimTuru: string;
}

interface VeliOgrenciContextDeger {
  ogrenciler: VeliOgrenciOzet[];
  seciliOgrenciId: string | null;
  seciliOgrenci: VeliOgrenciOzet | null;
  ogrenciSec: (id: string) => void;
  yukleniyor: boolean;
}

const VeliOgrenciContext = createContext<VeliOgrenciContextDeger | null>(null);

const STORAGE_KEY = 'veli-secili-ogrenci-id';

function pathnameOgrenciId(pathname: string): string | null {
  const m = pathname.match(/^\/veli\/ogrenci\/([^/]+)/);
  return m?.[1] ?? null;
}

export function VeliOgrenciProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [seciliOgrenciId, setSeciliOgrenciId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['veli-ozet'],
    queryFn: async () => {
      const r = await veliApi.ozet();
      return r.data.veri as {
        ogrenciler: VeliOgrenciOzet[];
      };
    },
  });

  const ogrenciler = data?.ogrenciler ?? [];

  useEffect(() => {
    const urlId = pathnameOgrenciId(pathname);
    if (urlId) {
      setSeciliOgrenciId(urlId);
      localStorage.setItem(STORAGE_KEY, urlId);
      return;
    }
    const kayitli = localStorage.getItem(STORAGE_KEY);
    if (kayitli && ogrenciler.some((o) => o.id === kayitli)) {
      setSeciliOgrenciId(kayitli);
    } else if (ogrenciler.length === 1) {
      setSeciliOgrenciId(ogrenciler[0]!.id);
      localStorage.setItem(STORAGE_KEY, ogrenciler[0]!.id);
    } else if (kayitli && !ogrenciler.some((o) => o.id === kayitli)) {
      setSeciliOgrenciId(ogrenciler[0]?.id ?? null);
    }
  }, [pathname, ogrenciler]);

  const ogrenciSec = (id: string) => {
    setSeciliOgrenciId(id);
    localStorage.setItem(STORAGE_KEY, id);
    const alt = pathname.replace(/^\/veli\/ogrenci\/[^/]+/, `/veli/ogrenci/${id}`);
    if (pathname.startsWith('/veli/ogrenci/')) {
      router.push(alt);
    } else {
      router.push(`/veli/ogrenci/${id}`);
    }
  };

  const seciliOgrenci = useMemo(
    () => ogrenciler.find((o) => o.id === seciliOgrenciId) ?? null,
    [ogrenciler, seciliOgrenciId],
  );

  return (
    <VeliOgrenciContext.Provider
      value={{
        ogrenciler,
        seciliOgrenciId,
        seciliOgrenci,
        ogrenciSec,
        yukleniyor: isLoading,
      }}
    >
      {children}
    </VeliOgrenciContext.Provider>
  );
}

export function useVeliOgrenci() {
  const ctx = useContext(VeliOgrenciContext);
  if (!ctx) throw new Error('useVeliOgrenci yalnızca VeliOgrenciProvider içinde kullanılabilir');
  return ctx;
}

export function veliOgrenciYolu(ogrenciId: string, alt = '') {
  return `/veli/ogrenci/${ogrenciId}${alt}`;
}
