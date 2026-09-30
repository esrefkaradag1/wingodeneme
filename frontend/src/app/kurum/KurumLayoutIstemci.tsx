'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PanelKabugu } from '@/components/layout/PanelKabugu';

function KurumLayoutIcerik({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const partner = (searchParams.get('partner') || '').trim().toLowerCase();
  const t = (searchParams.get('t') || '').trim();
  const ssoGiris = pathname === '/kurum' && partner === 'kapya' && Boolean(t);

  if (ssoGiris) {
    return <>{children}</>;
  }

  return <PanelKabugu kapsam="KURUM">{children}</PanelKabugu>;
}

export function KurumLayoutIstemci({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <KurumLayoutIcerik>{children}</KurumLayoutIcerik>
    </Suspense>
  );
}
