'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmDialogHost } from '@/components/ui/ConfirmDialogHost';
import { SiteIcerikProvider } from '@/contexts/SiteIcerikContext';
import { Toaster } from './toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 2 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          retry: 1,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SiteIcerikProvider>
        {children}
      </SiteIcerikProvider>
      <ConfirmDialogHost />
      <Toaster />
    </QueryClientProvider>
  );
}
