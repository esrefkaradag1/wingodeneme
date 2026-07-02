'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Bell, Loader2, Search, Filter, CheckCircle2, Megaphone, ArrowRight } from 'lucide-react';
import { toast } from '@/store/toast.store';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Bildirim {
  id: string;
  baslik: string;
  mesaj: string;
  tur: string;
  okundu: boolean;
  olusturuldu: string;
}

export default function BildirimlerSayfasi() {
  const qc = useQueryClient();
  const [arama, setArama] = useState('');
  const [tur, setTur] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['bildirimler', 'benim'],
    queryFn: () => api.get('/bildirimler'),
  });

  const bildirimler: Bildirim[] = data?.data?.veri?.bildirimler || data?.data?.veri || [];

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    return bildirimler.filter((b) => {
      if (tur && b.tur !== tur) return false;
      if (!q) return true;
      return (b.baslik || '').toLowerCase().includes(q) || (b.mesaj || '').toLowerCase().includes(q);
    });
  }, [bildirimler, arama, tur]);

  const tumunuOkuMut = useMutation({
    mutationFn: () => api.patch('/bildirimler/tumunu-oku', {}),
    onSuccess: () => {
      toast.basarili('Tüm bildirimler okundu.');
      qc.invalidateQueries({ queryKey: ['bildirimler', 'benim'] });
    },
    onError: () => toast.hata('İşlem başarısız.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Bildirimler</h1>
          <p className="text-sm text-gray-500 mt-1">Admin hesabınıza düşen sistem, duyuru ve destek bildirimleri.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/panel/duyurular"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black inline-flex items-center gap-2"
          >
            <Megaphone className="w-4 h-4" /> Duyuru Gönder <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => tumunuOkuMut.mutate()}
            disabled={tumunuOkuMut.isPending}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 text-sm font-black inline-flex items-center gap-2 disabled:opacity-50"
          >
            {tumunuOkuMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Tümünü oku
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Bildirimlerde ara..."
                className="input-field pl-10 h-10 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={tur} onChange={(e) => setTur(e.target.value)} className="bg-transparent outline-none text-sm">
                <option value="">Tümü</option>
                <option value="duyuru">duyuru</option>
                <option value="destek">destek</option>
                <option value="hos_geldiniz">hos_geldiniz</option>
              </select>
            </div>
          </div>

          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Başlık / Mesaj</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tür</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filtreli.length > 0 ? (
                filtreli.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      {b.okundu ? (
                        <span className="w-2 h-2 rounded-full bg-gray-300 block" title="Okundu" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 block animate-pulse" title="Yeni" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{b.baslik}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{b.mesaj}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge bg-indigo-50 text-indigo-600 text-[10px]">{b.tur}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(b.olusturuldu), 'd MMM HH:mm', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400"> </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Henüz gönderilmiş bir bildirim bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
