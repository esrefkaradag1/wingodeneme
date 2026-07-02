'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { veliApi } from '@/lib/api';
import { VeliOgrenciBaslik } from '@/components/veli/VeliOgrenciShell';
import { VeliSayfa, VeliPanel, VeliBadge, VeliBosDurum, VeliYukleniyor } from '@/components/veli/VeliUI';

export default function VeliOgrenciTakvimPage() {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['veli-ogrenci-sinavlar', ogrenciId],
    queryFn: async () => (await veliApi.ogrenciSinavlar(ogrenciId)).data.veri as Array<{
      id: string; baslik: string; tur: string;
      baslangicZamani: string; bitisZamani: string; durum: string;
    }>,
    enabled: !!ogrenciId,
  });

  if (isLoading) return <VeliYukleniyor />;

  const sinavlar = [...(data ?? [])].sort(
    (a, b) => new Date(a.baslangicZamani).getTime() - new Date(b.baslangicZamani).getTime(),
  );

  return (
    <VeliSayfa>
      <VeliOgrenciBaslik altBaslik="Sınav Takvimi" />

      {sinavlar.length === 0 ? (
        <VeliBosDurum ikon={Calendar} baslik="Takvim boş" aciklama="Planlanmış sınav bulunmuyor." />
      ) : (
        <div className="space-y-3">
          {sinavlar.map((s) => (
            <VeliPanel key={s.id} className="!p-4 sm:!p-5 flex gap-4 items-start hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 flex flex-col items-center justify-center shrink-0 ring-1 ring-violet-100">
                <span className="text-lg font-black text-violet-700 leading-none">
                  {format(new Date(s.baslangicZamani), 'd', { locale: tr })}
                </span>
                <span className="text-[9px] font-bold uppercase text-violet-500">
                  {format(new Date(s.baslangicZamani), 'MMM', { locale: tr })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-bold text-gray-900">{s.baslik}</p>
                  <VeliBadge ton="violet">{s.tur}</VeliBadge>
                  <VeliBadge ton="gray">{s.durum}</VeliBadge>
                </div>
                <p className="text-sm text-gray-600">
                  {format(new Date(s.baslangicZamani), 'EEEE, d MMMM yyyy', { locale: tr })}
                </p>
                <p className="text-xs text-violet-600 font-medium mt-1">
                  {format(new Date(s.baslangicZamani), 'HH:mm', { locale: tr })}
                  {' – '}
                  {format(new Date(s.bitisZamani), 'HH:mm', { locale: tr })}
                </p>
              </div>
            </VeliPanel>
          ))}
        </div>
      )}
    </VeliSayfa>
  );
}
