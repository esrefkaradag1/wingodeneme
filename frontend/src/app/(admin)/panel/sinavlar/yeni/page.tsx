'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import SinavFormModal from '@/components/admin/sinavlar/SinavFormModal';
import { useAuthStore } from '@/store/auth.store';
import { Loader2 } from 'lucide-react';

export default function YeniSinavSayfasi() {
  const router = useRouter();
  const rol = useAuthStore((s) => s.kullanici?.rol);
  const ogretmenMi = rol === 'TEACHER';

  useEffect(() => {
    if (ogretmenMi) {
      router.replace('/panel/sinavlar');
    }
  }, [ogretmenMi, router]);

  const { data: gruplarRes } = useQuery({
    queryKey: ['admin-gruplar'],
    queryFn: () => adminApi.gruplar(),
    enabled: !ogretmenMi,
  });
  const gruplar = (gruplarRes?.data?.veri || []) as any[];

  if (ogretmenMi) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <SinavFormModal
      id={null}
      gruplar={gruplar}
      layout="page"
      onClose={() => router.push('/panel/sinavlar')}
    />
  );
}
