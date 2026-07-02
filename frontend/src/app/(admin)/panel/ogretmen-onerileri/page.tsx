'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  CheckCircle2,
  Clock,
  Eye,
  ImageIcon,
  Lightbulb,
  Loader2,
  MessageSquare,
  Search,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast.store';
import { AuthGorsel } from '@/components/admin/AuthGorsel';

type OneriDurum = 'YENI' | 'OKUNDU' | 'INCELENIYOR' | 'TAMAMLANDI' | 'KAPANDI';

type OneriGorsel = {
  id: string;
  url: string;
  dosyaAdi: string;
  mimeType: string;
  boyut: number;
};

type OgretmenOnerisi = {
  id: string;
  baslik: string | null;
  mesaj: string;
  sayfaYolu: string | null;
  gorseller: OneriGorsel[];
  durum: OneriDurum;
  adminNotu: string | null;
  olusturuldu: string;
  guncellendi: string;
  ogretmenAdi: string;
  kullanici: {
    id: string;
    email: string;
    rol: string;
    adminProfil: { ad: string; soyad: string; brans: string | null } | null;
  };
};

function durumRozet(d: OneriDurum) {
  if (d === 'YENI') return { t: 'Yeni', c: 'bg-amber-50 text-amber-700 border-amber-100', i: Clock };
  if (d === 'OKUNDU') return { t: 'Okundu', c: 'bg-indigo-50 text-indigo-700 border-indigo-100', i: Eye };
  if (d === 'INCELENIYOR') return { t: 'İnceleniyor', c: 'bg-sky-50 text-sky-700 border-sky-100', i: MessageSquare };
  if (d === 'TAMAMLANDI') return { t: 'Tamamlandı', c: 'bg-emerald-50 text-emerald-700 border-emerald-100', i: CheckCircle2 };
  return { t: 'Kapandı', c: 'bg-gray-50 text-gray-600 border-gray-100', i: XCircle };
}

export default function AdminOgretmenOnerileriSayfasi() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [durum, setDurum] = useState('');
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [adminNotu, setAdminNotu] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ogretmen-onerileri', 'admin', q, durum],
    queryFn: () =>
      api.get('/ogretmen-onerileri/admin', { params: { q: q.trim() || undefined, durum: durum || undefined } }),
  });
  const oneriler: OgretmenOnerisi[] = data?.data?.veri || [];

  const { data: detayData, isLoading: detayYukleniyor } = useQuery({
    queryKey: ['ogretmen-onerisi', seciliId],
    queryFn: () => api.get(`/ogretmen-onerileri/admin/${seciliId}`),
    enabled: !!seciliId,
  });
  const detay = detayData?.data?.veri as OgretmenOnerisi | undefined;

  useEffect(() => {
    if (detay) setAdminNotu(detay.adminNotu || '');
  }, [detay]);

  useEffect(() => {
    if (!seciliId || !detay || detay.durum !== 'YENI') return;
    api.patch(`/ogretmen-onerileri/admin/${seciliId}`, { durum: 'OKUNDU' }).then(() => {
      qc.invalidateQueries({ queryKey: ['ogretmen-onerileri'] });
      qc.invalidateQueries({ queryKey: ['admin-panel-sayaclari'] });
    });
  }, [seciliId, detay?.durum, detay, qc]);

  const guncelleMut = useMutation({
    mutationFn: (payload: { durum?: OneriDurum; adminNotu?: string }) =>
      api.patch(`/ogretmen-onerileri/admin/${seciliId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ogretmen-onerileri'] });
      qc.invalidateQueries({ queryKey: ['ogretmen-onerisi', seciliId] });
      qc.invalidateQueries({ queryKey: ['admin-panel-sayaclari'] });
      toast.basarili('Kayıt güncellendi');
    },
    onError: (e: unknown) => {
      const mesaj = (e as { response?: { data?: { mesaj?: string } } })?.response?.data?.mesaj;
      toast.hata(mesaj || 'Güncellenemedi');
    },
  });

  const secili = useMemo(() => oneriler.find((o) => o.id === seciliId) || detay || null, [oneriler, seciliId, detay]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-indigo-600">
          <Lightbulb className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Öğretmen Geri Bildirimi</span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-gray-900">Öğretmen Önerileri</h1>
        <p className="mt-1 text-sm text-gray-500">
          Öğretmenlerin panel üzerinden ilettiği yazılım önerileri ve istekleri.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card overflow-hidden !p-0">
          <div className="space-y-2 border-b border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Öğretmen, konu, mesaj ara…"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={durum}
              onChange={(e) => setDurum(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">Tümü</option>
              <option value="YENI">Yeni</option>
              <option value="OKUNDU">Okundu</option>
              <option value="INCELENIYOR">İnceleniyor</option>
              <option value="TAMAMLANDI">Tamamlandı</option>
              <option value="KAPANDI">Kapandı</option>
            </select>
          </div>

          <div className="max-h-[640px] divide-y divide-gray-100 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : oneriler.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-400">Henüz öneri yok.</p>
            ) : (
              oneriler.map((o) => {
                const rozet = durumRozet(o.durum);
                const Ikon = rozet.i;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSeciliId(o.id)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-indigo-50/40 ${
                      seciliId === o.id ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-100' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {o.baslik || o.mesaj.slice(0, 60)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{o.ogretmenAdi}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${rozet.c}`}>
                        <Ikon className="h-3 w-3" />
                        {rozet.t}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
                      <span>{format(new Date(o.olusturuldu), 'd MMM yyyy HH:mm', { locale: tr })}</span>
                      {o.gorseller?.length ? (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {o.gorseller.length}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="card lg:col-span-2 !p-0">
          {!secili ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center text-gray-400">
              <Lightbulb className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm">Detay görmek için soldan bir öneri seçin.</p>
            </div>
          ) : detayYukleniyor && !detay ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{secili.baslik || 'Öneri'}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">{secili.ogretmenAdi}</span>
                      {' · '}
                      {secili.kullanici?.email}
                      {secili.kullanici?.adminProfil?.brans ? ` · ${secili.kullanici.adminProfil.brans}` : ''}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${durumRozet(secili.durum).c}`}>
                    {durumRozet(secili.durum).t}
                  </span>
                </div>

                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {secili.mesaj}
                </div>

                {secili.sayfaYolu ? (
                  <p className="text-xs text-gray-500">
                    Gönderildiği sayfa: <code className="rounded bg-gray-100 px-1.5 py-0.5">{secili.sayfaYolu}</code>
                  </p>
                ) : null}

                {secili.gorseller?.length ? (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Ek görseller</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {secili.gorseller.map((g) => (
                        <a
                          key={g.id}
                          href={g.url.startsWith('http') ? g.url : undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                          onClick={(e) => {
                            if (!g.url.startsWith('http')) e.preventDefault();
                          }}
                        >
                          <AuthGorsel src={g.url} alt={g.dosyaAdi} className="aspect-video w-full object-cover" />
                          <p className="truncate px-2 py-1 text-[10px] text-gray-500">{g.dosyaAdi}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                <p className="text-[11px] text-gray-400">
                  {format(new Date(secili.olusturuldu), "d MMMM yyyy 'saat' HH:mm", { locale: tr })}
                </p>
              </div>

              <div className="space-y-4 bg-gray-50/70 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                    Durum
                  </label>
                  <select
                    value={secili.durum}
                    onChange={(e) => guncelleMut.mutate({ durum: e.target.value as OneriDurum })}
                    disabled={guncelleMut.isPending}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 sm:max-w-xs"
                  >
                    <option value="YENI">Yeni</option>
                    <option value="OKUNDU">Okundu</option>
                    <option value="INCELENIYOR">İnceleniyor</option>
                    <option value="TAMAMLANDI">Tamamlandı</option>
                    <option value="KAPANDI">Kapandı</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                    Yönetici notu
                  </label>
                  <textarea
                    value={adminNotu}
                    onChange={(e) => setAdminNotu(e.target.value)}
                    rows={3}
                    placeholder="İç not, yapılacaklar, yanıt özeti…"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => guncelleMut.mutate({ adminNotu })}
                    disabled={guncelleMut.isPending}
                    className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Notu kaydet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
