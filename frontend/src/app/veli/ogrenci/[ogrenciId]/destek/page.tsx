'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LifeBuoy, Loader2, Plus } from 'lucide-react';
import { veliApi } from '@/lib/api';
import { VeliOgrenciBaslik } from '@/components/veli/VeliOgrenciShell';
import { VeliSayfa, VeliPanel, VeliBadge, VeliBosDurum, VeliYukleniyor } from '@/components/veli/VeliUI';
import { toast } from '@/store/toast.store';

const DURUM: Record<string, { etiket: string; ton: 'emerald' | 'amber' | 'sky' | 'gray' }> = {
  ACIK: { etiket: 'Açık', ton: 'sky' },
  BEKLEMEDE: { etiket: 'Beklemede', ton: 'amber' },
  COZULDU: { etiket: 'Çözüldü', ton: 'emerald' },
  KAPANDI: { etiket: 'Kapandı', ton: 'gray' },
};

export default function VeliOgrenciDestekPage() {
  const params = useParams();
  const ogrenciId = params?.ogrenciId as string;
  const qc = useQueryClient();
  const [formAcik, setFormAcik] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [mesaj, setMesaj] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['veli-ogrenci-destek', ogrenciId],
    queryFn: async () => (await veliApi.ogrenciDestek(ogrenciId)).data.veri as Array<{
      id: string; baslik: string; durum: string; olusturuldu: string; sonMesajAt: string;
    }>,
    enabled: !!ogrenciId,
  });

  const olustur = useMutation({
    mutationFn: () => veliApi.ogrenciDestekOlustur(ogrenciId, { baslik: baslik.trim(), mesaj: mesaj.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['veli-ogrenci-destek', ogrenciId] });
      setBaslik('');
      setMesaj('');
      setFormAcik(false);
      toast.basarili('Destek talebi oluşturuldu');
    },
    onError: () => toast.hata('Talep oluşturulamadı'),
  });

  if (isLoading) return <VeliYukleniyor />;

  const talepler = data ?? [];

  return (
    <VeliSayfa>
      <VeliOgrenciBaslik altBaslik="Destek Talepleri" />

      <div className="flex justify-end -mt-2 mb-2">
        <button
          type="button"
          onClick={() => setFormAcik((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" />
          Yeni talep
        </button>
      </div>

      {formAcik ? (
        <VeliPanel className="!p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
            <input
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              className="input-field w-full"
              placeholder="Örn: Sınav sonucu hakkında"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
            <textarea
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              rows={4}
              className="input-field w-full resize-none"
              placeholder="Talebinizi kısaca açıklayın…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={olustur.isPending || baslik.trim().length < 3 || mesaj.trim().length < 2}
              onClick={() => olustur.mutate()}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {olustur.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Gönder
            </button>
            <button
              type="button"
              onClick={() => setFormAcik(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              İptal
            </button>
          </div>
        </VeliPanel>
      ) : null}

      {talepler.length === 0 ? (
        <VeliBosDurum ikon={LifeBuoy} baslik="Talep yok" aciklama="Henüz açılmış destek talebi bulunmuyor." />
      ) : (
        <div className="space-y-3">
          {talepler.map((t) => {
            const d = DURUM[t.durum] ?? { etiket: t.durum, ton: 'gray' as const };
            return (
              <VeliPanel key={t.id} className="!p-4 sm:!p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 ring-1 ring-teal-100">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-gray-900">{t.baslik}</p>
                      <VeliBadge ton={d.ton}>{d.etiket}</VeliBadge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Oluşturuldu: {format(new Date(t.olusturuldu), 'd MMM yyyy', { locale: tr })}
                      {' · Son mesaj: '}
                      {format(new Date(t.sonMesajAt), 'd MMM yyyy', { locale: tr })}
                    </p>
                  </div>
                </div>
              </VeliPanel>
            );
          })}
        </div>
      )}
    </VeliSayfa>
  );
}
