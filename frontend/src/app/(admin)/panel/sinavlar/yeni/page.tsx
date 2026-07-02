'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import SinavFormModal from '@/components/admin/sinavlar/SinavFormModal';

export default function YeniSinavSayfasi() {
  const router = useRouter();
  const { data: gruplarRes } = useQuery({
    queryKey: ['admin-gruplar'],
    queryFn: () => adminApi.gruplar(),
  });
  const gruplar = (gruplarRes?.data?.veri || []) as any[];

  return (
    <SinavFormModal
      id={null}
      gruplar={gruplar}
      layout="page"
      onClose={() => router.push('/panel/sinavlar')}
    />
  );
}
