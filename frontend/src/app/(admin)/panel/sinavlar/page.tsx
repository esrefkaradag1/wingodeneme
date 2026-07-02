'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Edit, Trash2, Eye, CheckCircle, Clock, Loader2, UserPlus, Search, Timer, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/store/toast.store';
import { sinavTurEtiketi } from '@/lib/sinav-tur';
import { confirmAsk } from '@/store/confirm-dialog.store';

const OgrenciAtamaModal = dynamic(() => import('@/components/admin/sinavlar/OgrenciAtamaModal'), {
  ssr: false,
});

const AtananOgrencilerModal = dynamic(() => import('@/components/admin/sinavlar/AtananOgrencilerModal'), {
  ssr: false,
});

type SinavListesiOgesi = {
  id: string;
  baslik: string;
  tur: string;
  yayinlandi: boolean;
  baslangicZamani: string;
  grup?: { ad?: string };
  _count?: { sorular?: number; ogrenciAtamalari?: number };
};

export default function SinavlarSayfasi() {
  const queryClient = useQueryClient();
  const [aramaMetni, setAramaMetni] = useState('');
  const [atamaSinav, setAtamaSinav] = useState<{ id: string; baslik: string } | null>(null);
  const [atananOgrencilerSinav, setAtananOgrencilerSinav] = useState<{ id: string; baslik: string } | null>(null);

  const { data: sinavlarRes, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin-sinavlar'],
    queryFn: () => adminApi.sinavlar(),
  });

  const sinavlar = (sinavlarRes?.data?.veri || []) as SinavListesiOgesi[];

  const filtreliSinavlar = sinavlar.filter(
    (s) =>
      s.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      s.grup?.ad?.toLowerCase().includes(aramaMetni.toLowerCase()),
  );

  const yayinlaToggle = useMutation({
    mutationFn: ({ id, yayinlandi }: { id: string; yayinlandi: boolean }) =>
      adminApi.sinavGuncelle(id, { yayinlandi }),
    onSuccess: () => {
      toast.basarili('Durum güncellendi');
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
    },
  });

  const sinavSilMut = useMutation({
    mutationFn: (id: string) => adminApi.sinavSil(id),
    onSuccess: () => {
      toast.basarili('Sınav silindi');
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sınav Yönetimi</h1>
          <p className="text-gray-500 mt-1">Sınavları oluşturun, soruları ve öğrenci erişimlerini yönetin.</p>
        </div>
        <Link href="/panel/sinavlar/yeni" className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-5 h-5" />
          Yeni Sınav
        </Link>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            placeholder="Sınav veya grup adı ile ara..."
            className="input-field pl-9"
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden relative">
        {isLoading && !isPlaceholderData ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Sınav</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tür</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tarih</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Sorular</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Öğrenciler</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtreliSinavlar.map((sinav) => {
                  const atamaAdet = sinav._count?.ogrenciAtamalari ?? 0;

                  return (
                  <tr key={sinav.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-sm">{sinav.baslik}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{sinav.grup?.ad}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge bg-indigo-50 text-indigo-700 font-bold">{sinavTurEtiketi(sinav.tur)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {format(new Date(sinav.baslangicZamani), 'd MMM HH:mm', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                      {sinav._count?.sorular || 0}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setAtananOgrencilerSinav({ id: sinav.id, baslik: sinav.baslik })}
                        className="text-sm font-bold text-indigo-700 hover:text-indigo-900 hover:underline"
                        title="Atanan öğrencileri görüntüle"
                      >
                        {atamaAdet} öğrenci
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => yayinlaToggle.mutate({ id: sinav.id, yayinlandi: !sinav.yayinlandi })}
                        className={`badge flex items-center gap-1.5 mx-auto font-bold transition-all
                          ${sinav.yayinlandi ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {sinav.yayinlandi ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {sinav.yayinlandi ? 'Yayında' : 'Taslak'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/panel/sinavlar/${sinav.id}/sonuclar`}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Sonuçlar & Karneler"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/panel/sinavlar/${sinav.id}/sure-analizi`}
                          className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                          title="Süre analizi"
                        >
                          <Timer className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/panel/sinavlar/${sinav.id}/onizleme`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Önizle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setAtamaSinav({ id: sinav.id, baslik: sinav.baslik })}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Öğrenci Ata"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/panel/sinavlar/${sinav.id}/duzenle`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              await confirmAsk({
                                title: 'Sınavı Sil',
                                message: 'Bu sınavı silmek istediğinize emin misiniz?',
                                variant: 'destructive',
                              })
                            ) {
                              sinavSilMut.mutate(sinav.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {atamaSinav && <OgrenciAtamaModal sinav={atamaSinav} onClose={() => setAtamaSinav(null)} />}
      {atananOgrencilerSinav && (
        <AtananOgrencilerModal
          sinav={atananOgrencilerSinav}
          onClose={() => setAtananOgrencilerSinav(null)}
        />
      )}
    </div>
  );
}
