'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BookOpen, Clock, Lock, ArrowRight, Trophy, Zap } from 'lucide-react';
import { veliApi } from '@/lib/api';
import { VeliOgrenciBaslik, veliOgrenciYolu } from '@/components/veli/VeliOgrenciShell';
import { VeliSayfa, VeliPanel, VeliBadge, VeliButon, VeliYukleniyor } from '@/components/veli/VeliUI';

interface Sinav {
  id: string;
  baslik: string;
  tur: string;
  baslangicZamani: string;
  durum: 'AKTIF' | 'YAKINDA' | 'BITTI';
  katilimId?: string | null;
  katilimDurumu?: string | null;
}

export default function VeliOgrenciSinavlarPage() {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['veli-ogrenci-sinavlar', ogrenciId],
    queryFn: async () => (await veliApi.ogrenciSinavlar(ogrenciId)).data.veri as Sinav[],
    enabled: !!ogrenciId,
  });

  if (isLoading) return <VeliYukleniyor />;

  const sinavlar = data ?? [];
  const tamamlanan = sinavlar.filter((s) => s.durum === 'BITTI' || s.katilimDurumu === 'TAMAMLANDI');
  const aktif = sinavlar.filter((s) => s.durum === 'AKTIF');
  const yakinda = sinavlar.filter((s) => s.durum === 'YAKINDA');

  return (
    <VeliSayfa>
      <VeliOgrenciBaslik altBaslik="Sınavlar" />
      <SinavGrubu baslik="Tamamlanan" ikon={Trophy} sinavlar={tamamlanan} ogrenciId={ogrenciId} sonucGoster ton="emerald" />
      <SinavGrubu baslik="Aktif" ikon={Zap} sinavlar={aktif} ogrenciId={ogrenciId} ton="violet" />
      <SinavGrubu baslik="Yaklaşan" ikon={Clock} sinavlar={yakinda} ogrenciId={ogrenciId} ton="sky" />
      {sinavlar.length === 0 && (
        <VeliPanel className="text-center py-12 text-gray-500 text-sm">Henüz sınav kaydı yok.</VeliPanel>
      )}
    </VeliSayfa>
  );
}

function SinavGrubu({
  baslik, ikon: Ikon, sinavlar, ogrenciId, sonucGoster, ton = 'violet',
}: {
  baslik: string; ikon: typeof BookOpen; sinavlar: Sinav[]; ogrenciId: string;
  sonucGoster?: boolean; ton?: 'violet' | 'emerald' | 'sky';
}) {
  if (sinavlar.length === 0) return null;
  const badgeTon = ton === 'emerald' ? 'emerald' : ton === 'sky' ? 'sky' : 'violet';

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 px-1">
        <Ikon className="w-4 h-4" /> {baslik}
      </h2>
      <div className="grid gap-3">
        {sinavlar.map((s) => (
          <VeliPanel key={s.id} className="!p-4 sm:!p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-bold text-gray-900 truncate">{s.baslik}</p>
                  <VeliBadge ton={badgeTon}>{s.tur}</VeliBadge>
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(s.baslangicZamani), 'd MMMM yyyy, HH:mm', { locale: tr })}
                </p>
                {s.katilimDurumu && <VeliBadge ton="gray">{s.katilimDurumu}</VeliBadge>}
              </div>
              {sonucGoster && s.katilimId && s.katilimDurumu === 'TAMAMLANDI' ? (
                <VeliButon href={veliOgrenciYolu(ogrenciId, `/sonuc/${s.katilimId}`)} variant="outline" className="shrink-0">
                  Sonucu gör <ArrowRight className="w-4 h-4" />
                </VeliButon>
              ) : s.durum === 'BITTI' && !s.katilimId ? (
                <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                  <Lock className="w-3.5 h-3.5" /> Katılım yok
                </span>
              ) : null}
            </div>
          </VeliPanel>
        ))}
      </div>
    </section>
  );
}
