'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { VARSAYILAN_SITE_ICERIK, type SiteGenelIcerik } from '@/lib/site-icerik-defaults';
import { FaviconUygulayici } from '@/components/FaviconUygulayici';

const SiteIcerikContext = createContext<SiteGenelIcerik>(VARSAYILAN_SITE_ICERIK);

export function SiteIcerikProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ['public-site-icerik'],
    queryFn: async () => {
      const r = await api.get<{ basarili: boolean; veri: SiteGenelIcerik }>('/public/site-icerik');
      return r.data.veri;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const value = useMemo(
    () => (data ? (data as SiteGenelIcerik) : VARSAYILAN_SITE_ICERIK),
    [data]
  );

  return (
    <SiteIcerikContext.Provider value={value}>
      <FaviconUygulayici />
      {children}
    </SiteIcerikContext.Provider>
  );
}

export function useSiteIcerik(): SiteGenelIcerik {
  return useContext(SiteIcerikContext);
}
