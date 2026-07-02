'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Circle, Map } from 'lucide-react';
import { veliApi } from '@/lib/api';
import { VeliOgrenciBaslik } from '@/components/veli/VeliOgrenciShell';
import { VeliSayfa, VeliPanel, VeliBadge, VeliBosDurum, VeliYukleniyor } from '@/components/veli/VeliUI';

interface StudyGorev {
  id: string; baslik: string; ders: string; konu: string;
  sureDakika: number; tamamlandi: boolean; gun: number;
}

interface StudyPlan {
  id: string; baslik: string;
  hedefler: { kisa: string; orta: string; uzun: string };
  gorevler: StudyGorev[];
}

export default function VeliOgrenciStudyPlanPage() {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['veli-ogrenci-study-plan', ogrenciId],
    queryFn: async () => (await veliApi.ogrenciStudyPlanlar(ogrenciId)).data.veri as StudyPlan[],
    enabled: !!ogrenciId,
  });

  if (isLoading) return <VeliYukleniyor mesaj="Plan yükleniyor…" />;

  const plan = data?.[0];
  if (!plan) {
    return (
      <VeliSayfa>
        <VeliOgrenciBaslik altBaslik="Çalışma Planı" />
        <VeliBosDurum ikon={Map} baslik="Aktif plan yok" aciklama="Öğrencinin henüz oluşturulmuş bir çalışma planı bulunmuyor." />
      </VeliSayfa>
    );
  }

  const gorevler = plan.gorevler ?? [];
  const tamamlanan = gorevler.filter((g) => g.tamamlandi).length;
  const yuzde = gorevler.length > 0 ? Math.round((tamamlanan / gorevler.length) * 100) : 0;

  const gunluk = gorevler.reduce<Record<number, StudyGorev[]>>((acc, g) => {
    if (!acc[g.gun]) acc[g.gun] = [];
    acc[g.gun]!.push(g);
    return acc;
  }, {});
  const gunler = Object.keys(gunluk).map(Number).sort((a, b) => a - b);

  return (
    <VeliSayfa>
      <VeliOgrenciBaslik altBaslik="Çalışma Planı" />

      <VeliPanel className="border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-fuchsia-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <VeliBadge ton="violet">Aktif plan</VeliBadge>
            <h2 className="text-lg font-bold text-gray-900 mt-2">{plan.baslik}</h2>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-violet-700">%{yuzde}</p>
            <p className="text-xs text-gray-500">{tamamlanan}/{gorevler.length} görev</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all" style={{ width: `${yuzde}%` }} />
        </div>
        {plan.hedefler && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3 text-xs text-gray-600">
            {plan.hedefler.kisa && <p><span className="font-bold text-violet-700">Kısa:</span> {plan.hedefler.kisa}</p>}
            {plan.hedefler.orta && <p><span className="font-bold text-violet-700">Orta:</span> {plan.hedefler.orta}</p>}
            {plan.hedefler.uzun && <p><span className="font-bold text-violet-700">Uzun:</span> {plan.hedefler.uzun}</p>}
          </div>
        )}
      </VeliPanel>

      <div className="space-y-4">
        {gunler.map((gun) => (
          <VeliPanel key={gun} className="!p-4 sm:!p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black">{gun}</span>
              Gün {gun}
            </h3>
            <ul className="space-y-2">
              {(gunluk[gun] ?? []).map((g) => (
                <li key={g.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100/80">
                  {g.tamamlandi ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{g.ders} — {g.baslik}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{g.konu} · {g.sureDakika} dk</p>
                  </div>
                </li>
              ))}
            </ul>
          </VeliPanel>
        ))}
      </div>
    </VeliSayfa>
  );
}
