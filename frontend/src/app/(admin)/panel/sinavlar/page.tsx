'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Edit, Trash2, Eye, CheckCircle, Clock, Loader2, UserPlus, Search, Timer, FileText, Users, Radio } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/store/toast.store';
import { sinavTurEtiketi } from '@/lib/sinav-tur';
import { confirmAsk } from '@/store/confirm-dialog.store';
import { useAuthStore } from '@/store/auth.store';

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
  const rol = useAuthStore((s) => s.kullanici?.rol);
  const ogretmenMi = rol === 'TEACHER';
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
      (ogretmenMi ? s.baslik !== 'Soru Bankası (Grup)' : true) &&
      (s.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        s.grup?.ad?.toLowerCase().includes(aramaMetni.toLowerCase())),
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

  const kademeAtaMut = useMutation({
    mutationFn: () => adminApi.kpssKademeOtomatikAta(),
    onSuccess: (res) => {
      const yeni = res.data?.veri?.yeniAtama ?? 0;
      toast.basarili(
        yeni > 0 ? 'Kademe ataması tamamlandı' : 'Eksik atama yok',
        res.data?.mesaj || `${yeni} yeni atama`,
      );
      queryClient.invalidateQueries({ queryKey: ['admin-sinavlar'] });
    },
    onError: (err: unknown) => {
      const mesaj =
        (err as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj ||
        'Toplu atama yapılamadı.';
      toast.hata(mesaj);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sınav Yönetimi</h1>
          <p className="text-gray-500 mt-1">
            {ogretmenMi
              ? 'Açık sınavlara branşınızdaki soruları atayın; atamalar admin onayından sonra öğrenciye yansır.'
              : 'Sınavları oluşturun, soruları ve öğrenci erişimlerini yönetin.'}
          </p>
        </div>
        {!ogretmenMi && (
          <div className="flex items-center gap-2 self-start">
            <Link
              href="/panel/sinavlar/canli"
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"
            >
              <Radio className="w-4 h-4" />
              Canlı takip
            </Link>
            <Link href="/panel/sinavlar/yeni" className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Yeni Sınav
            </Link>
          </div>
        )}
      </div>

      {ogretmenMi && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sınav oluşturma, yayınlama ve öğrenci atama yönetici yetkisindedir. Sizin göreviniz kendi branş
          sıralamanıza göre soruları ilgili sınava eklemektir.
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Sınav veya grup adı ile ara..."
              className="input-field pl-9"
            />
          </div>
          {!ogretmenMi && (
            <button
              type="button"
              disabled={kademeAtaMut.isPending}
              onClick={async () => {
                const onay = await confirmAsk({
                  title: 'KPSS kademe ataması',
                  message:
                    'Yayındaki ücretsiz KPSS denemelerine, Lisans / Önlisans / Ortaöğretim öğrencilerini kademelerine göre toplu atar. Yeni kayıt olup kaçırılanlar da eklenir.',
                  onayMetni: 'Atamayı çalıştır',
                  variant: 'default',
                });
                if (onay) kademeAtaMut.mutate();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              {kademeAtaMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              Kademeye göre otomatik ata
            </button>
          )}
        </div>
        {!ogretmenMi && (
          <p className="mt-2 text-xs text-gray-500">
            Yeni KPSS kayıtları otomatik atanır. Bu buton atanamayan / eksik kalanları tamamlar; liste
            öğrenci sayılarına yansır.
          </p>
        )}
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
                  {!ogretmenMi && (
                    <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Öğrenciler</th>
                  )}
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
                    {!ogretmenMi && (
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
                    )}
                    <td className="px-6 py-4 text-center">
                      {ogretmenMi ? (
                        <span
                          className={`badge flex items-center gap-1.5 mx-auto font-bold
                            ${sinav.yayinlandi ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {sinav.yayinlandi ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {sinav.yayinlandi ? 'Yayında' : 'Taslak'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => yayinlaToggle.mutate({ id: sinav.id, yayinlandi: !sinav.yayinlandi })}
                          className={`badge flex items-center gap-1.5 mx-auto font-bold transition-all
                            ${sinav.yayinlandi ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {sinav.yayinlandi ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {sinav.yayinlandi ? 'Yayında' : 'Taslak'}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {!ogretmenMi && (
                          <>
                            <Link
                              href={`/panel/sinavlar/${sinav.id}/canli`}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Canlı katılım"
                            >
                              <Radio className="w-4 h-4" />
                            </Link>
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
                          </>
                        )}
                        <Link
                          href={`/panel/sinavlar/${sinav.id}/onizleme`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Önizle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {!ogretmenMi && (
                          <button
                            type="button"
                            onClick={() => setAtamaSinav({ id: sinav.id, baslik: sinav.baslik })}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Öğrenci Ata"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          href={`/panel/sinavlar/${sinav.id}/duzenle`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title={ogretmenMi ? 'Soru ata' : 'Düzenle'}
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {!ogretmenMi && (
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
                        )}
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
