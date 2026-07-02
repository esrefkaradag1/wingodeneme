'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Loader2, Bell, Check } from 'lucide-react';

type DuyuruAlici = {
  id: string;
  okundu: boolean;
  olusturuldu: string;
  duyuru: { id: string; baslik: string; mesaj: string; olusturuldu: string };
};

export default function DuyurularSayfasi() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['duyurular', 'benim'],
    queryFn: () => api.get('/duyurular/benim'),
  });
  const duyurular: DuyuruAlici[] = data?.data?.veri || [];

  const okuMut = useMutation({
    mutationFn: (duyuruId: string) => api.patch(`/duyurular/benim/${duyuruId}/oku`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duyurular', 'benim'] }),
  });

  return (
    <div className="space-y-6 pb-12">
      <section className="card !p-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" /> Duyurular
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sistem ve yönetici duyuruları burada görünür.</p>
        </div>
      </section>

      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-black text-gray-600 uppercase tracking-wider">
            Gelen kutusu
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
          </div>
        ) : duyurular.length === 0 ? (
          <div className="p-8 text-sm text-gray-500">Henüz duyuru yok.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {duyurular.map((a) => (
              <div key={a.id} className="px-5 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{a.duyuru.baslik}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(a.duyuru.olusturuldu).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  {!a.okundu && (
                    <button
                      onClick={() => okuMut.mutate(a.duyuru.id)}
                      disabled={okuMut.isPending}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black inline-flex items-center gap-1.5"
                    >
                      {okuMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Okundu
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap leading-relaxed">
                  {a.duyuru.mesaj}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

