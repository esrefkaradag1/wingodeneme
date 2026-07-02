'use client';

import dynamic from 'next/dynamic';

const OgrenciLayout = dynamic(
  () => import('@/components/layout/OgrenciLayout').then((m) => m.OgrenciLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Yükleniyor…
      </div>
    ),
  }
);

export function OgrenciShell({ children }: { children: React.ReactNode }) {
  return <OgrenciLayout>{children}</OgrenciLayout>;
}
