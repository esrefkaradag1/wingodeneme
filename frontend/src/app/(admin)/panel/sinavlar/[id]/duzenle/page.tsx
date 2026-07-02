'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import SinavFormModal from '@/components/admin/sinavlar/SinavFormModal';

export default function SinavDuzenleSayfasi() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const { data: gruplarRes } = useQuery({
    queryKey: ['admin-gruplar'],
    queryFn: () => adminApi.gruplar(),
  });
  const gruplar = (gruplarRes?.data?.veri || []) as any[];

  if (!id) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        Geçersiz sınav bağlantısı.
      </div>
    );
  }

  return (
    <SinavFormModal
      id={id}
      gruplar={gruplar}
      layout="page"
      onClose={() => router.push('/panel/sinavlar')}
    />
  );
}
