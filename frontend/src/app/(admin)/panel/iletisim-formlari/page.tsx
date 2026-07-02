'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  XCircle,
} from 'lucide-react';

type FormDurum = 'YENI' | 'OKUNDU' | 'YANITLANDI' | 'KAPANDI';

type IletisimFormu = {
  id: string;
  adSoyad: string;
  eposta: string;
  konu: string;
  mesaj: string;
  durum: FormDurum;
  adminNotu: string | null;
  olusturuldu: string;
  guncellendi: string;
};

function durumRozet(d: FormDurum) {
  if (d === 'YENI') return { t: 'Yeni', c: 'bg-amber-50 text-amber-700 border-amber-100', i: Clock };
  if (d === 'OKUNDU') return { t: 'Okundu', c: 'bg-indigo-50 text-indigo-700 border-indigo-100', i: MessageSquare };
  if (d === 'YANITLANDI') return { t: 'Yanıtlandı', c: 'bg-emerald-50 text-emerald-700 border-emerald-100', i: CheckCircle2 };
  return { t: 'Kapandı', c: 'bg-gray-50 text-gray-600 border-gray-100', i: XCircle };
}

export default function AdminIletisimFormlariSayfasi() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [durum, setDurum] = useState('');
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [adminNotu, setAdminNotu] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['iletisim-formlari', 'admin', q, durum],
    queryFn: () =>
      api.get('/iletisim/admin', { params: { q: q.trim() || undefined, durum: durum || undefined } }),
  });
  const formlar: IletisimFormu[] = data?.data?.veri || [];

  const { data: detayData, isLoading: detayYukleniyor } = useQuery({
    queryKey: ['iletisim-formu', seciliId],
    queryFn: () => api.get(`/iletisim/admin/${seciliId}`),
    enabled: !!seciliId,
  });
  const detay = detayData?.data?.veri as IletisimFormu | undefined;

  useEffect(() => {
    if (detay) setAdminNotu(detay.adminNotu || '');
  }, [detay]);

  useEffect(() => {
    if (!seciliId || !detay || detay.durum !== 'YENI') return;
    api.patch(`/iletisim/admin/${seciliId}`, { durum: 'OKUNDU' }).then(() => {
      qc.invalidateQueries({ queryKey: ['iletisim-formlari'] });
      qc.invalidateQueries({ queryKey: ['admin-panel-sayaclari'] });
    });
  }, [seciliId, detay?.durum, detay, qc]);

  const guncelleMut = useMutation({
    mutationFn: (payload: { durum?: FormDurum; adminNotu?: string }) =>
      api.patch(`/iletisim/admin/${seciliId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iletisim-formlari'] });
      qc.invalidateQueries({ queryKey: ['iletisim-formu', seciliId] });
      qc.invalidateQueries({ queryKey: ['admin-panel-sayaclari'] });
      toast.basarili('Kayıt güncellendi');
    },
    onError: (e: unknown) => {
      const mesaj = (e as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj;
      toast.hata(mesaj || 'Güncellenemedi');
    },
  });

  const secili = useMemo(() => formlar.find((f) => f.id === seciliId) || detay || null, [formlar, seciliId, detay]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">İletişim Formları</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sitedeki iletişim sayfasından gelen talepleri buradan yönetin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ad, e-posta, konu ara…"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <select
              value={durum}
              onChange={(e) => setDurum(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500 text-sm bg-white"
            >
              <option value="">Tümü</option>
              <option value="YENI">Yeni</option>
              <option value="OKUNDU">Okundu</option>
              <option value="YANITLANDI">Yanıtlandı</option>
              <option value="KAPANDI">Kapandı</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
            </div>
          ) : formlar.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Henüz iletişim formu yok.</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {formlar.map((f) => {
                const r = durumRozet(f.durum);
                const Ikon = r.i;
                const aktif = f.id === seciliId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSeciliId(f.id)}
                    className={`w-full text-left px-4 py-4 hover:bg-indigo-50/40 ${aktif ? 'bg-indigo-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{f.konu}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {f.adSoyad} · {f.eposta}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {format(new Date(f.olusturuldu), 'd MMM yyyy HH:mm', { locale: tr })}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black border ${r.c}`}
                      >
                        <Ikon className="w-3.5 h-3.5" /> {r.t}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card min-h-[420px]">
          {!seciliId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <Mail className="w-10 h-10 text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">Bir talep seçin</p>
              <p className="text-sm mt-1">Soldan iletişim formu kaydını açarak detayları görün.</p>
            </div>
          ) : detayYukleniyor && !detay ? (
            <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
            </div>
          ) : secili ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-gray-900">{secili.konu}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {secili.adSoyad} ·{' '}
                    <a href={`mailto:${secili.eposta}`} className="text-indigo-600 hover:underline">
                      {secili.eposta}
                    </a>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(secili.olusturuldu), 'd MMMM yyyy HH:mm', { locale: tr })}
                  </p>
                </div>
                <select
                  value={secili.durum}
                  onChange={(e) => guncelleMut.mutate({ durum: e.target.value as FormDurum })}
                  disabled={guncelleMut.isPending}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                >
                  <option value="YENI">Yeni</option>
                  <option value="OKUNDU">Okundu</option>
                  <option value="YANITLANDI">Yanıtlandı</option>
                  <option value="KAPANDI">Kapandı</option>
                </select>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Mesaj</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{secili.mesaj}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Admin notu
                </label>
                <textarea
                  value={adminNotu}
                  onChange={(e) => setAdminNotu(e.target.value)}
                  rows={3}
                  placeholder="İç not veya yapılan işlem…"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => guncelleMut.mutate({ adminNotu })}
                  disabled={guncelleMut.isPending}
                  className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-60"
                >
                  Notu kaydet
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <a
                  href={`mailto:${secili.eposta}?subject=${encodeURIComponent(`Re: ${secili.konu}`)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  <Mail className="w-4 h-4" /> E-posta ile yanıtla
                </a>
                <button
                  type="button"
                  onClick={() => guncelleMut.mutate({ durum: 'YANITLANDI' })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500"
                >
                  <CheckCircle2 className="w-4 h-4" /> Yanıtlandı işaretle
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
