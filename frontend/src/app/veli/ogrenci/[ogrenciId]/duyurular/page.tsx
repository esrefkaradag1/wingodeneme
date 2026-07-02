'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import { veliApi } from '@/lib/api';
import { VeliOgrenciBaslik } from '@/components/veli/VeliOgrenciShell';
import { VeliSayfa, VeliPanel, VeliBadge, VeliBosDurum, VeliYukleniyor } from '@/components/veli/VeliUI';

export default function VeliOgrenciDuyurularPage() {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['veli-ogrenci-duyurular', ogrenciId],
    queryFn: async () => (await veliApi.ogrenciDuyurular(ogrenciId)).data.veri as Array<{
      id: string; okundu: boolean;
      duyuru: { baslik: string; mesaj: string; olusturuldu: string };
    }>,
    enabled: !!ogrenciId,
  });

  if (isLoading) return <VeliYukleniyor />;

  const duyurular = data ?? [];

  return (
    <VeliSayfa>
      <VeliOgrenciBaslik altBaslik="Duyurular" />

      {duyurular.length === 0 ? (
        <VeliBosDurum ikon={Bell} baslik="Duyuru yok" aciklama="Öğrenciye iletilen duyuru bulunmuyor." />
      ) : (
        <div className="space-y-3">
          {duyurular.map((d) => (
            <VeliPanel
              key={d.id}
              className={`!p-4 sm:!p-5 transition-shadow hover:shadow-md ${
                !d.okundu ? 'ring-2 ring-violet-200/60 border-violet-100' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!d.okundu ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">{d.duyuru.baslik}</p>
                    {!d.okundu && <VeliBadge ton="violet">Yeni</VeliBadge>}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{d.duyuru.mesaj}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {format(new Date(d.duyuru.olusturuldu), 'd MMMM yyyy, HH:mm', { locale: tr })}
                  </p>
                </div>
              </div>
            </VeliPanel>
          ))}
        </div>
      )}
    </VeliSayfa>
  );
}
