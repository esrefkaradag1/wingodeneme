'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function AdminOturumKoruyucu({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const kullanici = useAuthStore((s) => s.kullanici);
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    const persistApi = useAuthStore.persist;
    const finish = () => setHazir(true);
    if (!persistApi) {
      finish();
      return;
    }
    if (persistApi.hasHydrated()) {
      finish();
      return;
    }
    return persistApi.onFinishHydration(finish);
  }, []);

  useEffect(() => {
    if (!hazir) return;
    if (!token) {
      router.replace('/giris');
      return;
    }
    const rol = kullanici?.rol;
    if (rol && rol !== 'ADMIN' && rol !== 'SUPER_ADMIN' && rol !== 'TEACHER') {
      router.replace('/dashboard');
    }
  }, [hazir, token, kullanici?.rol, router]);

  if (!hazir) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return <>{children}</>;
}
